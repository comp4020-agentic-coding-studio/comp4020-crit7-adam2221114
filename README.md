# ANU Semester Planner

A small full-stack replacement for one frustrating part of ANU course
planning: today a student has to look up course codes, course pages,
semester availability and study-load information from several separate
places just to sketch out a semester. This prototype puts a small,
representative catalogue of computing courses in one place and lets a
student build and save a semester plan against it.

A student types in a Student ID, which gets or creates their plan — no
password, and Student ID alone is **not** authentication, just a simple
identifier for this prototype. From there they can add courses to Semester 1
or Semester 2 from a catalogue of the 2026 Master of Computing (Software
Development) courses, see live per-semester unit totals, and remove courses
they no longer want. Everything is written to SQLite as it happens, so
refreshing the page or coming back later with the same Student ID always
shows the same plan.

The catalogue also carries real ANU prerequisite and incompatibility rules
for these courses, sourced from each course's own Programs & Courses
page (not the aggregated program-requirements page, which conflates
COMP7710 and COMP6710). A course can't be added until its enforceable
prerequisites are met, either by an earlier semester in the same plan or by
marking it "previously completed." This is still a small demonstration
catalogue, not the complete ANU course list or an authoritative source of
enrolment rules.

## What good looks like here

Good, for this prototype, means the full loop actually holds under a real
reload: Student ID → plan loads or is created → a course is added → it's in
SQLite → the page reloads → the course is still there — and the same is true
returning later with the same Student ID. That contract is what most of the
spec tests in `spec/` check, and it's also what I re-verified by hand against
the built server, not just trusted to the automated suite.

Decisions I made, and why:

- **Real course data, not invented data.** CLAUDE.md asks for a
  "representative" catalogue, but representative still means real, so the
  ten courses, their units, semester availability, and requisite text are
  all cross-checked against ANU's own course pages rather than made up.
- **Prerequisites are modelled as OR-within-a-group, AND-across-groups**,
  because real ANU requisites aren't a single chain — some courses need one
  of several alternatives, others need several independent things at once.
  Where a real requirement can't be enforced with this schema (for example,
  a requirement that's actually about program enrolment, or references a
  course outside this catalogue), the verbatim requisite text is still shown
  so the app never silently implies a course is prerequisite-free.
- **A lightweight "previously completed" flag**, short of any real academic
  history feature, exists only because some prerequisite courses in this
  catalogue are Semester-2-only, so an earlier-semester requirement can't
  always be satisfied purely by in-plan sequencing within one modelled year.
- **What I deliberately left out**: ANU authentication/SSO, the complete ANU
  catalogue, complex/complete prerequisite enforcement, timetable clash
  detection, real enrolment submission, and anything to do with fees or
  academic records. These are out of scope for a prototype demonstrating one
  slice of the planning flow, per `CLAUDE.md`.

The rules behind these choices live in `CLAUDE.md`; the checks that hold the
app to them live in `spec/`; the fuller account of how and why each decision
was made, including mistakes caught along the way, is in `PROCESS.md`.
