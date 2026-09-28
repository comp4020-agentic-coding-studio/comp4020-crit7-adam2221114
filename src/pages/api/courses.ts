import type { APIRoute } from "astro";
import { listCourses } from "../../lib/db";

// Read-only: the demonstration course catalogue, seeded at boot.
export const GET: APIRoute = () => Response.json(listCourses());
