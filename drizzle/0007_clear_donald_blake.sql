CREATE TABLE `accommodations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`attemptId` int,
	`type` enum('extra_time','no_camera','screen_reader','keyboard_only','text_scaling','high_contrast','language_support','other') NOT NULL,
	`details` text,
	`status` enum('requested','approved','denied','fulfilled') NOT NULL DEFAULT 'requested',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accommodations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appeals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`candidateId` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('open','in_review','resolved','withdrawn') NOT NULL DEFAULT 'open',
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appeals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `testAttempts` MODIFY COLUMN `state` enum('in_progress','paused_for_technical_issue','submitted','expired','under_review') NOT NULL DEFAULT 'in_progress';--> statement-breakpoint
ALTER TABLE `fileAssets` ADD `sha256` varchar(64);--> statement-breakpoint
ALTER TABLE `fileAssets` ADD `securityStatus` enum('pending','available','quarantined','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `fileAssets` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `reviews` ADD `reviewStatus` enum('pending','in_review','needs_second_review','completed') DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `rationale` text;--> statement-breakpoint
ALTER TABLE `reviews` ADD `evidenceReference` text;--> statement-breakpoint
ALTER TABLE `testAttempts` ADD `graceEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `testAttempts` ADD `technicalIssueReason` text;--> statement-breakpoint
ALTER TABLE `testAttempts` ADD `testVersion` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `testQuestions` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `testQuestions` ADD `isRetired` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tests` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tests` ADD `immutable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tests` ADD `publishedAt` timestamp;