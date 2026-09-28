import { beforeAll, describe, expect, inject, it } from "vitest";

// Phase 4 of the ANU Semester Planner: per-semester unit totals, derived
// from planned_courses + courses on every request rather than stored.
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

// COMP8280, COMP6240 and ENGN8100 are all 6-unit, prerequisite-free courses
// in the seed catalogue (src/lib/db.ts), so totals stay predictable without
// relying on catalogue ordering.
const CODES = ["COMP8280", "COMP6240", "ENGN8100"];
let catalogue: { id: number; code: string; units: number }[];
const courseId = (index: number): number => {
  const course = catalogue.find((c) => c.code === CODES[index]);
  if (!course) throw new Error(`seed course ${CODES[index]} missing`);
  return course.id;
};
const unitsOf = (index: number): number => {
  const course = catalogue.find((c) => c.code === CODES[index]);
  if (!course) throw new Error(`seed course ${CODES[index]} missing`);
  return course.units;
};

const addCourse = (planId: number, courseId: number, semester: number) =>
  fetch(
    new URL(`/api/plans/${planId}/courses`, baseUrl),
    withOrigin({
      method: "POST",
      body: new URLSearchParams({ courseId: String(courseId), semester: String(semester) }),
    }),
  );

const removeCourse = (planId: number, plannedCourseId: number) =>
  fetch(
    new URL(`/api/plans/${planId}/courses/${plannedCourseId}`, baseUrl),
    withOrigin({ method: "DELETE" }),
  );

const getTotals = async (planId: number) => {
  const res = await fetch(new URL(`/api/plans/${planId}/totals`, baseUrl));
  return res.json();
};

describe("semester unit totals", () => {
  let studentId: string;

  beforeAll(async () => {
    studentId = `spec-totals-${process.hrtime.bigint()}`;
    catalogue = await (await fetch(new URL("/api/courses", baseUrl))).json();
  });

  it("has zero totals for a fresh plan", async () => {
    const plan = await createPlan(`${studentId}-fresh`);
    expect(await getTotals(plan.id)).toEqual({ 1: 0, 2: 0 });
  });

  it("derives the semester 1 total from the units of its planned courses", async () => {
    const plan = await createPlan(`${studentId}-s1`);
    await addCourse(plan.id, courseId(0), 1);
    await addCourse(plan.id, courseId(1), 1);

    const totals = await getTotals(plan.id);
    expect(totals[1]).toBe(unitsOf(0) + unitsOf(1));
    expect(totals[2]).toBe(0);
  });

  it("derives the semester 2 total from the units of its planned courses", async () => {
    const plan = await createPlan(`${studentId}-s2`);
    await addCourse(plan.id, courseId(2), 2);

    const totals = await getTotals(plan.id);
    expect(totals[2]).toBe(unitsOf(2));
    expect(totals[1]).toBe(0);
  });

  it("updates the total correctly after removing a course", async () => {
    const plan = await createPlan(`${studentId}-remove`);
    const first = await (await addCourse(plan.id, courseId(0), 1)).json();
    await addCourse(plan.id, courseId(1), 1);

    expect((await getTotals(plan.id))[1]).toBe(unitsOf(0) + unitsOf(1));

    await removeCourse(plan.id, first.id);

    expect((await getTotals(plan.id))[1]).toBe(unitsOf(1));
  });

  it("stays correct after re-fetching the plan (simulated reload)", async () => {
    const plan = await createPlan(`${studentId}-reload`);
    await addCourse(plan.id, courseId(0), 1);
    await addCourse(plan.id, courseId(2), 2);

    const first = await getTotals(plan.id);
    const second = await getTotals(plan.id);
    expect(second).toEqual(first);
    expect(second[1]).toBe(unitsOf(0));
    expect(second[2]).toBe(unitsOf(2));
  });
});
