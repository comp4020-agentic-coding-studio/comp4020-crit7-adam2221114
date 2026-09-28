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
  type PreviouslyCompletedCourse,
  previouslyCompletedCourses,
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
// see CLAUDE.md), drawn from the real 2026 Master of Computing (7706XMCOMP)
// core and its Software Development specialisation, verified against each
// course's own page on ANU Programs & Courses. requisiteText is the official
// wording verbatim; coursePrerequisites below only encodes the subset of it
// this prototype can actually enforce (a course requirement that names a
// course outside this catalogue, or a program-enrolment condition, has no
// row there and is informational only). Seeded once: if the table already
// has rows, boot leaves it alone, so a redeploy never duplicates or resets
// the catalogue.
const SEED_COURSES: (typeof courses.$inferInsert)[] = [
  {
    code: "COMP6120",
    name: "Software Engineering",
    units: 6,
    offeredSemester: "2",
    requisiteText:
      "You must have successfully completed or be currently studying COMP6442 or COMP2100. Incompatible with COMP2120.",
  },
  {
    code: "COMP6442",
    name: "Software Construction",
    units: 6,
    offeredSemester: "Both",
    requisiteText:
      "You must have completed COMP6710 or COMP7710 or COMP1110 or COMP1140, and have completed or be currently enrolled in MATH6005 or COMP6260 or MATH1005 (or be enrolled in the Master of Computing (Advanced)). Incompatible with COMP2100.",
  },
  {
    code: "COMP7710",
    name: "Programming Fundamentals",
    units: 12,
    offeredSemester: "Both",
    requisiteText:
      "Incompatible with COMP1110 or COMP1140 or COMP6710. Enrolment requires a permission code from the School of Computing.",
  },
  {
    code: "COMP8280",
    name: "Responsible Practice, Innovation and Leadership",
    units: 6,
    offeredSemester: "Both",
    requisiteText:
      "You must be enrolled in the Graduate Diploma of Computing, Master of Computing, Master of Computing (Advanced) or Master of Machine Learning and Computer Vision. Incompatible with COMP8260, ENGN8260 and ENGN8280.",
  },
  {
    code: "COMP6260",
    name: "Foundations of Computing",
    units: 6,
    offeredSemester: "2",
    requisiteText: "Incompatible with COMP1600.",
  },
  {
    code: "ENGN8100",
    name: "Introduction to Systems Engineering",
    units: 6,
    offeredSemester: "1",
    requisiteText:
      "You must be studying Master of Engineering, Master of Computing, Master of Computing (Advanced), Master of Project Management, Master of Business Information Systems or Graduate Certificate in Nuclear Technology and Regulation.",
  },
  {
    code: "COMP8410",
    name: "Data Mining",
    units: 6,
    offeredSemester: "1",
    requisiteText:
      "You must have completed COMP7240 or COMP6240 or COMP2400, and COMP6730 or COMP7230 or COMP6710. Incompatible with COMP3420, COMP3425, COMP8400 and COMP8910.",
  },
  {
    code: "COMP6240",
    name: "Relational Databases",
    units: 6,
    offeredSemester: "Both",
    requisiteText:
      "You are not able to enrol in this course if you have successfully completed COMP2400. Incompatible with COMP7240.",
  },
  {
    code: "COMP6331",
    name: "Computer Networks",
    units: 6,
    offeredSemester: "1",
    requisiteText:
      "You must have completed (COMP6710 or COMP7710 or COMP1110 or COMP1140) or (COMP6310 or COMP2310) or (COMP6442 or COMP2100). Incompatible with COMP3310, ENGN3539 and ENGN6539.",
  },
  {
    code: "COMP6390",
    name: "Human-Computer Interaction",
    units: 6,
    offeredSemester: "2",
    requisiteText:
      "You must be studying Master of Computing or Master of Computing (Advanced), or have completed 6 units of COMP6442, COMP6710 or COMP6720. Incompatible with COMP3900.",
  },
];

function seedCourses(): void {
  if (db.select().from(courses).limit(1).get()) return;
  db.insert(courses).values(SEED_COURSES).run();
}
seedCourses();

// The prerequisite relationships this prototype enforces, trimmed to what's
// actually representable within the catalogue above — real ANU requisites
// that name a course outside it are left out here (they still show up in
// requisiteText, informationally). Rows sharing (child, groupId) are
// alternatives, "one of these satisfies the group"; a course with rows in
// more than one group needs every group satisfied. COMP6442 mirrors ANU's
// real "intro programming AND discrete maths" structure; COMP6331 mirrors
// ANU's real "any one of three independent paths" structure.
const SEED_PREREQUISITES: [child: string, groupId: number, parent: string][] = [
  ["COMP6120", 1, "COMP6442"],
  ["COMP6442", 1, "COMP7710"],
  ["COMP8410", 1, "COMP6240"],
  ["COMP6331", 1, "COMP7710"],
  ["COMP6331", 1, "COMP6442"],
];
// COMP6442's real second AND-group (completed or currently enrolled in
// MATH6005/COMP6260/MATH1005) is preserved verbatim in requisiteText above
// but not enforced here: only COMP7710 is enforced as its prerequisite.

function seedPrerequisites(): void {
  if (db.select().from(coursePrerequisites).limit(1).get()) return;
  const idByCode = new Map(
    db
      .select({ code: courses.code, id: courses.id })
      .from(courses)
      .all()
      .map((course) => [course.code, course.id]),
  );
  const rows = SEED_PREREQUISITES.map(([child, groupId, parent]) => ({
    courseId: idByCode.get(child) as number,
    groupId,
    prerequisiteCourseId: idByCode.get(parent) as number,
  }));
  db.insert(coursePrerequisites).values(rows).run();
}
seedPrerequisites();

export type { Course, PlannedCourse, PreviouslyCompletedCourse, SemesterPlan };

// Thrown when a course is already in a plan — the caller (the API route)
// decides what HTTP status that becomes.
export class DuplicatePlannedCourseError extends Error {}

// Thrown when a course is already marked previously completed for a plan.
export class DuplicateCompletedCourseError extends Error {}

// Thrown when trying to plan a course that's already marked previously
// completed for this plan, or vice versa — a course can only be one or the
// other, never both.
export class CourseAlreadyCompletedError extends Error {}
export class CourseAlreadyPlannedError extends Error {}

// Thrown when a course's prerequisite groups aren't all satisfied yet.
// `missingGroups` is every unsatisfied group (each an array of alternative
// courses, any one of which would satisfy it), so the caller can explain
// exactly what's missing to a student.
export class PrerequisiteNotSatisfiedError extends Error {
  constructor(
    public readonly missingGroups: Course[][],
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

// The prerequisite groups of one course (empty if it has none). Courses
// sharing a groupId are alternatives; every group returned must have at
// least one satisfied member for the course to be addable.
export function listPrerequisiteGroupsFor(courseId: number): Course[][] {
  const rows = db
    .select({ groupId: coursePrerequisites.groupId, course: courses })
    .from(coursePrerequisites)
    .innerJoin(courses, eq(coursePrerequisites.prerequisiteCourseId, courses.id))
    .where(eq(coursePrerequisites.courseId, courseId))
    .all();

  const byGroup = new Map<number, Course[]>();
  for (const row of rows) {
    const group = byGroup.get(row.groupId) ?? [];
    group.push(row.course);
    byGroup.set(row.groupId, group);
  }
  return [...byGroup.values()];
}

// The whole catalogue, each course carrying its prerequisite groups — what
// the planner UI needs to explain why an add might be rejected before the
// student even tries it.
export function listCoursesWithPrerequisites(): (Course & { prerequisiteGroups: Course[][] })[] {
  return listCourses().map((course) => ({
    ...course,
    prerequisiteGroups: listPrerequisiteGroupsFor(course.id),
  }));
}

export function listPreviouslyCompleted(
  planId: number,
): (PreviouslyCompletedCourse & { course: Course })[] {
  return db
    .select({
      id: previouslyCompletedCourses.id,
      planId: previouslyCompletedCourses.planId,
      courseId: previouslyCompletedCourses.courseId,
      course: courses,
    })
    .from(previouslyCompletedCourses)
    .innerJoin(courses, eq(previouslyCompletedCourses.courseId, courses.id))
    .where(eq(previouslyCompletedCourses.planId, planId))
    .all();
}

// Marks a course as completed outside this plan — the lightweight
// alternative to a full academic history. Rejected if the course is already
// planned in this plan (mutually exclusive with planning it) or already
// marked completed.
export function markPreviouslyCompleted(
  planId: number,
  courseId: number,
): PreviouslyCompletedCourse {
  const alreadyPlanned = db
    .select()
    .from(plannedCourses)
    .where(and(eq(plannedCourses.planId, planId), eq(plannedCourses.courseId, courseId)))
    .get();
  if (alreadyPlanned) {
    throw new CourseAlreadyPlannedError(
      `course ${courseId} is already planned in plan ${planId}; remove it before marking it previously completed`,
    );
  }
  try {
    return db.insert(previouslyCompletedCourses).values({ planId, courseId }).returning().get();
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new DuplicateCompletedCourseError(
        `course ${courseId} is already marked previously completed in plan ${planId}`,
      );
    }
    throw err;
  }
}

// Scoped to planId so one student can never touch another student's rows.
export function unmarkPreviouslyCompleted(planId: number, completedId: number): boolean {
  const result = db
    .delete(previouslyCompletedCourses)
    .where(
      and(
        eq(previouslyCompletedCourses.id, completedId),
        eq(previouslyCompletedCourses.planId, planId),
      ),
    )
    .run();
  return result.changes > 0;
}

// A prerequisite group is satisfied if any course in it was previously
// completed, or planned strictly earlier in the same plan — planning it in
// the same semester does not count, since the two would run concurrently.
// Returns the groups still unsatisfied (empty means the course can be
// added).
function missingPrerequisites(planId: number, courseId: number, semester: number): Course[][] {
  const groups = listPrerequisiteGroupsFor(courseId);
  if (groups.length === 0) return [];

  const completedIds = new Set(listPreviouslyCompleted(planId).map((entry) => entry.courseId));
  const earlierPlannedIds = new Set(
    listPlannedCourses(planId)
      .filter((planned) => planned.semester < semester)
      .map((planned) => planned.courseId),
  );
  const satisfiedIds = new Set([...completedIds, ...earlierPlannedIds]);

  return groups.filter((group) => !group.some((course) => satisfiedIds.has(course.id)));
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
// enforced by a check constraint in the schema). Raises
// CourseAlreadyCompletedError if the course is marked previously completed
// in this plan, PrerequisiteNotSatisfiedError if a prerequisite group isn't
// yet satisfied, and DuplicatePlannedCourseError if the course is already
// planned (in either semester).
export function addPlannedCourse(
  planId: number,
  courseId: number,
  semester: number,
): PlannedCourse {
  if (semester !== 1 && semester !== 2) {
    throw new RangeError("semester must be 1 or 2");
  }
  const alreadyCompleted = db
    .select()
    .from(previouslyCompletedCourses)
    .where(
      and(
        eq(previouslyCompletedCourses.planId, planId),
        eq(previouslyCompletedCourses.courseId, courseId),
      ),
    )
    .get();
  if (alreadyCompleted) {
    throw new CourseAlreadyCompletedError(
      `course ${courseId} is already marked previously completed in plan ${planId}`,
    );
  }

  const missingGroups = missingPrerequisites(planId, courseId, semester);
  if (missingGroups.length > 0) {
    const describe = (group: Course[]) => group.map((course) => course.code).join(" or ");
    throw new PrerequisiteNotSatisfiedError(
      missingGroups,
      `requires ${missingGroups.map(describe).join(", and ")} to be previously completed or planned in an earlier semester`,
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
