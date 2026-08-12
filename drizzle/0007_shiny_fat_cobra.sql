CREATE TABLE `price_estimates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`level` int NOT NULL,
	`kd` decimal(8,2) NOT NULL,
	`skinsCount` int NOT NULL,
	`hasM416Glacier` boolean NOT NULL DEFAULT false,
	`hasXSuit` boolean NOT NULL DEFAULT false,
	`minPrice` decimal(15,2) NOT NULL,
	`recommended` decimal(15,2) NOT NULL,
	`maxPrice` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_estimates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`riskScore` int NOT NULL DEFAULT 0,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_audits_id` PRIMARY KEY(`id`)
);
