CREATE TABLE `attemptQuestionSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`originalQuestionId` int NOT NULL,
	`sectionSnapshotId` int NOT NULL,
	`type` enum('multiple_choice','essay','code','vulnerability','file_upload') NOT NULL,
	`prompt` text NOT NULL,
	`guidance` text,
	`points` int NOT NULL,
	`options` json,
	`starterCode` text,
	`supportedLanguages` json,
	`sortOrder` int NOT NULL,
	CONSTRAINT `attemptQuestionSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attemptSectionSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`originalSectionId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`instructions` text,
	`sortOrder` int NOT NULL,
	CONSTRAINT `attemptSectionSnapshots_id` PRIMARY KEY(`id`)
);
