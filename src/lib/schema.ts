import { sql } from "drizzle-orm";
import { check, int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// One row per Student ID that has ever asked for a plan. Student ID is a
// plain identifier for this prototype, not authentication.
export const students = sqliteTable("students", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: text("student_id").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// One active plan per Student ID (enforced by the unique constraint below).
export const semesterPlans = sqliteTable("semester_plans", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: text("student_id")
    .notNull()
    .unique()
    .references(() => students.studentId),
  year: int().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type SemesterPlan = typeof semesterPlans.$inferSelect;

// A small demonstration catalogue, not the authoritative ANU course list.
// offeredSemester is "1", "2", or "Both". requisiteText is the official ANU
// requisite/incompatibility wording, stored so the UI can show it verbatim
// instead of the app inventing its own paraphrase — separate from
// coursePrerequisites below, which is only the subset of that wording this
// prototype actually enforces.
export const courses = sqliteTable("courses", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull().unique(),
  name: text().notNull(),
  units: int().notNull(),
  offeredSemester: text("offered_semester").notNull(),
  requisiteText: text("requisite_text"),
});

export type Course = typeof courses.$inferSelect;

// Joins a course to a semester within one plan. The unique index prevents
// adding the same course to the same plan twice (in either semester); the
// check constraint keeps semester to 1 or 2 at the database level too.
export const plannedCourses = sqliteTable(
  "planned_courses",
  {
    id: int().primaryKey({ autoIncrement: true }),
    planId: int("plan_id")
      .notNull()
      .references(() => semesterPlans.id),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
    semester: int().notNull(),
  },
  (table) => [
    uniqueIndex("planned_courses_plan_course_unique").on(table.planId, table.courseId),
    check("planned_courses_semester_check", sql`${table.semester} in (1, 2)`),
  ],
);

export type PlannedCourse = typeof plannedCourses.$inferSelect;

// A prerequisite relation between two demo courses: a row means courseId
// requires prerequisiteCourseId, grouped by groupId. Rows sharing
// (courseId, groupId) are alternatives — any one of them satisfies that
// group ("one of A, B, C"); rows in different groups are all required
// together ("group 1 AND group 2"), which is how ANU's own requisite text
// is actually structured. The unique index prevents seeding (or adding) the
// same pair twice.
export const coursePrerequisites = sqliteTable(
  "course_prerequisites",
  {
    id: int().primaryKey({ autoIncrement: true }),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
    prerequisiteCourseId: int("prerequisite_course_id")
      .notNull()
      .references(() => courses.id),
    groupId: int("group_id").notNull().default(0),
  },
  (table) => [
    uniqueIndex("course_prerequisites_unique").on(table.courseId, table.prerequisiteCourseId),
  ],
);

export type CoursePrerequisite = typeof coursePrerequisites.$inferSelect;

// A course the student says they've already completed outside this plan —
// the lightweight alternative to a full academic-history feature. A course
// can be previously completed OR planned in this plan, never both (enforced
// in src/lib/db.ts), and either one can satisfy a prerequisite group.
export const previouslyCompletedCourses = sqliteTable(
  "previously_completed_courses",
  {
    id: int().primaryKey({ autoIncrement: true }),
    planId: int("plan_id")
      .notNull()
      .references(() => semesterPlans.id),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
  },
  (table) => [
    uniqueIndex("previously_completed_courses_plan_course_unique").on(
      table.planId,
      table.courseId,
    ),
  ],
);

export type PreviouslyCompletedCourse = typeof previouslyCompletedCourses.$inferSelect;
