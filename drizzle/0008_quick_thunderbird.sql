CREATE TABLE `price_evaluation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleKey` varchar(64) NOT NULL,
	`label` varchar(160) NOT NULL,
	`multiplier` decimal(8,4) NOT NULL,
	`flatAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `price_evaluation_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `price_evaluation_rules_ruleKey_unique` UNIQUE(`ruleKey`)
);
--> statement-breakpoint
ALTER TABLE `security_audits` ADD `ipHash` varchar(128);--> statement-breakpoint
ALTER TABLE `security_audits` ADD `deviceHash` varchar(128);--> statement-breakpoint
ALTER TABLE `security_audits` ADD `sessionHash` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorSecret` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorEnabled` boolean DEFAULT false NOT NULL;