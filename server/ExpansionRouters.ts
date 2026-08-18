import { z } from "zod";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb, getInsertId, getOrderById, getPubgAccountById, getUserById } from "./db";
import { auctions, chatThreads, disputes, notifications, orders, priceWatches, pubgAccounts, referrals, reviews, transactions, users } from "../drizzle/schema";
import { formatAuctionCountdown, parseAlertPreferences, pushNotification } from "./notificationService";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { getTelegramDeliveryStatus, sendTelegramNotification } from "./telegramNotifications";

const providerStatus = {
  wallet: { key: "wallet", label: "Inferno Wallet", status: "active", description: "Ichki balans orqali escrow to‘lovi." },
  click: { key: "click", label: "Click", status: "setup_required", description: "Click merchant ma’lumotlari kiritilgach ishga tushadi." },
  payme: { key: "payme", label: "Payme", status: "setup_required", description: "Payme biznes tokeni kiritilgach ishga tushadi." },
} as const;

export const expansionRouter = router({
  trust: router({
    profile: publicProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const seller = await getUserById(input.userId);
      if (!seller) throw new TRPCError({ code: "NOT_FOUND", message: "Sotuvchi topilmadi" });
      const sellerOrders = await db.select().from(orders).where(eq(orders.sellerId, input.userId));
      const sellerReviews = await db.select().from(reviews).where(eq(reviews.sellerId, input.userId));
      const completed = sellerOrders.filter(order => order.status === "completed");
      const responseTimes = sellerOrders.length ? Math.max(1, Math.round(100 - Math.min(sellerOrders.length * 2, 35))) : 0;
      const rating = sellerReviews.length ? sellerReviews.reduce((sum, row) => sum + Number(row.rating), 0) / sellerReviews.length : Number(seller.sellerRating ?? 0);
      const badge = seller.sellerBadge === "none" ? "Yangi sotuvchi" : seller.sellerBadge === "trusted" ? "Tasdiqlangan sotuvchi" : seller.sellerBadge === "elite" ? "Elite sotuvchi" : "Legendary sotuvchi";
      return {
        userId: seller.id,
        name: seller.name || "Inferno sotuvchisi",
        bio: seller.profileBio || "",
        badge,
        badgeKey: seller.sellerBadge,
        verified: Boolean(seller.isVerifiedSeller),
        totalSales: completed.length,
        activeListings: (await db.select().from(pubgAccounts).where(and(eq(pubgAccounts.sellerId, input.userId), eq(pubgAccounts.status, "available")))).length,
        rating: Number(rating.toFixed(2)),
        reviewCount: sellerReviews.length,
        responseRate: responseTimes,
        memberSince: seller.createdAt,
        trustSignals: [
          { label: "Escrow himoyasi", value: true },
          { label: "Sotuvchi verifikatsiyasi", value: Boolean(seller.isVerifiedSeller) },
          { label: "Real yakunlangan savdolar", value: completed.length > 0 },
          { label: "2FA himoyasi", value: Boolean(seller.twoFactorEnabled) },
        ],
        recentReviews: sellerReviews
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(row => ({ id: row.id, rating: Number(row.rating), comment: row.comment ?? "", createdAt: row.createdAt })),
      };
    }),

    /** Compact trust data for marketplace cards / listing details. */
    summary: publicProcedure.input(z.object({ userIds: z.array(z.number().int().positive()).min(1).max(60) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const ids = Array.from(new Set<number>(input.userIds));
      const [sellerRows, reviewRows, orderRows] = await Promise.all([
        db.select().from(users).where(inArray(users.id, ids)),
        db.select().from(reviews).where(inArray(reviews.sellerId, ids)),
        db.select().from(orders).where(inArray(orders.sellerId, ids)),
      ]);
      return sellerRows.map(seller => {
        const sellerReviews = reviewRows.filter(row => row.sellerId === seller.id);
        const completed = orderRows.filter(row => row.sellerId === seller.id && row.status === "completed");
        const rating = sellerReviews.length
          ? sellerReviews.reduce((sum, row) => sum + Number(row.rating), 0) / sellerReviews.length
          : Number(seller.sellerRating ?? 0);
        return {
          userId: seller.id,
          name: seller.name || "Inferno sotuvchisi",
          verified: Boolean(seller.isVerifiedSeller),
          badgeKey: seller.sellerBadge,
          rating: Number(rating.toFixed(2)),
          reviewCount: sellerReviews.length,
          totalSales: completed.length,
        };
      });
    }),

    /** Public seller leaderboard: best rated, most completed sales. */
    leaderboard: publicProcedure.input(z.object({ limit: z.number().int().min(3).max(25).optional().default(10) }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const limit = input?.limit ?? 10;
      const [sellerRows, reviewRows, orderRows] = await Promise.all([
        db.select().from(users),
        db.select().from(reviews),
        db.select().from(orders),
      ]);
      return sellerRows
        .map(seller => {
          const sellerReviews = reviewRows.filter(row => row.sellerId === seller.id);
          const completed = orderRows.filter(row => row.sellerId === seller.id && row.status === "completed");
          const rating = sellerReviews.length
            ? sellerReviews.reduce((sum, row) => sum + Number(row.rating), 0) / sellerReviews.length
            : Number(seller.sellerRating ?? 0);
          return {
            userId: seller.id,
            name: seller.name || `Sotuvchi #${seller.id}`,
            verified: Boolean(seller.isVerifiedSeller),
            badgeKey: seller.sellerBadge,
            rating: Number(rating.toFixed(2)),
            reviewCount: sellerReviews.length,
            totalSales: completed.length,
            revenue: completed.reduce((sum, row) => sum + Number(row.price), 0),
          };
        })
        .filter(seller => seller.totalSales > 0 || seller.reviewCount > 0)
        .sort((a, b) => b.totalSales - a.totalSales || b.rating - a.rating)
        .slice(0, limit);
    }),
  }),

  disputes: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(disputes).where(eq(disputes.reportedBy, ctx.user.id)).orderBy(desc(disputes.createdAt));
      return rows;
    }),
    getByOrder: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (![order.buyerId, order.sellerId].includes(ctx.user.id) && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const row = await db.select().from(disputes).where(eq(disputes.orderId, input.orderId)).orderBy(desc(disputes.createdAt)).limit(1);
      return row[0] ?? null;
    }),
    create: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), reason: z.string().min(3).max(255), description: z.string().min(10).max(4000), evidenceUrls: z.array(z.string().url()).max(8).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Buyurtma topilmadi" });
      if (![order.buyerId, order.sellerId].includes(ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
      if (["completed", "cancelled"].includes(order.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Yakunlangan savdo bo‘yicha nizo ochib bo‘lmaydi" });
      const existing = await db.select().from(disputes).where(eq(disputes.orderId, input.orderId)).limit(1);
      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "Bu buyurtma bo‘yicha nizo allaqachon ochilgan" });
      const details = JSON.stringify({ text: input.description, evidenceUrls: input.evidenceUrls ?? [] });
      const result = await db.transaction(async (tx: any) => {
        const created = await tx.insert(disputes).values({ orderId: input.orderId, reportedBy: ctx.user.id, reason: input.reason, description: details, status: "open" });
        await tx.update(orders).set({ status: "disputed" }).where(eq(orders.id, input.orderId));
        const recipient = ctx.user.id === order.buyerId ? order.sellerId : order.buyerId;
        await tx.insert(notifications).values({ userId: recipient, type: "dispute_alert", title: "Buyurtma bo‘yicha nizo ochildi", message: `#${input.orderId} buyurtma bo‘yicha admin ko‘rib chiqishi boshlandi.`, orderId: input.orderId });
        return getInsertId(created);
      });
      await notifyOwner({ title: "Yangi dispute ochildi", content: `#${input.orderId} buyurtma bo‘yicha nizo ochildi.` }).catch(() => undefined);
      return { disputeId: result, status: "open" as const };
    }),
    resolve: protectedProcedure.input(z.object({ disputeId: z.number().int().positive(), status: z.enum(["under_review", "resolved", "closed"]), resolution: z.string().min(3).max(4000) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Faqat admin nizoni hal qiladi" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(disputes).where(eq(disputes.id, input.disputeId)).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const dispute = existing[0];
      const order = await getOrderById(dispute.orderId);
      await db.transaction(async (tx: any) => {
        await tx.update(disputes).set({ status: input.status, resolution: input.resolution, resolvedAt: input.status === "resolved" || input.status === "closed" ? new Date() : null }).where(eq(disputes.id, input.disputeId));
        if (order) {
          const statusText = input.status === "resolved" ? "hal qilindi" : input.status === "closed" ? "yopildi" : "ko‘rib chiqilmoqda";
          await tx.insert(notifications).values([
            { userId: order.buyerId, type: "dispute_update", title: "Nizo holati yangilandi", message: `#${order.id} nizo ${statusText}.`, orderId: order.id },
            { userId: order.sellerId, type: "dispute_update", title: "Nizo holati yangilandi", message: `#${order.id} nizo ${statusText}.`, orderId: order.id },
          ]);
        }
      });
      return { success: true };
    }),
  }),

  crm: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const listings = await db.select().from(pubgAccounts).where(eq(pubgAccounts.sellerId, ctx.user.id)).orderBy(desc(pubgAccounts.createdAt));
      const sellerOrders = await db.select().from(orders).where(eq(orders.sellerId, ctx.user.id)).orderBy(desc(orders.createdAt));
      const sellerReviews = await db.select().from(reviews).where(eq(reviews.sellerId, ctx.user.id));
      const sellerChats = await db.select().from(chatThreads).where(or(eq(chatThreads.sellerId, ctx.user.id), eq(chatThreads.buyerId, ctx.user.id)));
      const completed = sellerOrders.filter(row => row.status === "completed");
      const views = listings.reduce((sum, row) => sum + Number(row.viewCount ?? 0), 0);
      const revenue = completed.reduce((sum, row) => sum + Number(row.price), 0);
      return {
        funnel: { total: listings.length, published: listings.filter(row => row.status === "available").length, pending: listings.filter(row => row.status === "pending_verification").length, sold: listings.filter(row => row.status === "sold").length },
        orders: { total: sellerOrders.length, active: sellerOrders.filter(row => !["completed", "cancelled"].includes(row.status)).length, completed: completed.length, disputed: sellerOrders.filter(row => row.status === "disputed").length },
        revenue,
        rating: sellerReviews.length ? Number((sellerReviews.reduce((sum, row) => sum + Number(row.rating), 0) / sellerReviews.length).toFixed(2)) : 0,
        reviews: sellerReviews.length,
        chats: sellerChats.length,
        views,
        topListings: listings.slice(0, 5).map(row => ({ id: row.id, playerName: row.playerName, price: Number(row.price), status: row.status, verified: row.isVerified, media: (row.galleryUrls?.length ?? 0) + (row.videoUrl ? 1 : 0), views: Number(row.viewCount ?? 0) })),
      };
    }),
  }),

  payments: router({
    providers: publicProcedure.query(() => Object.values(providerStatus)),
    readiness: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      return { walletBalance: Number(user?.walletBalance ?? 0), providers: Object.values(providerStatus), escrowReady: true, note: "Click va Payme uchun merchant credentials kiritilgach haqiqiy checkout yoqiladi." };
    }),
  }),

  alerts: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const unread = await db.select().from(notifications).where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false))).orderBy(desc(notifications.createdAt));
      const referralRows = await db.select().from(referrals).where(eq(referrals.referrerId, ctx.user.id));
      const userRecord = await getUserById(ctx.user.id);
      const prefs = parseAlertPreferences((userRecord as any)?.alertPreferences);
      const watchRows = await db.select().from(priceWatches).where(and(eq(priceWatches.userId, ctx.user.id), eq(priceWatches.isActive, true)));
      return { unreadCount: unread.length, unread: unread.slice(0, 5), referralCount: referralRows.length, referralReward: referralRows.reduce((sum, row) => sum + Number(row.rewardAmount), 0), telegramDelivery: getTelegramDeliveryStatus(), prefs, watchCount: watchRows.length };
    }),
    updatePreferences: protectedProcedure.input(z.object({ telegramAlerts: z.boolean(), priceDropAlerts: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ alertPreferences: JSON.stringify(input) } as any).where(eq(users.id, ctx.user.id));
      if (input.telegramAlerts) {
        const record = await getUserById(ctx.user.id);
        const chatId = record?.openId?.startsWith("telegram:") ? record.openId.slice("telegram:".length) : null;
        if (chatId) {
          await sendTelegramNotification({ chatId, text: "Inferno Stealth: Telegram bildirishnomalari muvaffaqiyatli yoqildi." }).catch(() => {});
        }
      }
      return { success: true };
    }),

    /** Price-drop watchlist: accounts the buyer wants to be alerted about. */
    watchlist: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(priceWatches).where(eq(priceWatches.userId, ctx.user.id)).orderBy(desc(priceWatches.createdAt));
      if (!rows.length) return [];
      const accountRows = await db.select().from(pubgAccounts).where(inArray(pubgAccounts.id, rows.map(row => row.accountId)));
      return rows.map(row => {
        const account = accountRows.find(item => item.id === row.accountId);
        return {
          id: row.id,
          accountId: row.accountId,
          targetPrice: row.targetPrice === null ? null : Number(row.targetPrice),
          isActive: row.isActive,
          playerName: account?.playerName ?? "Akkaunt",
          currentPrice: account ? Number(account.price) : 0,
          status: account?.status ?? "delisted",
          thumbnailUrl: account?.thumbnailUrl ?? null,
          reached: account && row.targetPrice !== null ? Number(account.price) <= Number(row.targetPrice) : false,
        };
      });
    }),
    watch: protectedProcedure.input(z.object({ accountId: z.number().int().positive(), targetPrice: z.number().int().min(0).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const account = await getPubgAccountById(input.accountId);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Akkaunt topilmadi" });
      if (account.sellerId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "O‘z e’loningizni kuzatib bo‘lmaydi" });
      const target = input.targetPrice === undefined ? null : input.targetPrice.toString();
      await db.insert(priceWatches)
        .values({ userId: ctx.user.id, accountId: input.accountId, targetPrice: target, isActive: true })
        .onDuplicateKeyUpdate({ set: { targetPrice: target, isActive: true } });
      return { success: true };
    }),
    unwatch: protectedProcedure.input(z.object({ accountId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(priceWatches).where(and(eq(priceWatches.userId, ctx.user.id), eq(priceWatches.accountId, input.accountId)));
      return { success: true };
    }),
  }),

  auctions: router({
    /** Active auctions with a live countdown for the notifications screen. */
    active: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(auctions).where(eq(auctions.status, "active")).orderBy(auctions.endsAt);
      if (!rows.length) return [];
      const accountRows = await db.select().from(pubgAccounts).where(inArray(pubgAccounts.id, rows.map(row => row.accountId)));
      const now = new Date();
      return rows.map(row => {
        const account = accountRows.find(item => item.id === row.accountId);
        const countdown = formatAuctionCountdown(new Date(row.endsAt), now);
        return {
          id: row.id,
          accountId: row.accountId,
          playerName: account?.playerName ?? "Akkaunt",
          thumbnailUrl: account?.thumbnailUrl ?? null,
          currentBid: Number(row.currentBid),
          startingBid: Number(row.startingBid),
          endsAt: row.endsAt,
          endsInMs: countdown.totalMs,
          countdownLabel: countdown.label,
          ended: countdown.ended,
        };
      });
    }),
    /** Notifies watchers about auctions that end within the given window. */
    notifyEnding: protectedProcedure.input(z.object({ withinMinutes: z.number().int().min(5).max(1440).optional().default(60) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(auctions).where(eq(auctions.status, "active"));
      const now = Date.now();
      const window = input.withinMinutes * 60_000;
      let notified = 0;
      for (const row of rows) {
        const endsIn = new Date(row.endsAt).getTime() - now;
        if (endsIn <= 0 || endsIn > window) continue;
        if (!row.highestBidderId) continue;
        const countdown = formatAuctionCountdown(new Date(row.endsAt));
        await pushNotification({
          userId: row.highestBidderId,
          type: "auction_ending",
          title: "Auksion tugayapti",
          message: `Auksion #${row.id} ${countdown.label} ichida yakunlanadi.`,
          accountId: row.accountId,
        });
        notified += 1;
      }
      return { notified };
    }),
  }),

  admin: router({
    monitor: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [openDisputes, pendingAccounts, disputedOrders, pendingTransactions] = await Promise.all([
        db.select().from(disputes).where(or(eq(disputes.status, "open"), eq(disputes.status, "under_review"))).orderBy(desc(disputes.createdAt)),
        db.select().from(pubgAccounts).where(eq(pubgAccounts.status, "pending_verification")).orderBy(desc(pubgAccounts.createdAt)),
        db.select().from(orders).where(eq(orders.status, "disputed")).orderBy(desc(orders.updatedAt)),
        db.select().from(transactions).where(eq(transactions.status, "pending")).orderBy(desc(transactions.createdAt)),
      ]);
      return { openDisputes, pendingAccounts, disputedOrders, pendingTransactions };
    }),
  }),
});
