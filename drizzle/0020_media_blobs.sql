CREATE TABLE IF NOT EXISTS `media_blobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`byteSize` int NOT NULL DEFAULT 0,
	`data` longblob NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_blobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_blobs_storageKey_unique` UNIQUE(`storageKey`)
);
