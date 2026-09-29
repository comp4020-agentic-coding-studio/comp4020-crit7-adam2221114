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

---

## 进度记录（2026-09-29 暂停点）

这一节是给自己看的进度记录，不是给 agent 的新规则；标题带日期，过时了可以整段删掉重写。

### 已完成

- MVP 核心流程：Student ID 输入 → 获取/创建 plan → 查看课程目录 → 加入/移除
  学期课程 → 学分合计 → SQLite 持久化 → 刷新页面保留 → 同一 Student ID
  再次进入恢复原 plan。已通过自动化测试和人工 curl 验证。
- 已用 Guestbook 起始代码替换为真正的 Planner 流程。
- 已把课程目录从编造的本科课程换成真实来源的 2026 硕士
  （Master of Computing, Software Development 专业）10 门课程，逐门核对
  ANU Programs & Courses 官方课程页面（不是聚合的 program 页面，那个页面
  有已知的标题混淆 bug）。
- 已实现先修课程的 `groupId` 模型（同组 = OR，不同组 = AND）、
  `requisiteText`（官方原文展示）、以及"曾经修过（previously completed）"
  概念，并处理了曾修/已排入学期的互斥关系。
- 已按用户要求，把 COMP6442 的强制先修条件收紧为只强制 COMP7710
  （官方原文里的第二个 AND 条件组只展示、不强制，和 COMP8410 的处理方式一致）。
- `pnpm check` 全绿（60/60 测试，0 类型错误）。
- 已按小步提交（`feat`/`test`/`fix`/`docs` 各自独立 commit），
  `PROCESS.md` 已按真实发生的决策更新。
- 发现 `README.md` 还是起始模板原文（没人替换过），在部署前先写成真实内容——
  `/readme/` 是 spec 检查过的承诺，模板文字会原样被部署上线。
- 已部署到 Fly.io（`flyctl deploy --remote-only --ha=false -a
  comp4020-crit7-adam2221114`）。部署前 Fly 上只有课程初始配置的 `v1`
  release（起始代码，不是这个项目的实现），这是第一次把真正的 Planner
  部署上去。
- 已在真实的 `https://comp4020-crit7-adam2221114.fly.dev` 上人工用 curl
  逐步验证完整流程：创建 plan → 加课（学分合计变 6）→ 用同一个 Student ID
  "回来"确认加载的是同一个 plan 而不是新建的 → 重复加同一门课确认被拒绝
  （duplicate）→ 移除课程确认合计归零 → 确认空输入/成功/错误三种状态文案
  都正确（`status-error` / `status-ok`）。细节记在 `PROCESS.md` 的
  "Deployment" 一节。

### 还没做

- `reflections/crit-7.md` 还没写——按 CLAUDE.md 的要求，这个要留到接近提交
  前才写，不要提前写。
- 本地还有 31 个 commit 领先 `origin/main`，还没 push（是否现在 push、要不要
  把仓库设为 public 让 CI 也跑起来，需要用户确认）。
- 如果后续验证或提交前又做了新的决策/修正，记得同步更新 `PROCESS.md`。
- 除非用户明确要求，不要在这些之外主动扩展功能范围。