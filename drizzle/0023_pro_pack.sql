CREATE TABLE IF NOT EXISTS `account_holds` (
  `id` int AUTO_INCREMENT NOT NULL,
  `accountId` int NOT NULL,
  `userId` int NOT NULL,
  `status` enum('active','released','converted') NOT NULL DEFAULT 'active',
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `account_holds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `account_holds_account_idx` ON `account_holds` (`accountId`);
