import type { APIRoute } from "astro";
import {
  CourseAlreadyPlannedError,
  DuplicateCompletedCourseError,
  listPreviouslyCompleted,
  markPreviouslyCompleted,
} from "../../../../../lib/db";

// The previously-completed courses for one plan: list them, or mark one.
// Scoped entirely by planId in the URL, so one student's plan can't affect
// another's.
export const GET: APIRoute = ({ params }) => {
  const planId = Number(params.planId);
  if (!Number.isInteger(planId)) {
    return Response.json({ error: "invalid plan id" }, { status: 400 });
  }
  return Response.json(listPreviouslyCompleted(planId));
};

export const POST: APIRoute = async ({ params, request }) => {
  const planId = Number(params.planId);
  if (!Number.isInteger(planId)) {
    return Response.json({ error: "invalid plan id" }, { status: 400 });
  }

  const form = await request.formData();
  const courseId = Number(form.get("courseId"));
  if (!Number.isInteger(courseId)) {
    return Response.json({ error: "courseId is required" }, { status: 400 });
  }

  try {
    return Response.json(markPreviouslyCompleted(planId, courseId));
  } catch (err) {
    if (err instanceof DuplicateCompletedCourseError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof CourseAlreadyPlannedError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
};
