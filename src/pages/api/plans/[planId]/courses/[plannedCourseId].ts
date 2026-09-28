import type { APIRoute } from "astro";
import { removePlannedCourse } from "../../../../../lib/db";

// Removes one planned course from one plan. Scoped by both ids in the URL,
// so a request naming another student's plan id has no effect.
export const DELETE: APIRoute = ({ params }) => {
  const planId = Number(params.planId);
  const plannedCourseId = Number(params.plannedCourseId);
  if (!Number.isInteger(planId) || !Number.isInteger(plannedCourseId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const removed = removePlannedCourse(planId, plannedCourseId);
  return removed
    ? new Response(null, { status: 204 })
    : Response.json({ error: "not found" }, { status: 404 });
};
