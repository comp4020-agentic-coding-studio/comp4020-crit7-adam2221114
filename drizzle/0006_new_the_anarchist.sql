CREATE TABLE `previously_completed_courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `semester_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `previously_completed_courses_plan_course_unique` ON `previously_completed_courses` (`plan_id`,`course_id`);--> statement-breakpoint
ALTER TABLE `course_prerequisites` ADD `group_id` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `requisite_text` text;