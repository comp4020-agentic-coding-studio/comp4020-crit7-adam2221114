import type { APIRoute } from "astro";
import { unmarkPreviouslyCompleted } from "../../../../../lib/db";

// Unmarks one previously-completed course from one plan. Scoped by both ids
// in the URL, so a request naming another student's plan id has no effect.
export const DELETE: APIRoute = ({ params }) => {
  const planId = Number(params.planId);
  const completedId = Number(params.completedId);
  if (!Number.isInteger(planId) || !Number.isInteger(completedId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const removed = unmarkPreviouslyCompleted(planId, completedId);
  return removed
    ? new Response(null, { status: 204 })
    : Response.json({ error: "not found" }, { status: 404 });
};
