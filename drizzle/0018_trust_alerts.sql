CREATE TABLE `price_watches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`targetPrice` decimal(12,2),
	`lastNotifiedPrice` decimal(12,2),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_watches_id` PRIMARY KEY(`id`),
	CONSTRAINT `price_watches_user_account_unique` UNIQUE(`userId`,`accountId`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('new_listing','order_status','review_received','dispute_alert','admin_message','price_drop','auction_ending','dispute_update') NOT NULL;
