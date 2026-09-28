import { beforeAll, describe, expect, inject, it } from "vitest";

// Prerequisite checking: a deliberately small, flat relation between demo
// courses (seeded in src/lib/db.ts — COMP2100 requires COMP1100), validated
// only when a course is added. Semester 1 has no earlier semester within a
// plan, so a course with a prerequisite can only ever land in Semester 2,
// and only once its prerequisite is already planned in Semester 1 of the
// same plan.
const baseUrl = inject("baseUrl");

const withOrigin = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...init.headers, origin: baseUrl },
});

const createPlan = async (studentId: string) => {
  const res = await fetch(
    new URL("/api/plan", baseUrl),
    withOrigin({ method: "POST", body: new URLSearchParams({ studentId }) }),
  );
  return res.json();
};

const addCourse = (planId: number, courseId: number, semester: number) =>
  fetch(
    new URL(`/api/plans/${planId}/courses`, baseUrl),
    withOrigin({
      method: "POST",
      body: new URLSearchParams({ courseId: String(courseId), semester: String(semester) }),
    }),
  );

let courseByCode: Map<string, { id: number; code: string }>;

describe("prerequisites", () => {
  let studentId: string;

  beforeAll(async () => {
    studentId = `spec-prereq-${process.hrtime.bigint()}`;
    const catalogue: { id: number; code: string }[] = await (
      await fetch(new URL("/api/courses", baseUrl))
    ).json();
    courseByCode = new Map(catalogue.map((course) => [course.code, course]));
  });

  it("adds a course with no prerequisite to either semester", async () => {
    const plan = await createPlan(`${studentId}-none`);
    const foundations = courseByCode.get("COMP1010");
    if (!foundations) throw new Error("seed course COMP1010 missing");

    const res = await addCourse(plan.id, foundations.id, 1);
    expect(res.status).toBe(200);
  });

  it("rejects adding a course before its prerequisite is planned", async () => {
    const plan = await createPlan(`${studentId}-invalid`);
    const dependent = courseByCode.get("COMP2100");
    if (!dependent) throw new Error("seed course COMP2100 missing");

    const res = await addCourse(plan.id, dependent.id, 2);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.missing).toContain("COMP1100");
  });

  it("rejects a prerequisite-bearing course in Semester 1, even with the prerequisite planned", async () => {
    const plan = await createPlan(`${studentId}-sem1`);
    const prerequisite = courseByCode.get("COMP1100");
    const dependent = courseByCode.get("COMP2100");
    if (!prerequisite || !dependent) throw new Error("seed courses missing");

    await addCourse(plan.id, prerequisite.id, 1);
    const res = await addCourse(plan.id, dependent.id, 1);
    expect(res.status).toBe(422);
  });

  it("allows adding a course once its prerequisite is planned in Semester 1", async () => {
    const plan = await createPlan(`${studentId}-valid`);
    const prerequisite = courseByCode.get("COMP1100");
    const dependent = courseByCode.get("COMP2100");
    if (!prerequisite || !dependent) throw new Error("seed courses missing");

    const prereqRes = await addCourse(plan.id, prerequisite.id, 1);
    expect(prereqRes.status).toBe(200);

    const res = await addCourse(plan.id, dependent.id, 2);
    expect(res.status).toBe(200);
    const planned = await res.json();
    expect(planned.courseId).toBe(dependent.id);
    expect(planned.semester).toBe(2);
  });
});
