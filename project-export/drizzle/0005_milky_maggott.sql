CREATE TABLE `comparisonFilterTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`jobTitle` varchar(180),
	`questionType` enum('multiple_choice','essay','code','vulnerability','file_upload'),
	`submittedFrom` timestamp,
	`submittedTo` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comparisonFilterTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('attempt_submitted','status_changed','review_ready','feedback_published') NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `notificationKey` varchar(220);--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_notificationKey_unique` UNIQUE(`notificationKey`);