import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, uniqueIndex } from "drizzle-orm/mysql-core";

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
  profileBio: text("profileBio"),
  referralCode: varchar("referralCode", { length: 32 }),
  
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
  
  type: mysqlEnum("type", ["topup", "withdrawal", "order_payment", "order_refund", "seller_payout", "referral_reward"]).notNull(),
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

/**
 * Buyer watchlist / saved accounts.
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userAccountUnique: uniqueIndex("favorites_user_account_unique").on(table.userId, table.accountId),
}));

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Private buyer/seller thread attached to an account or order.
 */
export const chatThreads = mysqlTable("chat_threads", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId"),
  orderId: int("orderId"),
  buyerId: int("buyerId").notNull(),
  sellerId: int("sellerId").notNull(),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatThread = typeof chatThreads.$inferSelect;
export type InsertChatThread = typeof chatThreads.$inferInsert;

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  senderId: int("senderId").notNull(),
  body: text("body").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Admin audit logs for marketplace security and oversight.
 */
export const adminAuditLogs = mysqlTable("admin_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  targetType: varchar("targetType", { length: 64 }).notNull(),
  targetId: int("targetId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;

/**
 * Recently viewed accounts for quick comparison and buyer history.
 */
export const recentlyViewed = mysqlTable("recently_viewed", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});

export type RecentlyViewed = typeof recentlyViewed.$inferSelect;
export type InsertRecentlyViewed = typeof recentlyViewed.$inferInsert;

/**
 * Referral attribution and one-time reward ledger.
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredUserId: int("referredUserId").notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  rewardAmount: decimal("rewardAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["pending", "credited"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  creditedAt: timestamp("creditedAt"),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;
