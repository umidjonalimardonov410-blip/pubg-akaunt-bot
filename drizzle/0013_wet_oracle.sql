CREATE TABLE `review_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`reporterId` int NOT NULL,
	`reason` varchar(255) NOT NULL,
	`status` enum('pending','dismissed','hidden') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `review_reports_id` PRIMARY KEY(`id`)
);
