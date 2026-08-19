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
  phone: varchar("phone", { length: 32 }),
  languageCode: varchar("languageCode", { length: 8 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Marketplace fields
  walletBalance: decimal("walletBalance", { precision: 15, scale: 2 }).default("0").notNull(),
  sellerRating: decimal("sellerRating", { precision: 3, scale: 2 }).default("0").notNull(),
  totalSales: int("totalSales").default(0).notNull(),
  isVerifiedSeller: boolean("isVerifiedSeller").default(false).notNull(),
  sellerBadge: mysqlEnum("sellerBadge", ["none", "trusted", "elite", "legendary"]).default("none").notNull(),
  twoFactorSecret: varchar("twoFactorSecret", { length: 64 }),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  profileBio: text("profileBio"),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  referralCode: varchar("referralCode", { length: 32 }),
  alertPreferences: text("alertPreferences"),
  themePreference: mysqlEnum("themePreference", ["dark", "neon", "gamer"]).default("dark").notNull(),
  
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
  hasConquerorHistory: boolean("hasConquerorHistory").default(false).notNull(),
  hasXSuit: boolean("hasXSuit").default(false).notNull(),
  accountCreatedYear: int("accountCreatedYear").default(2024).notNull(),
  
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
  viewCount: int("viewCount").default(0).notNull(),
  
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
  
  // Fulfillment tracking (kutilmoqda / yaratilmoqda / yuborildi)
  fulfillmentStatus: mysqlEnum("fulfillmentStatus", ["waiting", "preparing", "delivered"]).default("waiting").notNull(),
  fulfillmentNote: text("fulfillmentNote"),
  deliveredAt: timestamp("deliveredAt"),

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
  moderationStatus: mysqlEnum("moderationStatus", ["published", "hidden"]).default("published").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * User reports and admin moderation decisions for reviews.
 */
export const reviewReports = mysqlTable("review_reports", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  reporterId: int("reporterId").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "dismissed", "hidden"]).default("pending").notNull(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type ReviewReport = typeof reviewReports.$inferSelect;
export type InsertReviewReport = typeof reviewReports.$inferInsert;

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
  
  type: mysqlEnum("type", ["new_listing", "order_status", "review_received", "dispute_alert", "admin_message", "price_drop", "auction_ending", "dispute_update"]).notNull(),
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
 * Price-drop watchlist: a buyer tracks an account and gets alerted when the
 * seller lowers the price (optionally below a target price).
 */
export const priceWatches = mysqlTable("price_watches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  targetPrice: decimal("targetPrice", { precision: 12, scale: 2 }),
  lastNotifiedPrice: decimal("lastNotifiedPrice", { precision: 12, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userAccountUnique: uniqueIndex("price_watches_user_account_unique").on(table.userId, table.accountId),
}));

export type PriceWatch = typeof priceWatches.$inferSelect;
export type InsertPriceWatch = typeof priceWatches.$inferInsert;

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

/**
 * Price negotiations and counter-offers between buyers and sellers.
 */
export const negotiations = mysqlTable("negotiations", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  buyerId: int("buyerId").notNull(),
  sellerId: int("sellerId").notNull(),
  offeredPrice: decimal("offeredPrice", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "countered", "accepted", "rejected"]).default("pending").notNull(),
  counterPrice: decimal("counterPrice", { precision: 15, scale: 2 }),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Negotiation = typeof negotiations.$inferSelect;
export type InsertNegotiation = typeof negotiations.$inferInsert;

/**
 * Live auctions for rare and premium PUBG Mobile accounts.
 */
export const auctions = mysqlTable("auctions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  startingBid: decimal("startingBid", { precision: 15, scale: 2 }).notNull(),
  currentBid: decimal("currentBid", { precision: 15, scale: 2 }).notNull(),
  highestBidderId: int("highestBidderId"),
  status: mysqlEnum("status", ["active", "ended", "cancelled"]).default("active").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Auction = typeof auctions.$inferSelect;
export type InsertAuction = typeof auctions.$inferInsert;

export const auctionBids = mysqlTable("auction_bids", {
  id: int("id").autoincrement().primaryKey(),
  auctionId: int("auctionId").notNull(),
  bidderId: int("bidderId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuctionBid = typeof auctionBids.$inferSelect;
export type InsertAuctionBid = typeof auctionBids.$inferInsert;

/**
 * Promo codes and discounts for marketplace orders.
 */
export const promoCodes = mysqlTable("promo_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  discountPercent: int("discountPercent").default(0).notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  maxUses: int("maxUses").default(100).notNull(),
  usedCount: int("usedCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;

/**
 * Support tickets for buyer and seller assistance.
 */
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  adminReply: text("adminReply"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

/**
 * Seller verification requests and trust badges.
 */
export const sellerVerifications = mysqlTable("seller_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  fullName: varchar("fullName", { length: 128 }).notNull(),
  telegramUsername: varchar("telegramUsername", { length: 64 }).notNull(),
  idCardPhotoUrl: text("idCardPhotoUrl").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SellerVerification = typeof sellerVerifications.$inferSelect;
export type InsertSellerVerification = typeof sellerVerifications.$inferInsert;

/**
 * Premium listing promotions and ad placements.
 */
export const premiumPromotions = mysqlTable("premium_promotions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  userId: int("userId").notNull(),
  durationDays: int("durationDays").notNull(),
  cost: decimal("cost", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["active", "expired"]).default("active").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PremiumPromotion = typeof premiumPromotions.$inferSelect;
export type InsertPremiumPromotion = typeof premiumPromotions.$inferInsert;


/**
 * Threaded support conversation messages for user/admin live help.
 */
export const supportTicketMessages = mysqlTable("support_ticket_messages", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  authorId: int("authorId").notNull(),
  authorRole: mysqlEnum("authorRole", ["user", "admin"]).default("user").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertSupportTicketMessage = typeof supportTicketMessages.$inferInsert;

/**
 * Immutable seller badge decisions for trust history and admin accountability.
 */
export const sellerBadgeAudits = mysqlTable("seller_badge_audits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  adminId: int("adminId").notNull(),
  previousBadge: mysqlEnum("previousBadge", ["none", "trusted", "elite", "legendary"]).notNull(),
  nextBadge: mysqlEnum("nextBadge", ["none", "trusted", "elite", "legendary"]).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SellerBadgeAudit = typeof sellerBadgeAudits.$inferSelect;
export type InsertSellerBadgeAudit = typeof sellerBadgeAudits.$inferInsert;


/**
 * Saved heuristic/AI-style account price estimates for seller history.
 */
export const priceEstimates = mysqlTable("price_estimates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  level: int("level").notNull(),
  kd: decimal("kd", { precision: 8, scale: 2 }).notNull(),
  skinsCount: int("skinsCount").notNull(),
  hasM416Glacier: boolean("hasM416Glacier").default(false).notNull(),
  hasXSuit: boolean("hasXSuit").default(false).notNull(),
  minPrice: decimal("minPrice", { precision: 15, scale: 2 }).notNull(),
  recommended: decimal("recommended", { precision: 15, scale: 2 }).notNull(),
  maxPrice: decimal("maxPrice", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriceEstimate = typeof priceEstimates.$inferSelect;
export type InsertPriceEstimate = typeof priceEstimates.$inferInsert;

/**
 * Admin-configurable multipliers for transparent price estimation.
 */
export const priceEvaluationRules = mysqlTable("price_evaluation_rules", {
  id: int("id").autoincrement().primaryKey(),
  ruleKey: varchar("ruleKey", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 160 }).notNull(),
  multiplier: decimal("multiplier", { precision: 8, scale: 4 }).notNull(),
  flatAmount: decimal("flatAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PriceEvaluationRule = typeof priceEvaluationRules.$inferSelect;
export type InsertPriceEvaluationRule = typeof priceEvaluationRules.$inferInsert;

/**
 * Security events and anti-fraud review signals. No raw passwords are stored.
 */
export const securityAudits = mysqlTable("security_audits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  riskScore: int("riskScore").default(0).notNull(),
  details: text("details"),
  ipHash: varchar("ipHash", { length: 128 }),
  deviceHash: varchar("deviceHash", { length: 128 }),
  sessionHash: varchar("sessionHash", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SecurityAudit = typeof securityAudits.$inferSelect;
export type InsertSecurityAudit = typeof securityAudits.$inferInsert;


/**
 * Manual wallet top-up receipts awaiting admin verification.
 * Receipt bytes live in S3; this table stores only metadata and review state.
 */
export const depositReceipts = mysqlTable("deposit_receipts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  receiptKey: varchar("receiptKey", { length: 500 }).notNull(),
  receiptUrl: varchar("receiptUrl", { length: 700 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  transactionId: int("transactionId"),
  reviewedBy: int("reviewedBy"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type DepositReceipt = typeof depositReceipts.$inferSelect;
export type InsertDepositReceipt = typeof depositReceipts.$inferInsert;


/**
 * Marketplace categories managed from the admin panel.
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 96 }).notNull(),
  emoji: varchar("emoji", { length: 16 }),
  description: varchar("description", { length: 255 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Every uploaded image/video goes through admin moderation before it is public.
 */
export const mediaUploads = mysqlTable("media_uploads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId"),
  url: varchar("url", { length: 500 }).notNull(),
  kind: mysqlEnum("kind", ["image", "video"]).default("image").notNull(),
  contentType: varchar("contentType", { length: 64 }).notNull(),
  sizeBytes: int("sizeBytes").default(0).notNull(),
  originalSizeBytes: int("originalSizeBytes").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewNote: varchar("reviewNote", { length: 255 }),
  reviewedBy: int("reviewedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MediaUpload = typeof mediaUploads.$inferSelect;
export type InsertMediaUpload = typeof mediaUploads.$inferInsert;

/**
 * FAQ entries shown both in the Mini App and inside the Telegram bot.
 */
export const faqItems = mysqlTable("faq_items", {
  id: int("id").autoincrement().primaryKey(),
  question: varchar("question", { length: 255 }).notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 64 }).default("umumiy").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FaqItem = typeof faqItems.$inferSelect;
export type InsertFaqItem = typeof faqItems.$inferInsert;

/**
 * Admin panelda tahrirlanadigan UI tarjimalari (UZ/RU/EN override).
 */
export const phraseOverrides = mysqlTable("phrase_overrides", {
  id: int("id").autoincrement().primaryKey(),
  phraseKey: varchar("phraseKey", { length: 255 }).notNull().unique(),
  uz: text("uz"),
  ru: text("ru"),
  en: text("en"),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhraseOverride = typeof phraseOverrides.$inferSelect;
