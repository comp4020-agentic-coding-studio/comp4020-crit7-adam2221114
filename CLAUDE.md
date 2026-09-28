# COMP4020 Crit 7 — ANU Semester Planner
## Your harness

This file is yours, and it arrives empty on purpose. The rules you hold the
agent to are part of what gets marked, so they should be rules you decided on.

Nothing about the starter is recorded here. What the repo ships is explained
where it lives --- `fly.toml`, the `Dockerfile`, the CI workflow and
`spec/README.md` each say what they fix --- and the
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec. Read them before you plan or build;
what the agent needs to carry from any of it is your call.

## Project

This repository is for COMP4020 Crit 7:

**Build the ANU system you wish existed.**

The project is a small full-stack replacement for one frustrating part of ANU course planning.

The app is an **ANU Semester Planner**.

The problem being addressed is that students currently need to look up course codes, course pages, semester availability and study-load information separately when planning a semester.

This prototype should make that process simpler by presenting a small set of representative courses in one place and allowing a student to save a semester plan.

This is deliberately a **small slice of the real ANU system**, not an attempt to rebuild ANU enrolment.

---

## Core user flow

The minimum end-to-end flow is:

1. A student enters a Student ID.
2. The app looks for an existing semester plan associated with that Student ID.
3. If no plan exists, the app creates one.
4. The student sees a small catalogue of representative courses.
5. The student can add a course to Semester 1 or Semester 2.
6. The student can remove a course from a semester.
7. The app shows the total units currently planned for each semester.
8. The plan is stored in SQLite.
9. Refreshing the page must preserve the plan.
10. Returning later and entering the same Student ID must load the same saved plan.

Student ID is only a simple identifier for this prototype.

Do **not** implement password authentication or claim that Student ID alone is secure authentication.

---

## Scope

Use only one representative ANU computing program and approximately **8–12 sample courses**.

The prototype does not need to contain every ANU course.

The course catalogue exists to demonstrate the semester-planning interaction and the full-stack data flow.

### MVP

The MVP must contain:

- Student ID entry
- Create or retrieve a plan using Student ID
- One small catalogue of computing courses
- Course code
- Course name
- Units
- Semester availability
- Add course to Semester 1
- Add course to Semester 2
- Remove planned course
- Total units for each semester
- SQLite persistence
- Reload persistence
- Retrieval of an existing plan using the same Student ID
- Clear empty, success and error states
- Responsive and accessible UI

---

## Out of scope

Do not implement these unless the complete MVP is already working and tested:

- ANU authentication
- Passwords
- SSO
- Complete ANU course catalogue
- Complete degree requirements
- Complex prerequisite parsing
- Credit transfer logic
- Specialisation completion logic
- Real timetable data
- Timetable clash detection
- Real enrolment submission
- Payment or fees
- Student records
- Multiple academic years
- Drag-and-drop unless it clearly improves the completed MVP

Do not expand the scope without asking first.

---

## Suggested data model

Keep the schema small.

### Student

Represents the identifier used to retrieve a plan.

Suggested fields:

- id
- studentId
- createdAt

`studentId` should be unique.

### Course

Represents one course in the small demonstration catalogue.

Suggested fields:

- id
- code
- name
- units
- offeredSemester

Course catalogue data may be seeded.

### SemesterPlan

Represents the plan belonging to one student.

Suggested fields:

- id
- studentId
- year
- createdAt
- updatedAt

Only one active plan per Student ID is required for this prototype.

### PlannedCourse

Joins a course to a semester plan.

Suggested fields:

- id
- planId
- courseId
- semester

Semester should only allow:

- 1
- 2

Prevent the same course from being added to the same plan more than once.

---

## Technical direction

Use the Crit 7 starter stack as provided:

- Astro
- backend routes/actions provided by the starter
- Drizzle ORM
- SQLite
- Fly.io
- persistent Fly volume

Prefer the existing starter patterns instead of introducing unnecessary libraries.

The existing guestbook is starter/demo code.

Replace the guestbook functionality with the Semester Planner rather than building the planner beside an unused guestbook.

---

## Persistence requirement

Persistence is a central requirement of this crit.

The important contract is:

Student enters ID  
→ plan loads or is created  
→ student adds a course  
→ data is written to SQLite  
→ page reloads  
→ course is still in the plan.

A second important flow is:

Student creates a plan  
→ leaves the planner  
→ returns later  
→ enters the same Student ID  
→ previous plan is loaded from SQLite.

Do not satisfy persistence using only:

- component state
- localStorage
- sessionStorage
- URL parameters

The server-side database must be the source of truth.

---

## Testing

Keep the existing course harness working.

`pnpm check` must remain green throughout development.

Replace starter guestbook-specific tests when appropriate with tests for the actual Semester Planner.

At minimum, add automated coverage for:

1. A plan can be created for a Student ID.
2. The same Student ID retrieves the existing plan instead of creating duplicates.
3. A course can be added to a semester.
4. A planned course survives a reload/new request because it exists in SQLite.
5. A course can be removed.
6. Duplicate planned courses are prevented.
7. Semester unit totals are derived correctly.

Prefer behaviour tests over tests coupled to implementation details.

Do not remove course-provided invariant/evidence tests simply to make the suite pass.

---

## Working process

This repo is assessed partly through its process.

Work incrementally.

Prefer small meaningful commits such as:

- `feat(data): add semester planner schema`
- `feat(planner): add student plan lookup`
- `feat(planner): add course catalogue`
- `feat(planner): persist planned courses`
- `test(planner): cover reload persistence`
- `style(planner): polish semester planning UI`
- `docs(process): record crit 7 development decisions`

Do not make one giant final commit.

Before significant implementation changes:

1. understand the existing starter
2. identify the smallest next vertical slice
3. implement it
4. run relevant tests
5. run `pnpm check`
6. inspect the actual UI/behaviour
7. commit the working increment

---

## PROCESS.md

Maintain `PROCESS.md` as development progresses.

It should explain:

- the original problem
- why this system slice was chosen
- how the scope was reduced
- the data model
- important design decisions
- how AI was directed
- mistakes or weak approaches that were corrected
- testing and validation
- deployment decisions
- meaningful iteration during development

Do not fabricate process history at the end.

Update it as real decisions happen.

---

## Reflection

The final reflection belongs in:

`reflections/crit-7.md`

It should be grounded in what actually happened during development.

Do not write the final reflection prematurely.

Keep notes during development that can later support it.

---

## UI direction

The planner should feel simpler and clearer than the workflow it replaces.

Prioritise:

- obvious hierarchy
- clear course codes and names
- readable semester columns/cards
- obvious Add and Remove actions
- visible unit totals
- useful feedback after actions
- good empty states
- mobile usability
- keyboard/accessibility basics

Avoid unnecessary visual complexity.

The prototype should look intentional, but functionality and clarity matter more than decorative effects.

---

## Course data

Only a small representative catalogue is needed.

Use approximately 8–12 computing courses.

Course information should be clearly treated as demonstration data for the prototype.

Do not imply that this prototype contains the complete or authoritative ANU course catalogue.

---

## Definition of done

The Crit 7 implementation is ready when:

- the app loads successfully on its assigned `*.fly.dev` URL
- Student ID can open or create a plan
- courses can be added to Semester 1 or Semester 2
- courses can be removed
- unit totals update correctly
- the plan is stored in SQLite
- reload does not lose planned courses
- entering the same Student ID later restores the plan
- `pnpm check` passes
- the starter guestbook has been replaced by the actual project flow
- the repository contains meaningful incremental commits
- `PROCESS.md` reflects the real process
- `reflections/crit-7.md` is completed before submission
- the deployed Fly.io version has been manually verified

When uncertain, favour the smallest implementation that proves the full end-to-end flow.