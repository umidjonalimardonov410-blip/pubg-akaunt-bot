CREATE TABLE IF NOT EXISTS `flash_sales` (
  `id` int AUTO_INCREMENT NOT NULL,
  `accountId` int NOT NULL,
  `originalPrice` decimal(12,2) NOT NULL,
  `salePrice` decimal(12,2) NOT NULL,
  `discountPercent` int NOT NULL,
  `dayKey` varchar(16) NOT NULL,
  `startsAt` timestamp NOT NULL,
  `endsAt` timestamp NOT NULL,
  `status` enum('active','ended','cancelled') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `flash_sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `flash_sales_day_idx` ON `flash_sales` (`dayKey`);
--> statement-breakpoint
CREATE INDEX `flash_sales_status_idx` ON `flash_sales` (`status`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mystery_box_opens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `dayKey` varchar(16) NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `prize` enum('account','promo','uc','empty') NOT NULL,
  `prizeLabel` varchar(255) NOT NULL,
  `rewardCode` varchar(64),
  `accountId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `mystery_box_opens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `mystery_box_opens_day_idx` ON `mystery_box_opens` (`dayKey`);
--> statement-breakpoint
CREATE INDEX `mystery_box_opens_user_idx` ON `mystery_box_opens` (`userId`);
