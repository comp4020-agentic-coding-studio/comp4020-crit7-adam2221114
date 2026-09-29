# Process overview

## What I built

An ANU Semester Planner: a student enters a Student ID, gets an existing or
freshly-created semester plan backed by SQLite, and can add/remove courses
from a small representative catalogue while seeing live per-semester unit
totals. It currently models the 2026 Master of Computing (Software
Development), including real prerequisite/incompatibility rules and a
lightweight "previously completed" concept, sourced from ANU's own Programs
& Courses pages rather than invented.

## How I got here

### Building the MVP slice by slice

Smallest vertical slices CLAUDE.md asks for: schema, then a plain function,
then the API route, then a spec test against the real built server and a
throwaway SQLite file — the same guarantee a page reload relies on.

- Student ID → get-or-create plan:
  [`d22c547...ed47b0f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/compare/d22c547...ed47b0f)
- Planned courses (add/remove/persist/duplicate-prevent):
  [`120713b...882053c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/compare/120713b...882053c)
- Derived semester unit totals:
  [`d17eac5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/d17eac5),
  tested in [`bf975f8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/bf975f8)
- Retired the starter guestbook once the planner had its own routes:
  [`7b7e45b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/7b7e45b)
- Student ID entry + plan page, plain POST + redirect + flash, no
  client-side JS:
  [`8ad7a37`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/8ad7a37),
  [`a7accd3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/a7accd3)
- First pass at prerequisites (schema, validation, UI, tests):
  [`4c20996...993ccd8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/compare/4c20996...993ccd8)

`pnpm check` green at each step before committing.

### The undergraduate-to-postgraduate pivot

The first catalogue was plausible-looking but partly invented undergraduate
COMP1xxx courses. CLAUDE.md asks for "representative" data, but
representative still means real, so I replaced it with a genuinely sourced
catalogue (Master of Computing 7706XMCOMP, Software Development, 2026)
rather than keep polishing invented data.

Sourcing it directly surfaced a gotcha: ANU's aggregated *program
requirements* page conflated COMP7710 ("Structured Programming") with the
actual COMP7710 (**Programming Fundamentals**) — Structured Programming is
really COMP6710, a different, incompatible course. Cross-checking every
course against its own page instead caught this before it hit the seed
data; COMP6710 was dropped.

Modeled real prerequisites with a `groupId` column — same group is OR,
distinct groups are AND'd — with verbatim requisite text kept in
`requisiteText` even where a rule can't be enforced (e.g. COMP8280/ENGN8100
require program enrolment, not a course). Where an AND-group's only
alternatives sit outside the catalogue (COMP8410's second group), it's
enforced as informational-only rather than making the course permanently
unaddable. COMP6442 was similarly relaxed to enforce only its COMP7710
group
([`daf7756`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/daf7756)).

Added a lightweight "previously completed" flag — some prerequisite courses
here are Semester-2-only, so an earlier-semester requirement can't always
be satisfied by in-plan sequencing alone. Same-semester planning doesn't
count; only strictly-earlier or previously-completed does.

- [`54acd19`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/54acd19) —
  new seed data + prerequisite/previously-completed logic
- [`925a352`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/925a352) —
  mark/unmark API routes
- [`8e0391c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/8e0391c) —
  UI: previously-completed section, requisite text, prototype disclaimer
- [`e85d303`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/e85d303) —
  rewrote tests coupled to the old catalogue's ordering/units

Self-review caught two bugs in the new spec before it ran for real (a
"simple prerequisite" course that itself had unsatisfied prerequisites; an
OR-group test that never exercised the success path), then hand-verified
the whole flow against the built server.

### Expanding the catalogue, Computer Science only

> 现在加入更多的课程，但只限于计算机专业，因为现在只是demo
> ("add more courses, Computer Science only — still just a demo")

Real electives here include non-COMP subjects; left out anyway, to keep one
subject area. That collided with my own cap: CLAUDE.md and
`spec/catalogue.test.ts` capped the catalogue at 8–12, already at 10.

> 提高上限，加更多门 ("raise the cap, add more courses")

Cap raised to 8–18, dated as a changed rule, not rewritten history. Five
real COMP courses added, each checked against its own 2026 course page:
COMP6320, COMP6262, COMP8712, COMP4130, COMP6670. Rejected: COMP6800/COMP6034
(need Master of Computing *Advanced*), COMP4300 (not confirmed until 2027).

COMP6320 is the first course with both AND-groups enforced (COMP7710,
COMP6262). Verified by hand: rejected with neither, rejected with only
COMP7710, succeeded once COMP6262 joined. Landed in
[`830b9f2`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/830b9f2),
`pnpm check` green (60/60).

## State-driven course cards

Cards always showed an enabled Add button regardless of prerequisites,
warning-styled if unmet — the student had to click to find out if it would
work.

> Redesign the cards to be state-driven. [...] If COMP7710 is planned in
> Semester 1: COMP6442 must NOT be considered satisfied for Semester 1, but
> Semester 2 should pass. [...] reuse the existing logic rather than
> duplicating it in the UI.

Each course/semester now derives `available`/`blocked`/`not-offered` first,
calling the same `missingPrerequisites` function `addPlannedCourse` already
enforces — matching groups by content, never re-deriving the logic. A
blocked semester names the missing course, suggests moving it earlier, or
offers "Mark previously completed" inline. Only `available` gets a real Add
button; "Mark previously completed" is now a small secondary link.

Verified the three scenarios by hand: previously-completed → available both
semesters; planned Semester 1 → blocked Sem 1, available Sem 2; planned
Semester 2 → blocked both. Landed in
[`24ce455`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/24ce455),
`pnpm check` green (60/60).

## Deployment

`README.md` was still the starter's template text; wrote the real account
before shipping rather than leave a placeholder live on the deployed URL.

Deployed with `flyctl deploy --remote-only --ha=false -a
comp4020-crit7-adam2221114` — the app's existing `v1` release was the
unmodified starter, so this was the first real deploy.

Verified the persistence contract by hand against the live
`https://comp4020-crit7-adam2221114.fly.dev`: created a plan for a fresh
Student ID, added COMP6240 to Semester 1 (unit total → 6), re-entered the
same Student ID and got the same plan back, re-adding the same course was
rejected as a duplicate, removing it returned the total to 0, and the
empty/error/success UI states (`status-error`, `status-ok`) matched. All of
this held against the persistent Fly volume, not just the local build.

## Before you ship

`pnpm check:evidence` verifies that this comment is gone, that your citations
resolve to real commits, that a crit week's reflection entry is in
`reflections/`, and that your `CLAUDE.md` is there. It checks that your account
is traceable, not that it is good: that is the marker's call.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
