ALTER TABLE `users` ADD COLUMN `aimBestScore` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `aimPlayedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `aimPromoCode` varchar(32) NULL;
