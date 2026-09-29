# Process overview

## What I built

An ANU Semester Planner: enter a Student ID, get or create a SQLite-backed
plan, add/remove courses per semester with live unit totals. The catalogue
models the real 2026 Master of Computing (Software Development) courses —
OR-within-group/AND-across-groups prerequisites, incompatibilities, and a
"previously completed" flag — sourced from ANU's own course pages.

## How I got here

Built slice by slice per CLAUDE.md: schema, then a function, then the route,
then a spec test against the real server, each committed once `pnpm check`
was green
([`d22c547...ed47b0f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/compare/d22c547...ed47b0f),
[`4c20996...993ccd8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/compare/4c20996...993ccd8)).

The first catalogue was invented undergraduate data; replaced with sourced
postgraduate courses
([`54acd19`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/54acd19))
after ANU's aggregated program page conflated COMP7710 with a different
course, COMP6710 — caught by checking each course's own page instead.
Unenforceable prerequisite groups are shown as text only, never falsely
blocking a course
([`daf7756`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/daf7756)).

> 现在加入更多的课程，但只限于计算机专业 ("more courses, Computer Science
> only")

Raised my own 8–12 cap to 8–18 and added five real COMP courses, each
checked against its own page; two candidates rejected as out of scope
([`830b9f2`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/830b9f2)).

> Redesign the cards to be state-driven ... reuse the existing logic
> rather than duplicating it in the UI.

Cards now derive available/blocked/not-offered by calling the same
`missingPrerequisites` function the backend already enforces, instead of
re-deriving it. Hand-verified all three prompted scenarios
([`24ce455`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-adam2221114/commit/24ce455)).

Deployed to Fly.io and hand-verified the full persistence contract (create,
add, reload, reject duplicate, remove, error/success states) against the
live app. `pnpm check` stayed green throughout (60/60 tests).
