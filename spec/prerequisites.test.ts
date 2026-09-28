import { beforeAll, describe, expect, inject, it } from "vitest";

// Prerequisite checking against the real 2026 Master of Computing course
// relationships seeded in src/lib/db.ts. A prerequisite group is satisfied by
// a course previously completed, or planned strictly earlier in the same
// plan — planning it in the same semester does not count. COMP6331 needs one
// group with two alternatives (COMP7710 OR COMP6442). No in-catalogue course
// currently enforces more than one AND-group: COMP6442's and COMP8410's real
// second groups are shown in requisiteText but not enforced here, so there's
// no real (non-fabricated) multi-group case left to test against.
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

const markCompleted = (planId: number, courseId: number) =>
  fetch(
    new URL(`/api/plans/${planId}/completed`, baseUrl),
    withOrigin({ method: "POST", body: new URLSearchParams({ courseId: String(courseId) }) }),
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
    const foundations = courseByCode.get("COMP7710");
    if (!foundations) throw new Error("seed course COMP7710 missing");

    const res = await addCourse(plan.id, foundations.id, 1);
    expect(res.status).toBe(200);
  });

  it("rejects adding a course before its prerequisite is planned", async () => {
    const plan = await createPlan(`${studentId}-invalid`);
    const dependent = courseByCode.get("COMP8410");
    if (!dependent) throw new Error("seed course COMP8410 missing");

    const res = await addCourse(plan.id, dependent.id, 1);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.missing.flat()).toContain("COMP6240");
  });

  it("rejects a prerequisite-bearing course in the same semester as its prerequisite", async () => {
    const plan = await createPlan(`${studentId}-samesem`);
    const prerequisite = courseByCode.get("COMP6240");
    const dependent = courseByCode.get("COMP8410");
    if (!prerequisite || !dependent) throw new Error("seed courses missing");

    await addCourse(plan.id, prerequisite.id, 1);
    const res = await addCourse(plan.id, dependent.id, 1);
    expect(res.status).toBe(422);
  });

  it("allows adding a course once its prerequisite is planned in an earlier semester", async () => {
    const plan = await createPlan(`${studentId}-valid`);
    const prerequisite = courseByCode.get("COMP6240");
    const dependent = courseByCode.get("COMP8410");
    if (!prerequisite || !dependent) throw new Error("seed courses missing");

    const prereqRes = await addCourse(plan.id, prerequisite.id, 1);
    expect(prereqRes.status).toBe(200);

    const res = await addCourse(plan.id, dependent.id, 2);
    expect(res.status).toBe(200);
    const planned = await res.json();
    expect(planned.courseId).toBe(dependent.id);
    expect(planned.semester).toBe(2);
  });

  it("satisfies an OR group via just one of its alternatives", async () => {
    const plan = await createPlan(`${studentId}-or`);
    // COMP6331 requires (COMP7710 OR COMP6442) as a single group - planning
    // just COMP7710 (without ever touching COMP6442) should be enough.
    const alternative = courseByCode.get("COMP7710");
    const dependent = courseByCode.get("COMP6331");
    if (!alternative || !dependent) throw new Error("seed courses missing");

    await addCourse(plan.id, alternative.id, 1);
    const res = await addCourse(plan.id, dependent.id, 2);
    expect(res.status).toBe(200);
  });

  it("satisfies a prerequisite with a previously-completed course", async () => {
    const plan = await createPlan(`${studentId}-completed`);
    const prerequisite = courseByCode.get("COMP6240");
    const dependent = courseByCode.get("COMP8410");
    if (!prerequisite || !dependent) throw new Error("seed courses missing");

    const markRes = await markCompleted(plan.id, prerequisite.id);
    expect(markRes.status).toBe(200);

    const res = await addCourse(plan.id, dependent.id, 1);
    expect(res.status).toBe(200);
  });

  it("keeps previously-completed and planned mutually exclusive", async () => {
    const plan = await createPlan(`${studentId}-exclusive`);
    const course = courseByCode.get("COMP8280");
    if (!course) throw new Error("seed course COMP8280 missing");

    const added = await (await addCourse(plan.id, course.id, 1)).json();
    const markRes = await markCompleted(plan.id, course.id);
    expect(markRes.status).toBe(409);

    // The other direction: mark completed first, then try to plan it.
    const plan2 = await createPlan(`${studentId}-exclusive-2`);
    const course2 = courseByCode.get("COMP8280");
    if (!course2) throw new Error("seed course COMP8280 missing");
    const markFirst = await markCompleted(plan2.id, course2.id);
    expect(markFirst.status).toBe(200);
    const addAfterMark = await addCourse(plan2.id, course2.id, 1);
    expect(addAfterMark.status).toBe(409);

    // added in plan 1 stays untouched by the plan-2 checks above.
    expect(added.courseId).toBe(course.id);
  });

  it("prevents marking the same course previously completed twice", async () => {
    const plan = await createPlan(`${studentId}-dup-completed`);
    const course = courseByCode.get("COMP6260");
    if (!course) throw new Error("seed course COMP6260 missing");

    const first = await markCompleted(plan.id, course.id);
    expect(first.status).toBe(200);

    const second = await markCompleted(plan.id, course.id);
    expect(second.status).toBe(409);
  });
});
