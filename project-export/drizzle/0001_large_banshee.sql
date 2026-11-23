CREATE TABLE `attemptAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`textAnswer` text,
	`selectedOptionIds` json,
	`codeAnswer` text,
	`language` varchar(40),
	`fileAssetId` int,
	`savedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attemptAnswers_id` PRIMARY KEY(`id`),
	CONSTRAINT `answer_attempt_question_unique` UNIQUE(`attemptId`,`questionId`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(160) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidateProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`headline` varchar(180),
	`bio` text,
	`skills` json NOT NULL,
	`experience` json NOT NULL,
	`portfolioLinks` json NOT NULL,
	`avatarKey` varchar(500),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidateProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidateProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`description` text,
	`website` varchar(500),
	`industry` varchar(120),
	`logoKey` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `companyMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`memberRole` enum('owner','reviewer') NOT NULL DEFAULT 'owner',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `companyMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_member_unique` UNIQUE(`companyId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `fileAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`companyId` int,
	`attemptId` int,
	`category` enum('evidence','code_project','camera_recording','screen_recording','company_logo','candidate_avatar') NOT NULL,
	`storageKey` varchar(600) NOT NULL,
	`originalName` varchar(300) NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`byteSize` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fileAssets_id` PRIMARY KEY(`id`),
	CONSTRAINT `fileAssets_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('attempt_submitted','status_changed','review_ready') NOT NULL,
	`title` varchar(220) NOT NULL,
	`content` text NOT NULL,
	`readAt` timestamp,
	`emailStatus` enum('queued','not_configured','sent','failed') NOT NULL DEFAULT 'not_configured',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proctoringEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`eventType` enum('focus_lost','focus_returned','screen_stopped','camera_stopped','connection_lost','connection_restored') NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`detail` varchar(500),
	CONSTRAINT `proctoringEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proctoringSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`candidateId` int NOT NULL,
	`consentCamera` boolean NOT NULL DEFAULT false,
	`consentScreen` boolean NOT NULL DEFAULT false,
	`consentRecording` boolean NOT NULL DEFAULT false,
	`consentedAt` timestamp NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`cameraRecordingAssetId` int,
	`screenRecordingAssetId` int,
	CONSTRAINT `proctoringSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `proctoringSessions_attemptId_unique` UNIQUE(`attemptId`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`reviewerUserId` int NOT NULL,
	`score` int NOT NULL,
	`decision` enum('accepted','rejected','under review') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_attemptId_unique` UNIQUE(`attemptId`)
);
--> statement-breakpoint
CREATE TABLE `testAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`candidateId` int NOT NULL,
	`state` enum('in_progress','submitted') NOT NULL DEFAULT 'in_progress',
	`applicationStatus` enum('accepted','rejected','under review'),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`autoScore` int,
	`reviewerScore` int,
	`priorityScore` int NOT NULL DEFAULT 0,
	`integrityFlags` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testAttempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `attempt_candidate_test_unique` UNIQUE(`testId`,`candidateId`)
);
--> statement-breakpoint
CREATE TABLE `testQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionId` int NOT NULL,
	`type` enum('multiple_choice','essay','code','vulnerability','file_upload') NOT NULL,
	`prompt` text NOT NULL,
	`guidance` text,
	`points` int NOT NULL DEFAULT 10,
	`options` json,
	`correctAnswers` json,
	`evaluationGuide` text,
	`starterCode` text,
	`supportedLanguages` json,
	`sortOrder` int NOT NULL,
	CONSTRAINT `testQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testSections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`instructions` text,
	`sortOrder` int NOT NULL,
	CONSTRAINT `testSections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`summary` text NOT NULL,
	`field` varchar(120) NOT NULL,
	`level` enum('junior','mid','senior') NOT NULL,
	`durationMinutes` int NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`proctoringMode` enum('none','optional','required') NOT NULL DEFAULT 'optional',
	`attemptsAllowed` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('candidate','company','supervisor') NOT NULL DEFAULT 'candidate';