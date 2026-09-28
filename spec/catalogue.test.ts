import { describe, expect, inject, it } from "vitest";

// Phase 2 of the ANU Semester Planner: a small, read-only demonstration
// catalogue is seeded at boot and retrievable over HTTP. No writes here —
// adding a course to a plan is a later phase.
const baseUrl = inject("baseUrl");

describe("course catalogue", () => {
  it("serves the seeded catalogue", async () => {
    const res = await fetch(new URL("/api/courses", baseUrl));
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.length).toBeLessThanOrEqual(12);
  });

  it("gives each course a code, name, units, and offered semester", async () => {
    const res = await fetch(new URL("/api/courses", baseUrl));
    const list = await res.json();
    for (const course of list) {
      expect(typeof course.code).toBe("string");
      expect(course.code.length).toBeGreaterThan(0);
      expect(typeof course.name).toBe("string");
      expect(typeof course.units).toBe("number");
      expect(["1", "2", "Both"]).toContain(course.offeredSemester);
    }
  });

  it("has unique course codes", async () => {
    const res = await fetch(new URL("/api/courses", baseUrl));
    const list = await res.json();
    const codes = list.map((course: { code: string }) => course.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("returns the same catalogue on a second request", async () => {
    const first = await (await fetch(new URL("/api/courses", baseUrl))).json();
    const second = await (await fetch(new URL("/api/courses", baseUrl))).json();
    expect(second).toEqual(first);
  });
});
