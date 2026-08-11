CREATE TABLE `disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`reportedBy` int NOT NULL,
	`reason` varchar(255) NOT NULL,
	`description` text,
	`status` enum('open','under_review','resolved','closed') NOT NULL DEFAULT 'open',
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('new_listing','order_status','review_received','dispute_alert','admin_message') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`accountId` int,
	`orderId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`buyerId` int NOT NULL,
	`sellerId` int NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`status` enum('pending','in_escrow','completed','cancelled','disputed') NOT NULL DEFAULT 'pending',
	`escrowStage` enum('payment_frozen','account_verification','buyer_confirmation') DEFAULT 'payment_frozen',
	`isAccountVerified` boolean NOT NULL DEFAULT false,
	`verificationNotes` text,
	`buyerConfirmed` boolean NOT NULL DEFAULT false,
	`buyerConfirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pubg_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`accountId` varchar(100) NOT NULL,
	`playerName` varchar(100) NOT NULL,
	`level` int NOT NULL,
	`region` varchar(50) NOT NULL,
	`kdRatio` decimal(5,2) NOT NULL,
	`winRate` decimal(5,2) NOT NULL,
	`totalMatches` int NOT NULL,
	`headshotPercentage` decimal(5,2) NOT NULL,
	`ucBalance` int NOT NULL,
	`outfitCount` int NOT NULL,
	`gunSkinCount` int NOT NULL,
	`vehicleCount` int NOT NULL,
	`featuredSkins` json NOT NULL DEFAULT ('[]'),
	`price` decimal(12,2) NOT NULL,
	`description` text,
	`status` enum('available','sold','pending_verification','delisted') NOT NULL DEFAULT 'available',
	`thumbnailUrl` varchar(500),
	`galleryUrls` json NOT NULL DEFAULT ('[]'),
	`videoUrl` varchar(500),
	`isVerified` boolean NOT NULL DEFAULT false,
	`verificationNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pubg_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`sellerId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('topup','withdrawal','order_payment','order_refund','seller_payout') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`orderId` int,
	`description` varchar(255),
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `walletBalance` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `sellerRating` decimal(3,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totalSales` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isVerifiedSeller` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `sellerBadge` enum('none','trusted','elite','legendary') DEFAULT 'none' NOT NULL;