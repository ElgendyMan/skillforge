CREATE TABLE `candidateAnnotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`candidateId` int NOT NULL,
	`note` text NOT NULL,
	`tags` json NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidateAnnotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_annotation_company_candidate_unique` UNIQUE(`companyId`,`candidateId`)
);
