import type { APIRoute } from "astro";
import { getOrCreatePlan } from "../../lib/db";

// Given a Student ID, return its existing plan or create one. Student ID is
// a plain identifier for this prototype, not authentication — no password,
// no session.
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const studentId = String(form.get("studentId") ?? "").trim();
  if (!studentId) {
    return Response.json({ error: "studentId is required" }, { status: 400 });
  }
  return Response.json(getOrCreatePlan(studentId.slice(0, 100)));
};
