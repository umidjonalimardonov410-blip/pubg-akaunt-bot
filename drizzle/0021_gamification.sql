ALTER TABLE `users` ADD COLUMN `xp` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `spinStreak` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `lastSpinAt` timestamp NULL;
