import { beforeAll, describe, expect, inject, it } from "vitest";

// Phase 1 of the ANU Semester Planner: a Student ID gets an existing plan or
// a fresh one, and repeating the same Student ID never creates a duplicate.
// Each request below is a fresh HTTP round-trip against the real running
// server and its on-disk SQLite file, the same guarantee a page reload
// relies on.
const baseUrl = inject("baseUrl");

describe("semester plan lookup", () => {
  let studentId: string;
  let otherStudentId: string;

  beforeAll(() => {
    const probe = process.hrtime.bigint();
    studentId = `spec-student-${probe}`;
    otherStudentId = `spec-other-${probe}`;
  });

  // Astro checks form POSTs carry a same-origin Origin header (CSRF
  // protection); browsers send it automatically, a bare fetch doesn't.
  const requestPlan = (id: string) =>
    fetch(new URL("/api/plan", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body: new URLSearchParams({ studentId: id }),
    });

  it("creates a plan for a new Student ID", async () => {
    const res = await requestPlan(studentId);
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.studentId).toBe(studentId);
    expect(typeof plan.year).toBe("number");
  });

  it("returns the same plan for the same Student ID instead of a duplicate", async () => {
    const first = await (await requestPlan(studentId)).json();
    const second = await (await requestPlan(studentId)).json();
    expect(second.id).toBe(first.id);
  });

  it("gives a different Student ID its own plan", async () => {
    const mine = await (await requestPlan(studentId)).json();
    const theirs = await (await requestPlan(otherStudentId)).json();
    expect(theirs.id).not.toBe(mine.id);
  });

  it("rejects an empty Student ID", async () => {
    const res = await requestPlan("");
    expect(res.status).toBe(400);
  });
});
