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

I worked in the smallest vertical slices CLAUDE.md asks for: schema first,
then a plain function wrapping it, then the API route that calls that
function, then a spec test hitting the route over HTTP against the real
built server and a throwaway SQLite file — the same guarantee a page reload
relies on, so persistence is actually being tested rather than assumed.

- Student ID → get-or-create plan:
  [`d22c547...ed47b0f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/compare/d22c547...ed47b0f)
- Planned courses (add/remove/persist/duplicate-prevent):
  [`120713b...882053c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/compare/120713b...882053c)
- Derived (not stored) semester unit totals:
  [`d17eac5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/d17eac5),
  tested in [`bf975f8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/bf975f8)
- Retiring the starter guestbook once the planner had its own routes and
  pages, rather than building the planner next to unused demo code:
  [`7b7e45b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/7b7e45b)
- Student ID entry page and the plan page itself, wired to the routes above
  with a plain POST + redirect + one-time flash message — no client-side JS
  needed for any mutation:
  [`8ad7a37`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/8ad7a37),
  [`a7accd3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/a7accd3)
- A first pass at prerequisites (schema, validation, UI, tests):
  [`4c20996...993ccd8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/compare/4c20996...993ccd8)

At each step: implement, run the relevant spec file, run `pnpm check`,
actually load the page (or curl the route) and look at it, then commit.
`pnpm check` stayed green throughout.

### The undergraduate-to-postgraduate pivot

The first course catalogue was a plausible-looking but partly invented set
of undergraduate COMP1xxx-style courses. Before extending prerequisites
further I asked myself whether that catalogue represented a real ANU
program, and it didn't cleanly — codes and requisite text were approximate,
not sourced. CLAUDE.md is explicit that the catalogue should be
"representative" demonstration data, but representative still means real: I
decided to replace it with a genuinely sourced catalogue rather than keep
polishing invented data, and confirmed the direction (program = Master of
Computing 7706XMCOMP, specialisation = Software Development, year = 2026)
before touching code, since CLAUDE.md also says not to expand scope without
asking.

Sourcing it directly from ANU surfaced a real gotcha worth recording: a
Programs & Courses *program requirements* page conflated two similarly-coded
courses, reporting COMP7710 as "Structured Programming (12 units)" when
COMP7710's own course page says **Programming Fundamentals**, and the
6-unit **Structured Programming** is actually COMP6710 — a different course,
incompatible with COMP7710. Cross-checking every course against its own
individual course page (not the aggregated program page) caught this before
it made it into the seed data, and COMP6710 was dropped from the catalogue
entirely since it's incompatible with the compulsory COMP7710.

Real ANU prerequisites don't reduce to a single chain: some courses need one
of several alternative courses (OR), others need multiple independent
requirements at once (AND), and some "requirements" are actually about
program enrolment rather than any other course at all (e.g. COMP8280 and
ENGN8100 require being enrolled in a specific ANU program, not having
completed a course — that's not something this schema can express, so it's
just not enforced). I modeled this with a `groupId` column on
`coursePrerequisites`: rows sharing a `groupId` are OR alternatives, and
distinct groups are AND'd together. Verbatim ANU requisite/incompatibility
text is stored separately (`requisiteText`) and shown in the UI even where
the underlying rule can't be enforced, so the prototype doesn't silently
misrepresent a course as prerequisite-free just because part of its real
requirement isn't expressible.

One consequence of using real data: COMP8410's real prerequisite is two AND
groups, and every alternative in its second group (COMP6710, COMP6730,
COMP7230) sits outside this catalogue. Enforcing an unsatisfiable group
would make COMP8410 permanently unaddable, which is worse than the honest
alternative — that group is treated as informational-only (visible in
`requisiteText`, not enforced), while its first group (COMP6240) is still
enforced normally.

COMP6442's real prerequisite has the same two-AND-group shape (COMP7710, and
separately MATH6005/COMP6260/MATH1005), but unlike COMP8410's second group
COMP6260 actually is in this catalogue, so my first pass enforced both
groups. On review this was relaxed to enforce only the COMP7710 group
([`daf7756`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/daf7756)):
the full text is still shown verbatim, but only the first group gates adding
the course, consistent with treating a second AND-group as informational
whenever the smallest useful enforcement is the first group alone.

I also added a lightweight "previously completed" concept, deliberately
short of a full academic-history feature: a course can be marked completed
against a plan, independent of any semester, and that satisfies a
prerequisite the same way planning it in an earlier semester would. This is
still useful in general — some prerequisite courses in this catalogue are
only offered in Semester 2, so a course that names one of them as an
earlier-semester requirement can't always be satisfied by in-plan
sequencing within a single modeled year, and previously-completed is the
fallback for that case. A course can't be
both planned and previously-completed at once (enforced with a clear error
in both directions), and same-semester prerequisites don't count — only
strictly-earlier semesters or previously-completed does.

Implementation landed as four commits, each independently green under
`pnpm check`:

- [`54acd19`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/54acd19)
  — replace the seed data and rewrite prerequisite/previously-completed
  logic in `db.ts`
- [`925a352`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/925a352)
  — API routes for marking/unmarking a course previously completed
- [`8e0391c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/8e0391c)
  — UI: previously-completed section, requisite-text column, and a
  disclaimer that this is a planning prototype, not an authoritative ANU
  enrolment system
- [`e85d303`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/e85d303)
  — rewrite prerequisite/total/planned-course tests, which had been
  quietly coupled to the old catalogue's ordering and uniform 6-unit
  courses

Before committing, I self-reviewed the new prerequisite spec and caught two
bugs in my own draft: it used a course with its own unsatisfied
prerequisites as a stand-in "simple prerequisite" in three basic tests
(which would have failed for the wrong reason), and an OR-group test never
actually exercised the success path. Both were rewritten before the tests
were run for real, and I then verified the whole flow again by hand against
the built server — adding a prerequisite-free course, being correctly
rejected for a missing prerequisite, marking a course previously completed,
hitting the mutual-exclusivity conflict in both directions, and reloading
the page to confirm all of that survived — rather than trusting the
automated suite alone for a feature this central to the brief.

### Expanding the catalogue, Computer Science only

After deployment, the direction was to add more courses to the catalogue, but
restricted to the Computer Science / School of Computing (COMP) subject
area, since this is explicitly a demo and not a real program plan. That
constraint mattered concretely: the Software Development specialisation's
real ANU elective list also includes non-COMP electives (INFS8004, INFS8205,
LAWS8445, MGMT7020, REGN8014), and those were deliberately left out even
though they're legitimate electives in the real program, to keep every
course in this catalogue from the same subject area.

Before adding anything, I checked whether "more courses" was even compatible
with the rules I'd already written for myself: both CLAUDE.md's `## Scope`
section and `spec/catalogue.test.ts` capped the catalogue at 8–12 courses,
and the existing catalogue already had 10. I asked whether to stay within
that cap (adding at most 2 more) or to widen it — the answer was to widen it
and add more, so I raised the cap to 8–18 in both `CLAUDE.md` (`## Scope` and
`## Course data`) and the test's upper-bound assertion, with a dated note in
CLAUDE.md's own progress-note section recording that the rule changed and
why, rather than rewriting the rule as if it had always said 18.

Five more real COMP courses were added, each checked against its own 2026
ANU Programs & Courses page rather than the aggregated program page (per the
COMP7710/COMP6710 conflation caught earlier in this process): COMP6320
(Artificial Intelligence), COMP6262 (Logic), COMP8712 (Compiler
Construction), COMP4130 (Managing Software Quality and Process), and
COMP6670 (Introduction to Machine Learning). Two real candidates were
rejected: COMP6800 and COMP6034 both explicitly require enrolment in Master
of Computing *(Advanced)* specifically, a different program to the one this
demo represents, and including them would have implied a program eligibility
this catalogue doesn't actually model. COMP4300 was rejected because its ANU
page only confirms offerings from 2027 onward, and the catalogue's existing
convention (and the app's own "{plan.year} planning prototype" copy) is to
only include courses confirmed offered in the demo's stated year, 2026.

COMP6320 is notable as the first catalogue course where both of its real
AND-groups are fully representable and therefore both enforced (COMP7710,
and separately COMP6262) — every other multi-group course in the catalogue
has at least one group with no in-catalogue alternative, so that group stays
display-only in `requisiteText`, following the same pattern established for
COMP8410 and COMP6442. The other four new courses each had at least one
AND-group outside the catalogue and were modeled the same informational-only
way. I verified COMP6320's enforcement by hand against a freshly-seeded
local database: adding it with neither prerequisite planned was rejected
(422, both groups listed as missing), still rejected with only COMP7710
planned, and succeeded only once COMP6262 was also planned — confirming the
AND semantics actually gate the add, not just the OR semantics within a
single group that every other course exercises.

`pnpm check` stayed green throughout (60/60 tests, 0 type errors).

## Deployment

Before deploying, I noticed `README.md` was still the starter's template
text. `spec/readme.test.ts` only asserts that `/readme/` serves whatever is
in `README.md`, so it would have passed either way — but the file is the
marker-facing "what this is and what good looks like here" account, so I
wrote it for real before shipping rather than leaving a placeholder live on
the deployed URL.

Deployed with the course-provided command
(`flyctl deploy --remote-only --ha=false -a comp4020-crit7-adam2221114`).
The app had an existing `v1` release from the course's own initial
provisioning, but that was the unmodified starter, not this project's code —
this was the first deploy of the actual Semester Planner.

I then verified the full persistence contract by hand against the live
`https://comp4020-crit7-adam2221114.fly.dev`, not just the local build:

- created a plan for a fresh Student ID via `POST /` (Astro's built-in
  cross-site POST protection means this needs a matching `Origin` header,
  same as a real browser form submission would send)
- added COMP6240 to Semester 1, confirmed the unit total updated to 6 and
  the course appeared in the planned list
- re-submitted the same Student ID as if returning later, and confirmed the
  same plan loaded rather than a new one being created
- attempted to add the same course again and confirmed it was rejected as a
  duplicate (`status=duplicate`) instead of silently succeeding
- removed the course and confirmed the total returned to 0
- checked the empty/error/success UI states directly: an empty Student ID
  submission returns `role="alert" status-error` with "Enter a Student ID to
  continue.", and a successful add returns `role="status" status-ok` with
  "Course added to your plan."

All of this held on the deployed app, backed by the persistent Fly volume,
not just in the local dev/test environment.

## Before you ship

`pnpm check:evidence` verifies that this comment is gone, that your citations
resolve to real commits, that a crit week's reflection entry is in
`reflections/`, and that your `CLAUDE.md` is there. It checks that your account
is traceable, not that it is good: that is the marker's call.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
