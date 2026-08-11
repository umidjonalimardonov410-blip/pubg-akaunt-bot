CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`senderId` int NOT NULL,
	`body` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int,
	`orderId` int,
	`buyerId` int NOT NULL,
	`sellerId` int NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `favorites_user_account_unique` UNIQUE(`userId`,`accountId`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`rewardAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`status` enum('pending','credited') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`creditedAt` timestamp,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `type` enum('topup','withdrawal','order_payment','order_refund','seller_payout','referral_reward') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `profileBio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(32);