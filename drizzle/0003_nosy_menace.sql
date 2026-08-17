CREATE TABLE `codeReviewComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`attemptAnswerId` int NOT NULL,
	`reviewerUserId` int NOT NULL,
	`lineNumber` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `codeReviewComments_id` PRIMARY KEY(`id`)
);
