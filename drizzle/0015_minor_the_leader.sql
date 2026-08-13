CREATE TABLE `deposit_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`receiptUrl` varchar(500),
	`receiptReference` varchar(255),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deposit_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD `telegramUsername` varchar(128);