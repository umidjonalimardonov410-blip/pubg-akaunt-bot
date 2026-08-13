ALTER TABLE `notifications` MODIFY COLUMN `type` enum('new_listing','order_status','review_received','dispute_alert','admin_message','price_drop') NOT NULL;--> statement-breakpoint
ALTER TABLE `favorites` ADD `initialPrice` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `favorites` ADD `priceDropAlerts` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `favorites` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;