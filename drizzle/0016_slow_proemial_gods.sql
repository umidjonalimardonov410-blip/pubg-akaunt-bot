CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(96) NOT NULL,
	`emoji` varchar(16),
	`description` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `faq_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` varchar(255) NOT NULL,
	`answer` text NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'umumiy',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `faq_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int,
	`url` varchar(500) NOT NULL,
	`kind` enum('image','video') NOT NULL DEFAULT 'image',
	`contentType` varchar(64) NOT NULL,
	`sizeBytes` int NOT NULL DEFAULT 0,
	`originalSizeBytes` int NOT NULL DEFAULT 0,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewNote` varchar(255),
	`reviewedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `fulfillmentStatus` enum('waiting','preparing','delivered') DEFAULT 'waiting' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `fulfillmentNote` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveredAt` timestamp;
--> statement-breakpoint
INSERT INTO `categories` (`slug`, `name`, `emoji`, `description`, `sortOrder`) VALUES
	('conqueror', 'Conqueror', '👑', 'Conqueror tarixi bor eng kuchli akkauntlar', 1),
	('xsuit', 'X-Suit', '🥷', 'X-Suit va mifik to''plamli akkauntlar', 2),
	('mythic', 'Mifik skin', '🔥', 'Mifik qurol skinlariga boy akkauntlar', 3),
	('budget', 'Arzon', '💸', 'Boshlovchilar uchun hamyonbop akkauntlar', 4),
	('classic', 'Klassik', '🎯', 'Barqaror statistikali oddiy akkauntlar', 5);
--> statement-breakpoint
INSERT INTO `faq_items` (`question`, `answer`, `category`, `sortOrder`) VALUES
	('Akkaunt sotib olsam pulim qanday himoyalanadi?', 'To''lov darhol sotuvchiga o''tmaydi. Mablag'' escrow hisobida muzlatiladi va siz akkauntni tekshirib tasdiqlaganingizdan keyin sotuvchiga o''tkaziladi.', 'to''lov', 1),
	('Buyurtma holatlari nimani anglatadi?', 'Kutilmoqda — to''lov muzlatildi. Yaratilmoqda — sotuvchi akkauntni tayyorlayapti. Yuborildi — login yuborildi, tekshirib tasdiqlang.', 'buyurtma', 2),
	('Qanday fayl yuklay olaman?', 'Rasm: JPG, PNG, WEBP. Video: MP4, WEBM, MOV. Bitta fayl 200 MB gacha. Rasmlar avtomatik siqiladi.', 'media', 3),
	('Nega yuklagan rasmim darhol ko''rinmayapti?', 'Har bir media admin moderatsiyasidan o''tadi. Tasdiqlangach e''londa avtomatik ko''rinadi.', 'media', 4),
	('Sotuvchi aloqaga chiqmasa nima qilaman?', 'Support bo''limidan ticket yuboring yoki nizo oching. Admin 24 soat ichida ko''rib chiqadi.', 'xavfsizlik', 5);
