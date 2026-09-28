CREATE TABLE `planned_courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`semester` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `semester_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "planned_courses_semester_check" CHECK("planned_courses"."semester" in (1, 2))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `planned_courses_plan_course_unique` ON `planned_courses` (`plan_id`,`course_id`);