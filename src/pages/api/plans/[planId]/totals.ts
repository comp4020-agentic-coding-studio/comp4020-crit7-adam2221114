import type { APIRoute } from "astro";
import { getSemesterTotals } from "../../../../lib/db";

// Total planned units per semester, derived fresh from planned_courses +
// courses on every request — nothing is stored.
export const GET: APIRoute = ({ params }) => {
  const planId = Number(params.planId);
  if (!Number.isInteger(planId)) {
    return Response.json({ error: "invalid plan id" }, { status: 400 });
  }
  return Response.json(getSemesterTotals(planId));
};
