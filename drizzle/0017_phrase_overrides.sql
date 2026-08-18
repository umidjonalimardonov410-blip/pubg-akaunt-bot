CREATE TABLE `phrase_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phraseKey` varchar(255) NOT NULL,
	`uz` text,
	`ru` text,
	`en` text,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phrase_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `phrase_overrides_phraseKey_unique` UNIQUE(`phraseKey`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `themePreference` enum('dark','neon','gamer') DEFAULT 'dark' NOT NULL;