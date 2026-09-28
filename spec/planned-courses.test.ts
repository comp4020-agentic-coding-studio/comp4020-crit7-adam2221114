import { beforeAll, describe, expect, inject, it } from "vitest";

// Phase 3 of the ANU Semester Planner: adding/removing a course to/from a
// plan's semester, persisted in SQLite. Each request is a fresh HTTP
// round-trip against the real running server and its on-disk database, the
// same guarantee a page reload relies on.
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

const firstCourseId = async (): Promise<number> => {
  const res = await fetch(new URL("/api/courses", baseUrl));
  const courses = await res.json();
  return courses[0].id;
};

const secondCourseId = async (): Promise<number> => {
  const res = await fetch(new URL("/api/courses", baseUrl));
  const courses = await res.json();
  return courses[1].id;
};

const addCourse = (planId: number, courseId: number, semester: number) =>
  fetch(
    new URL(`/api/plans/${planId}/courses`, baseUrl),
    withOrigin({
      method: "POST",
      body: new URLSearchParams({ courseId: String(courseId), semester: String(semester) }),
    }),
  );

const listPlanned = async (planId: number) => {
  const res = await fetch(new URL(`/api/plans/${planId}/courses`, baseUrl));
  return res.json();
};

describe("planned courses", () => {
  let studentId: string;

  beforeAll(() => {
    studentId = `spec-planned-${process.hrtime.bigint()}`;
  });

  it("adds a course to semester 1", async () => {
    const plan = await createPlan(studentId);
    const courseId = await firstCourseId();

    const res = await addCourse(plan.id, courseId, 1);
    expect(res.status).toBe(200);
    const planned = await res.json();
    expect(planned.semester).toBe(1);
    expect(planned.courseId).toBe(courseId);
  });

  it("adds a course to semester 2", async () => {
    const plan = await createPlan(`${studentId}-s2`);
    const courseId = await secondCourseId();

    const res = await addCourse(plan.id, courseId, 2);
    expect(res.status).toBe(200);
    const planned = await res.json();
    expect(planned.semester).toBe(2);
  });

  it("persists a planned course across requests", async () => {
    const plan = await createPlan(`${studentId}-persist`);
    const courseId = await firstCourseId();
    await addCourse(plan.id, courseId, 1);

    const list = await listPlanned(plan.id);
    expect(list).toHaveLength(1);
    expect(list[0].courseId).toBe(courseId);
    expect(list[0].course.code).toBeTruthy();
  });

  it("prevents adding the same course to the same plan twice", async () => {
    const plan = await createPlan(`${studentId}-dup`);
    const courseId = await firstCourseId();
    await addCourse(plan.id, courseId, 1);

    const res = await addCourse(plan.id, courseId, 2);
    expect(res.status).toBe(409);

    const list = await listPlanned(plan.id);
    expect(list).toHaveLength(1);
  });

  it("removes a planned course", async () => {
    const plan = await createPlan(`${studentId}-remove`);
    const courseId = await firstCourseId();
    const added = await (await addCourse(plan.id, courseId, 1)).json();

    const res = await fetch(
      new URL(`/api/plans/${plan.id}/courses/${added.id}`, baseUrl),
      withOrigin({ method: "DELETE" }),
    );
    expect(res.status).toBe(204);

    const list = await listPlanned(plan.id);
    expect(list).toHaveLength(0);
  });

  it("keeps one student's plan independent of another's", async () => {
    const planA = await createPlan(`${studentId}-a`);
    const planB = await createPlan(`${studentId}-b`);
    const courseId = await firstCourseId();

    await addCourse(planA.id, courseId, 1);

    const listA = await listPlanned(planA.id);
    const listB = await listPlanned(planB.id);
    expect(listA).toHaveLength(1);
    expect(listB).toHaveLength(0);

    // Removing planA's row via planB's id must not delete it.
    const wrongRemoval = await fetch(
      new URL(`/api/plans/${planB.id}/courses/${listA[0].id}`, baseUrl),
      withOrigin({ method: "DELETE" }),
    );
    expect(wrongRemoval.status).toBe(404);
    expect(await listPlanned(planA.id)).toHaveLength(1);
  });
});
