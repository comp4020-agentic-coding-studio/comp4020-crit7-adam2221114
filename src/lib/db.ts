import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  type Course,
  courses,
  type Message,
  messages,
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

export type { Course, Message, SemesterPlan };

export function listCourses(): Course[] {
  return db.select().from(courses).orderBy(courses.code).all();
}

export function listMessages(): Message[] {
  return db.select().from(messages).orderBy(desc(messages.id)).limit(50).all();
}

export function addMessage(body: string): Message {
  return db.insert(messages).values({ body }).returning().get();
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
