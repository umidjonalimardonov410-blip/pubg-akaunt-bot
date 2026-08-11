import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with marketplace-specific fields.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Marketplace fields
  walletBalance: decimal("walletBalance", { precision: 15, scale: 2 }).default("0").notNull(),
  sellerRating: decimal("sellerRating", { precision: 3, scale: 2 }).default("0").notNull(),
  totalSales: int("totalSales").default(0).notNull(),
  isVerifiedSeller: boolean("isVerifiedSeller").default(false).notNull(),
  sellerBadge: mysqlEnum("sellerBadge", ["none", "trusted", "elite", "legendary"]).default("none").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * PUBG Accounts for sale
 */
export const pubgAccounts = mysqlTable("pubg_accounts", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  
  // Account info
  accountId: varchar("accountId", { length: 100 }).notNull(),
  playerName: varchar("playerName", { length: 100 }).notNull(),
  level: int("level").notNull(),
  region: varchar("region", { length: 50 }).notNull(),
  
  // Stats
  kdRatio: decimal("kdRatio", { precision: 5, scale: 2 }).notNull(),
  winRate: decimal("winRate", { precision: 5, scale: 2 }).notNull(),
  totalMatches: int("totalMatches").notNull(),
  headshotPercentage: decimal("headshotPercentage", { precision: 5, scale: 2 }).notNull(),
  
  // Inventory
  ucBalance: int("ucBalance").notNull(),
  outfitCount: int("outfitCount").notNull(),
  gunSkinCount: int("gunSkinCount").notNull(),
  vehicleCount: int("vehicleCount").notNull(),
  
  // Featured skins (JSON array of skin names)
  featuredSkins: json("featuredSkins").$type<string[]>().default([]).notNull(),
  
  // Pricing and status
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["available", "sold", "pending_verification", "delisted"]).default("available").notNull(),
  
  // Media
  thumbnailUrl: varchar("thumbnailUrl", { length: 500 }),
  galleryUrls: json("galleryUrls").$type<string[]>().default([]).notNull(),
  videoUrl: varchar("videoUrl", { length: 500 }),
  
  // Verification
  isVerified: boolean("isVerified").default(false).notNull(),
  verificationNotes: text("verificationNotes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PubgAccount = typeof pubgAccounts.$inferSelect;
export type InsertPubgAccount = typeof pubgAccounts.$inferInsert;

/**
 * Orders and trades
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  buyerId: int("buyerId").notNull(),
  sellerId: int("sellerId").notNull(),
  
  // Pricing
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  
  // Escrow status
  status: mysqlEnum("status", ["pending", "in_escrow", "completed", "cancelled", "disputed"]).default("pending").notNull(),
  escrowStage: mysqlEnum("escrowStage", ["payment_frozen", "account_verification", "buyer_confirmation"]).default("payment_frozen"),
  
  // Verification
  isAccountVerified: boolean("isAccountVerified").default(false).notNull(),
  verificationNotes: text("verificationNotes"),
  
  // Buyer confirmation
  buyerConfirmed: boolean("buyerConfirmed").default(false).notNull(),
  buyerConfirmedAt: timestamp("buyerConfirmedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Ratings and reviews
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  sellerId: int("sellerId").notNull(),
  
  // Rating
  rating: int("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Wallet transactions
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  type: mysqlEnum("type", ["topup", "withdrawal", "order_payment", "order_refund", "seller_payout"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  
  // Reference
  orderId: int("orderId"),
  description: varchar("description", { length: 255 }),
  
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  type: mysqlEnum("type", ["new_listing", "order_status", "review_received", "dispute_alert", "admin_message"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // Reference
  accountId: int("accountId"),
  orderId: int("orderId"),
  
  isRead: boolean("isRead").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Disputes
 */
export const disputes = mysqlTable("disputes", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  reportedBy: int("reportedBy").notNull(),
  
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  
  status: mysqlEnum("status", ["open", "under_review", "resolved", "closed"]).default("open").notNull(),
  resolution: text("resolution"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = typeof disputes.$inferInsert;
