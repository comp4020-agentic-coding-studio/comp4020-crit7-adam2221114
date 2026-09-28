import type { APIRoute } from "astro";
import { addPlannedCourse, DuplicatePlannedCourseError, listPlannedCourses } from "../../../../../lib/db";

// The planned courses for one plan: list them, or add one to a semester.
// Scoped entirely by planId in the URL, so one student's plan can't affect
// another's.
export const GET: APIRoute = ({ params }) => {
  const planId = Number(params.planId);
  if (!Number.isInteger(planId)) {
    return Response.json({ error: "invalid plan id" }, { status: 400 });
  }
  return Response.json(listPlannedCourses(planId));
};

export const POST: APIRoute = async ({ params, request }) => {
  const planId = Number(params.planId);
  if (!Number.isInteger(planId)) {
    return Response.json({ error: "invalid plan id" }, { status: 400 });
  }

  const form = await request.formData();
  const courseId = Number(form.get("courseId"));
  const semester = Number(form.get("semester"));
  if (!Number.isInteger(courseId) || (semester !== 1 && semester !== 2)) {
    return Response.json(
      { error: "courseId and semester (1 or 2) are required" },
      { status: 400 },
    );
  }

  try {
    return Response.json(addPlannedCourse(planId, courseId, semester));
  } catch (err) {
    if (err instanceof DuplicatePlannedCourseError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
};
