import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  type Course,
  coursePrerequisites,
  courses,
  type PlannedCourse,
  plannedCourses,
  type SemesterPlan,
  semesterPlans,
  students,
} from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

// A small demonstration catalogue (not the authoritative ANU course list —
// see CLAUDE.md). Seeded once: if the table already has rows, boot leaves
// it alone, so a redeploy never duplicates or resets the catalogue.
const SEED_COURSES: (typeof courses.$inferInsert)[] = [
  { code: "COMP1010", name: "Foundations of Computing", units: 6, offeredSemester: "1" },
  {
    code: "COMP1100",
    name: "Introduction to Programming and Algorithms",
    units: 6,
    offeredSemester: "1",
  },
  { code: "COMP1110", name: "Structured Programming", units: 6, offeredSemester: "2" },
  { code: "COMP2100", name: "Software Design Methodologies", units: 6, offeredSemester: "1" },
  { code: "COMP2120", name: "Algorithms and Data Structures", units: 6, offeredSemester: "2" },
  {
    code: "COMP2300",
    name: "Computer Organisation and Program Execution",
    units: 6,
    offeredSemester: "Both",
  },
  {
    code: "COMP2600",
    name: "Formal Methods for Software Engineering",
    units: 6,
    offeredSemester: "2",
  },
  { code: "COMP3120", name: "Software Project Management", units: 6, offeredSemester: "1" },
  { code: "COMP3600", name: "Algorithms", units: 6, offeredSemester: "1" },
  { code: "COMP4610", name: "Human Computer Interaction", units: 6, offeredSemester: "2" },
];

function seedCourses(): void {
  if (db.select().from(courses).limit(1).get()) return;
  db.insert(courses).values(SEED_COURSES).run();
}
seedCourses();

// A small set of prerequisite pairs among the demo courses (child requires
// parent) — enough to demonstrate the validation, not a real degree's
// prerequisite chain. Seeded once, same idempotent pattern as the courses
// themselves.
const SEED_PREREQUISITES: [child: string, parent: string][] = [
  ["COMP2100", "COMP1100"],
  ["COMP2120", "COMP1100"],
  ["COMP2600", "COMP1100"],
  ["COMP2300", "COMP1010"],
  ["COMP3120", "COMP2100"],
  ["COMP3600", "COMP2120"],
  ["COMP4610", "COMP2100"],
];

function seedPrerequisites(): void {
  if (db.select().from(coursePrerequisites).limit(1).get()) return;
  const idByCode = new Map(
    db
      .select({ code: courses.code, id: courses.id })
      .from(courses)
      .all()
      .map((course) => [course.code, course.id]),
  );
  const rows = SEED_PREREQUISITES.map(([child, parent]) => ({
    courseId: idByCode.get(child) as number,
    prerequisiteCourseId: idByCode.get(parent) as number,
  }));
  db.insert(coursePrerequisites).values(rows).run();
}
seedPrerequisites();

export type { Course, PlannedCourse, SemesterPlan };

// Thrown when a course is already in a plan — the caller (the API route)
// decides what HTTP status that becomes.
export class DuplicatePlannedCourseError extends Error {}

// Thrown when a course's prerequisite isn't yet planned in an earlier
// semester of the same plan. `missing` is every unsatisfied prerequisite, so
// the caller can name them in the message it shows a student.
export class PrerequisiteNotSatisfiedError extends Error {
  constructor(
    public readonly missing: Course[],
    message: string,
  ) {
    super(message);
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && "code" in err && err.code === "SQLITE_CONSTRAINT_UNIQUE";
}

export function listCourses(): Course[] {
  return db.select().from(courses).orderBy(courses.code).all();
}

// The prerequisite courses of one course (empty if it has none).
export function listPrerequisitesFor(courseId: number): Course[] {
  return db
    .select({
      id: courses.id,
      code: courses.code,
      name: courses.name,
      units: courses.units,
      offeredSemester: courses.offeredSemester,
    })
    .from(coursePrerequisites)
    .innerJoin(courses, eq(coursePrerequisites.prerequisiteCourseId, courses.id))
    .where(eq(coursePrerequisites.courseId, courseId))
    .all();
}

// The whole catalogue, each course carrying its prerequisites — what the
// planner UI needs to explain why an add might be rejected before the
// student even tries it.
export function listCoursesWithPrerequisites(): (Course & { prerequisites: Course[] })[] {
  return listCourses().map((course) => ({
    ...course,
    prerequisites: listPrerequisitesFor(course.id),
  }));
}

// A course with any prerequisite can only ever go in Semester 2: Semester 1
// has no earlier semester within a plan for that prerequisite to have been
// satisfied in. For Semester 2, every prerequisite must already be planned
// in Semester 1 of the same plan. Returns the still-missing prerequisites
// (empty means the course can be added).
function missingPrerequisites(planId: number, courseId: number, semester: number): Course[] {
  const prerequisites = listPrerequisitesFor(courseId);
  if (prerequisites.length === 0) return [];
  if (semester === 1) return prerequisites;

  const semester1CourseIds = new Set(
    listPlannedCourses(planId)
      .filter((planned) => planned.semester === 1)
      .map((planned) => planned.courseId),
  );
  return prerequisites.filter((prerequisite) => !semester1CourseIds.has(prerequisite.id));
}

// One active plan per Student ID: return it if it exists, otherwise create
// both the student record and a fresh plan. Student ID is just an
// identifier here, not authentication.
export function getOrCreatePlan(studentId: string): SemesterPlan {
  const existing = db
    .select()
    .from(semesterPlans)
    .where(eq(semesterPlans.studentId, studentId))
    .get();
  if (existing) return existing;

  db.insert(students).values({ studentId }).onConflictDoNothing().run();

  return db
    .insert(semesterPlans)
    .values({ studentId, year: new Date().getFullYear() })
    .returning()
    .get();
}

// Adds a course to a plan's semester. Semester must be 1 or 2 (also
// enforced by a check constraint in the schema); a course whose
// prerequisites aren't yet planned in an earlier semester of this plan
// raises PrerequisiteNotSatisfiedError, and a course already in the plan (in
// either semester) raises DuplicatePlannedCourseError instead of creating a
// second row.
export function addPlannedCourse(
  planId: number,
  courseId: number,
  semester: number,
): PlannedCourse {
  if (semester !== 1 && semester !== 2) {
    throw new RangeError("semester must be 1 or 2");
  }
  const missing = missingPrerequisites(planId, courseId, semester);
  if (missing.length > 0) {
    throw new PrerequisiteNotSatisfiedError(
      missing,
      `requires ${missing.map((course) => course.code).join(", ")} to be planned in Semester 1 first`,
    );
  }
  try {
    return db.insert(plannedCourses).values({ planId, courseId, semester }).returning().get();
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new DuplicatePlannedCourseError(`course ${courseId} is already in plan ${planId}`);
    }
    throw err;
  }
}

export function listPlannedCourses(planId: number): (PlannedCourse & { course: Course })[] {
  return db
    .select({
      id: plannedCourses.id,
      planId: plannedCourses.planId,
      courseId: plannedCourses.courseId,
      semester: plannedCourses.semester,
      course: courses,
    })
    .from(plannedCourses)
    .innerJoin(courses, eq(plannedCourses.courseId, courses.id))
    .where(eq(plannedCourses.planId, planId))
    .all();
}

// Scoped to planId so one student can never remove a row from another
// student's plan, even if they guess another plan's row id.
export function removePlannedCourse(planId: number, plannedCourseId: number): boolean {
  const result = db
    .delete(plannedCourses)
    .where(and(eq(plannedCourses.id, plannedCourseId), eq(plannedCourses.planId, planId)))
    .run();
  return result.changes > 0;
}

// Derived on every call from planned_courses + courses — never stored, so
// there's nothing to fall out of sync with the rows that back it.
export function getSemesterTotals(planId: number): { 1: number; 2: number } {
  const totals = { 1: 0, 2: 0 };
  for (const planned of listPlannedCourses(planId)) {
    if (planned.semester === 1 || planned.semester === 2) {
      totals[planned.semester] += planned.course.units;
    }
  }
  return totals;
}
