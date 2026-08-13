import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb, searchPubgAccounts, getPubgAccountById, getUserById, getUserByOpenId, getSellerAccounts, getOrderById, getUserOrders, getSellerOrders, getSellerReviews, getUserTransactions, getUserNotifications, getOrderReview, getOrderDispute, getAdminDisputes, getAccountSuggestions, getPendingAccounts, getInsertId, getAffectedRows, getFavoriteAccountIds, getFavoriteAccounts, getFavoriteCounts, getChatThreadById, getChatMessages, getUserChatThreads } from "./db";
import { users, pubgAccounts, orders, reviews, transactions, notifications, disputes, favorites, chatThreads, chatMessages, referrals, payoutCards, withdrawalRequests, depositRequests, adminAuditLogs } from "../drizzle/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { proRouter } from "./ProRouters";
import { expansionRouter } from "./ExpansionRouters";
import { getAdminPayoutCardStatus } from "./payoutCard";
import { sendTelegramNotification } from "./telegramBot";

const withdrawalCopy = {
  pending: (requestId: number, amount: string) => ({
    title: 'Pul yechish so‘rovi qabul qilindi',
    message: `#${requestId} so‘rovingiz ${amount} so‘m miqdorida qabul qilindi. Admin chek, karta egasi va summa mosligini tekshiradi. Natija tayyor bo‘lganda sizga bildirishnoma yuboriladi.`,
  }),
  approved: (requestId: number, amount: string) => ({
    title: 'Pul yechish tasdiqlandi',
    message: `#${requestId} so‘rov ${amount} so‘m miqdorida tasdiqlandi. Mablag‘ ko‘rsatilgan kartaga yuborish uchun admin tomonidan qayd etildi.`,
  }),
  rejected: (requestId: number, reason: string) => ({
    title: 'Pul yechish rad etildi',
    message: `#${requestId} so‘rov rad etildi. Balansingiz qaytarildi. Sabab: ${reason}`,
  }),
} as const;

const withdrawalChecklist = [
  'Foydalanuvchi Telegram ID/username va so‘rov raqamini solishtiring.',
  'Karta raqami, karta egasi va summa chek bilan bir xil ekanini tekshiring.',
  'Faqat platforma ichidagi so‘rov uchun to‘lovni ko‘rib chiqing; tashqi chatdagi dalilni alohida qayd eting.',
  'Tasdiqlashdan oldin chek yoki to‘lov tasdig‘ini admin izohiga yozing.',
  'Rad etilganda sababni aniq kiriting; tizim balansni avtomatik qaytaradi.',
  'Har bir qarordan keyin payout status history va audit log’da yozuv paydo bo‘lganini tekshiring.',
] as const;

export const appRouter = router({
  system: systemRouter,
  pro: proRouter,
  expansion: expansionRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Marketplace: Accounts
  accounts: router({
    search: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        minLevel: z.number().optional(),
        maxLevel: z.number().optional(),
        region: z.string().optional(),
        skins: z.array(z.string()).optional(),
        hasGlacier: z.boolean().optional(),
        hasXSuit: z.boolean().optional(),
        hasConquerorHistory: z.boolean().optional(),
        isOldAccount: z.boolean().optional(),
        verifiedSeller: z.boolean().optional(),
        mediaAvailable: z.boolean().optional(),
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        const rows = await searchPubgAccounts(input);
        const favoriteCounts = await getFavoriteCounts(rows.map(row => row.id));
        return rows.map(row => ({ ...row, favoriteCount: favoriteCounts.get(row.id) ?? 0, sellerViewCount: Number(row.viewCount ?? 0) }));
      }),

    suggestions: publicProcedure
      .input(z.object({ query: z.string().max(80) }))
      .query(async ({ input }) => getAccountSuggestions(input.query)),

    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const account = await getPubgAccountById(input);
        if (!account) return account;
        const favoriteCounts = await getFavoriteCounts([account.id]);
        return { ...account, favoriteCount: favoriteCounts.get(account.id) ?? 0, sellerViewCount: Number(account.viewCount ?? 0) };
      }),

    recordView: publicProcedure
      .input(z.object({ accountId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(pubgAccounts).set({ viewCount: sql`${pubgAccounts.viewCount} + 1` }).where(eq(pubgAccounts.id, input.accountId));
        return { success: true };
      }),

    create: protectedProcedure
      .input(z.object({
        accountId: z.string(),
        playerName: z.string(),
        level: z.number(),
        region: z.string(),
        kdRatio: z.number(),
        winRate: z.number(),
        totalMatches: z.number(),
        headshotPercentage: z.number(),
        ucBalance: z.number(),
        outfitCount: z.number(),
        gunSkinCount: z.number(),
        vehicleCount: z.number(),
        hasConquerorHistory: z.boolean().optional().default(false),
        hasXSuit: z.boolean().optional().default(false),
        accountCreatedYear: z.number().int().min(2008).max(2030).optional().default(2024),
        featuredSkins: z.array(z.string()),
        price: z.number(),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        galleryUrls: z.array(z.string()).max(12),
        videoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

        const result = await db.insert(pubgAccounts).values({
          sellerId: ctx.user.id,
          accountId: input.accountId,
          playerName: input.playerName,
          level: input.level,
          region: input.region,
          kdRatio: input.kdRatio.toString(),
          winRate: input.winRate.toString(),
          totalMatches: input.totalMatches,
          headshotPercentage: input.headshotPercentage.toString(),
          ucBalance: input.ucBalance,
          outfitCount: input.outfitCount,
          gunSkinCount: input.gunSkinCount,
          vehicleCount: input.vehicleCount,
          hasConquerorHistory: input.hasConquerorHistory,
          hasXSuit: input.hasXSuit,
          accountCreatedYear: input.accountCreatedYear,
          featuredSkins: input.featuredSkins,
          price: input.price.toString(),
          description: input.description,
          thumbnailUrl: input.thumbnailUrl,
          galleryUrls: input.galleryUrls,
          videoUrl: input.videoUrl,
          status: 'pending_verification',
        });

        const accountId = getInsertId(result);
        await notifyOwner({
          title: "Yangi PUBG akkaunt e'loni",
          content: `${input.playerName} (${input.region}) e'loni admin ko'rigiga yuborildi. Narx: ${input.price} so'm.`,
        }).catch(() => undefined);
        try {
          const owner = await getUserByOpenId(ENV.ownerOpenId);
          if (owner) {
            await db.insert(notifications).values({
              userId: owner.id,
              type: 'new_listing',
              title: "Yangi PUBG akkaunt e'loni",
              message: `${input.playerName} e'loni admin ko'rigiga yuborildi.`,
              accountId,
            });
          }
        } catch (error) {
          console.warn('[Notifications] Listing owner alert was not persisted:', error);
        }
        return { id: accountId };
      }),

    getSellerAccounts: protectedProcedure
      .input(z.number().optional())
      .query(async ({ ctx, input }) => {
        if (input && input !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu sotuvchi profiliga kirish huquqi yo‘q' });
        }
        const sellerId = input || ctx.user.id;
        const rows = await getSellerAccounts(sellerId);
        const favoriteCounts = await getFavoriteCounts(rows.map(row => row.id));
        return rows.map(row => ({ ...row, sellerViewCount: Number(row.viewCount ?? 0), favoriteCount: favoriteCounts.get(row.id) ?? 0 }));
      }),

    updatePrice: protectedProcedure
      .input(z.object({ accountId: z.number().int().positive(), price: z.number().positive().max(999999999) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
        const account = await getPubgAccountById(input.accountId);
        if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Akkaunt topilmadi' });
        if (account.sellerId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu e’lon narxini o‘zgartirish huquqi yo‘q' });
        }
        if (account.status === 'sold' || account.status === 'delisted') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Sotilgan yoki yopilgan e’lon narxini o‘zgartirib bo‘lmaydi' });
        }
        const oldPrice = Number(account.price);
        const nextPrice = Number(input.price.toFixed(2));
        const updated = await db.update(pubgAccounts).set({ price: nextPrice.toString() }).where(eq(pubgAccounts.id, account.id));
        if (!updated || getAffectedRows(updated) !== 1) throw new TRPCError({ code: 'CONFLICT', message: 'Narx yangilanmadi' });

        let notifiedCount = 0;
        if (nextPrice < oldPrice) {
          const watchers = await db.select({ userId: favorites.userId })
            .from(favorites)
            .where(and(eq(favorites.accountId, account.id), eq(favorites.priceDropAlerts, true)));
          for (const watcher of watchers) {
            await db.insert(notifications).values({
              userId: watcher.userId,
              type: 'price_drop',
              title: 'Wishlist narxi tushdi',
              message: `${account.playerName} akkaunti narxi ${new Intl.NumberFormat('uz-UZ').format(oldPrice)} so‘mdan ${new Intl.NumberFormat('uz-UZ').format(nextPrice)} so‘mga tushdi.`,
              accountId: account.id,
            });
            notifiedCount += 1;
          }
        }
        return { success: true, oldPrice, newPrice: nextPrice, notifiedCount };
      }),
  }),

  // Secure media upload: the client sends a bounded base64 payload and the server writes it to S3.
  media: router({
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1).max(180),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]),
        dataBase64: z.string().min(1).max(12_000_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const bytes = Buffer.from(input.dataBase64, "base64");
        if (bytes.length > 8 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Fayl hajmi 8 MB dan oshmasin" });
        }
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
        return await storagePut(`users/${ctx.user.id}/accounts/${safeName}`, bytes, input.contentType);
      }),
  }),

  // Marketplace: Orders
  orders: router({
    create: protectedProcedure
      .input(z.object({
        accountId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const account = await getPubgAccountById(input.accountId);
        if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Akkaunt topilmadi' });
        if (account.status !== 'available') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Akkaunt sotilmagan' });
        if (account.sellerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'O\'z e\'loningizni sotib olmang' });

        const price = account.price.toString();
        const orderResult = await db.transaction(async (tx: any) => {
          const balanceResult = await tx.update(users)
            .set({ walletBalance: sql`walletBalance - ${price}` })
            .where(and(eq(users.id, ctx.user.id), gte(users.walletBalance, price)));
          if (!balanceResult || getAffectedRows(balanceResult) !== 1) {
            throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Hamyon balansida mablag‘ yetarli emas' });
          }

          const reservationResult = await tx.update(pubgAccounts)
            .set({ status: 'pending_verification' })
            .where(and(eq(pubgAccounts.id, input.accountId), eq(pubgAccounts.status, 'available')));
          if (!reservationResult || getAffectedRows(reservationResult) !== 1) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Bu akkaunt hozirgina boshqa xaridor tomonidan band qilindi' });
          }

          const result = await tx.insert(orders).values({
            accountId: input.accountId,
            buyerId: ctx.user.id,
            sellerId: account.sellerId,
            price,
            status: 'pending',
            escrowStage: 'payment_frozen',
          });
          const orderId = getInsertId(result);
          await tx.insert(transactions).values({
            userId: ctx.user.id,
            type: 'order_payment',
            amount: price,
            orderId,
            description: `#${orderId} kafolatli savdo uchun mablag‘ muzlatildi`,
            status: 'completed',
          });
          return orderId;
        });

        await notifyOwner({
          title: "Yangi kafolatli savdo",
          content: `#${orderResult} buyurtma uchun to'lov muzlatildi. Akkaunt: ${account.playerName}.`,
        }).catch(() => undefined);
        try {
          const owner = await getUserByOpenId(ENV.ownerOpenId);
          if (owner) {
            await db.insert(notifications).values({
              userId: owner.id,
              type: 'order_status',
              title: 'Yangi kafolatli savdo',
              message: `#${orderResult} buyurtmada to'lov muzlatildi.`,
              accountId: account.id,
              orderId: orderResult,
            });
          }
        } catch (error) {
          console.warn('[Notifications] Escrow owner alert was not persisted:', error);
        }

        return { orderId: orderResult };
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const order = await getOrderById(input);
        if (!order) return undefined;
        const isParticipant = order.buyerId === ctx.user.id || order.sellerId === ctx.user.id;
        if (!isParticipant && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu buyurtmaga kirish huquqi yo‘q' });
        return order;
      }),

    getUserOrders: protectedProcedure
      .query(async ({ ctx }) => {
        return await getUserOrders(ctx.user.id);
      }),

    getSellerOrders: protectedProcedure
      .query(async ({ ctx }) => {
        return await getSellerOrders(ctx.user.id);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(['pending', 'in_escrow', 'completed', 'cancelled', 'disputed']),
        escrowStage: z.enum(['payment_frozen', 'account_verification', 'buyer_confirmation']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
        const isAdmin = ctx.user.role === 'admin';
        const isSeller = order.sellerId === ctx.user.id;
        const isBuyer = order.buyerId === ctx.user.id;
        if (!isAdmin && !isSeller && !isBuyer) throw new TRPCError({ code: 'FORBIDDEN' });
        if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'disputed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Yakunlangan buyurtma statusini o‘zgartirib bo‘lmaydi' });
        }
        if (input.status !== 'in_escrow' || !input.escrowStage) {
          if (!(isAdmin && input.status === 'cancelled')) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Faqat navbatdagi kafolat bosqichiga o‘tish mumkin' });
          }
        }
        if (input.status === 'in_escrow' && input.escrowStage) {
          const expectedNext = order.escrowStage === 'payment_frozen'
            ? 'account_verification'
            : order.escrowStage === 'account_verification'
              ? 'buyer_confirmation'
              : undefined;
          if (input.escrowStage !== expectedNext) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Kafolat bosqichi tartibi buzildi' });
          }
          if (!isAdmin && !isSeller) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu bosqichni faqat sotuvchi yoki admin yangilaydi' });
          }
        }

        const updateData: any = { status: input.status };
        if (input.escrowStage) updateData.escrowStage = input.escrowStage;
        await db.update(orders).set(updateData).where(eq(orders.id, input.orderId));
        if (input.status === 'in_escrow' && input.escrowStage) {
          const stageLabel = input.escrowStage === 'account_verification'
            ? 'akkaunt tekshiruvi'
            : 'xaridor tasdig‘i';
          await notifyOwner({
            title: 'Kafolatli savdo bosqichi yangilandi',
            content: `#${input.orderId} buyurtma ${stageLabel} bosqichiga o‘tdi.`,
          }).catch(() => undefined);
          try {
            const owner = await getUserByOpenId(ENV.ownerOpenId);
            if (owner) {
              await db.insert(notifications).values({
                userId: owner.id,
                type: 'order_status',
                title: 'Kafolatli savdo bosqichi yangilandi',
                message: `#${input.orderId} buyurtma ${stageLabel} bosqichiga o‘tdi.`,
                orderId: input.orderId,
              });
            }
          } catch (error) {
            console.warn('[Notifications] Escrow stage owner alert was not persisted:', error);
          }
        }
        return { success: true };
      }),

    confirmBuyer: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const order = await getOrderById(input);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
        if (order.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        if (order.status !== 'in_escrow' || order.escrowStage !== 'buyer_confirmation') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Xaridor tasdig‘i uchun akkaunt tekshiruvi yakunlanishi kerak' });
        }

        await db.transaction(async (tx: any) => {
          const completed = await tx.update(orders)
            .set({ buyerConfirmed: true, buyerConfirmedAt: new Date(), status: 'completed', completedAt: new Date() })
            .where(and(eq(orders.id, input), eq(orders.status, 'in_escrow'), eq(orders.escrowStage, 'buyer_confirmation')));
          if (!completed || getAffectedRows(completed) !== 1) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Buyurtma boshqa jarayon tomonidan yakunlandi' });
          }
          await tx.update(pubgAccounts)
            .set({ status: 'sold' })
            .where(eq(pubgAccounts.id, order.accountId));
          await tx.update(users)
            .set({ walletBalance: sql`walletBalance + ${order.price}`, totalSales: sql`totalSales + 1` })
            .where(eq(users.id, order.sellerId));
          await tx.insert(transactions).values({
            userId: order.sellerId,
            type: 'seller_payout',
            amount: order.price.toString(),
            orderId: input,
            description: `#${input} savdosi uchun sotuvchi to‘lovi`,
            status: 'completed',
          });
        });

        return { success: true };
      }),

    cancel: protectedProcedure
      .input(z.object({ orderId: z.number(), reason: z.string().max(255).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
        const isParticipant = order.buyerId === ctx.user.id || order.sellerId === ctx.user.id;
        if (!isParticipant && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (order.status === 'completed' || order.status === 'cancelled') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bu buyurtma allaqachon yakunlangan' });
        }

        await db.transaction(async (tx: any) => {
          const cancelled = await tx.update(orders)
            .set({ status: 'cancelled' })
            .where(and(eq(orders.id, input.orderId), eq(orders.status, order.status)));
          if (!cancelled || getAffectedRows(cancelled) !== 1) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Buyurtma statusi o‘zgargan, qayta urinib ko‘ring' });
          }
          await tx.update(pubgAccounts).set({ status: 'available' }).where(eq(pubgAccounts.id, order.accountId));
          await tx.update(users)
            .set({ walletBalance: sql`walletBalance + ${order.price}` })
            .where(eq(users.id, order.buyerId));
          await tx.insert(transactions).values({
            userId: order.buyerId,
            type: 'order_refund',
            amount: order.price.toString(),
            orderId: input.orderId,
            description: input.reason || `#${input.orderId} savdosi bekor qilindi`,
            status: 'completed',
          });
        });
        return { success: true };
      }),
  }),

  // Marketplace: Reviews
  reviews: router({
    create: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
        if (order.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const existing = await getOrderReview(input.orderId);
        if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Sharh allaqachon qoldirilgan' });

        const result = await db.insert(reviews).values({
          orderId: input.orderId,
          reviewerId: ctx.user.id,
          sellerId: order.sellerId,
          rating: input.rating,
          comment: input.comment,
        });

        return { reviewId: getInsertId(result) };
      }),

    getSellerReviews: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await getSellerReviews(input);
      }),
  }),

  // Marketplace: Wallet & Transactions
  wallet: router({
    getBalance: protectedProcedure
      .query(async ({ ctx }) => {
        const user = await getUserById(ctx.user.id);
        return { balance: user?.walletBalance || 0 };
      }),

    getTopupCard: protectedProcedure.query(async () => {
      const card = getAdminPayoutCardStatus();
      if (!card.configured) return { configured: false as const };
      return { configured: true as const, cardNumber: card.maskedNumber, cardHolder: card.holder, bankName: 'Uzcard/Humo' };
    }),

    getPayoutCard: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const rows = await db.select().from(payoutCards).where(and(eq(payoutCards.userId, ctx.user.id), eq(payoutCards.isDefault, true))).limit(1);
      const card = rows[0];
      return card ? { configured: true, cardNumber: `${card.cardNumber.slice(0, 4)} **** **** ${card.cardNumber.slice(-4)}`, cardHolder: card.cardHolderName, bankName: card.bankName } : { configured: false };
    }),

    getWithdrawals: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const rows = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, ctx.user.id));
      return rows.map(row => ({ ...row, cardNumber: `${row.cardNumber.slice(0, 4)} **** **** ${row.cardNumber.slice(-4)}` }));
    }),

    topup: protectedProcedure
      .input(z.object({ amount: z.number().int().positive().min(1000).max(100000000) }))
      .mutation(async () => {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Balansni to‘ldirish uchun kartaga pul tashlang va chek rasmini yuboring.' });
      }),

    submitDeposit: protectedProcedure
      .input(z.object({ amount: z.number().int().positive().min(1000).max(100000000), receiptUrl: z.string().min(1).max(500), receiptReference: z.string().max(255).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const pending = await db.select({ id: depositRequests.id }).from(depositRequests).where(and(eq(depositRequests.userId, ctx.user.id), eq(depositRequests.status, 'pending'))).limit(1);
        if (pending[0]) throw new TRPCError({ code: 'CONFLICT', message: 'Sizda allaqachon tekshiruvdagi to‘lov mavjud.' });
        const result = await db.insert(depositRequests).values({ userId: ctx.user.id, amount: String(input.amount), receiptUrl: input.receiptUrl, receiptReference: input.receiptReference?.trim() || null, status: 'pending' });
        const depositId = getInsertId(result);
        await db.insert(notifications).values({ userId: ctx.user.id, type: 'admin_message', title: 'To‘lov cheki qabul qilindi', message: `#${depositId} to‘lov so‘rovingiz qabul qilindi. Admin karta, summa va chekni tekshiradi.` });
        await notifyOwner({ title: 'Yangi karta to‘lovi cheki', content: `Foydalanuvchi #${ctx.user.id} #${depositId} depozit so‘rovini yubordi: ${input.amount} so‘m.` }).catch(() => undefined);
        return { success: true, depositId };
      }),

    getDeposits: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return await db.select().from(depositRequests).where(eq(depositRequests.userId, ctx.user.id)).orderBy(desc(depositRequests.createdAt));
    }),

    withdraw: protectedProcedure
      .input(z.object({ amount: z.number().int().positive().min(10000).max(100000000), cardNumber: z.string().min(12).max(32), cardHolderName: z.string().min(3).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const normalizedCard = input.cardNumber.replace(/\\D/g, '');
        if (normalizedCard.length < 12 || normalizedCard.length > 19) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Karta raqami noto‘g‘ri' });
        let requestId = 0;
        await db.transaction(async (tx: any) => {
          const balanceResult = await tx.update(users)
            .set({ walletBalance: sql`walletBalance - ${input.amount}` })
            .where(and(eq(users.id, ctx.user.id), gte(users.walletBalance, input.amount.toString())));
          if (!balanceResult || getAffectedRows(balanceResult) !== 1) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Yechib olish uchun balans yetarli emas' });
          const cardRows = await tx.select().from(payoutCards).where(and(eq(payoutCards.userId, ctx.user.id), eq(payoutCards.cardNumber, normalizedCard))).limit(1);
          if (!cardRows[0]) await tx.insert(payoutCards).values({ userId: ctx.user.id, cardNumber: normalizedCard, cardHolderName: input.cardHolderName.trim(), bankName: 'Uzcard/Humo', isDefault: true });
          const requestResult = await tx.insert(withdrawalRequests).values({ userId: ctx.user.id, amount: input.amount.toString(), cardNumber: normalizedCard, cardHolderName: input.cardHolderName.trim(), status: 'pending' });
          requestId = getInsertId(requestResult);
          await tx.insert(transactions).values({ userId: ctx.user.id, type: 'withdrawal', amount: input.amount.toString(), description: `Yechib olish #${requestId} — ${normalizedCard.slice(0, 4)} **** **** ${normalizedCard.slice(-4)}`, status: 'pending' });
        });
        const copy = withdrawalCopy.pending(requestId, String(input.amount));
        await db.insert(notifications).values({ userId: ctx.user.id, type: 'admin_message', title: copy.title, message: copy.message });
        await notifyOwner({ title: 'Yangi yechib olish so‘rovi', content: `Foydalanuvchi #${ctx.user.id} ${input.amount} so‘m yechib olishni so‘radi. So‘rov #${requestId} admin panelda kutmoqda.` }).catch(() => undefined);
        return { success: true, requestId };
      }),

    getTransactions: protectedProcedure
      .query(async ({ ctx }) => {
        return await getUserTransactions(ctx.user.id);
      }),
  }),

  // Marketplace: Notifications
  notifications: router({
    getUnread: protectedProcedure
      .query(async ({ ctx }) => {
        return await getUserNotifications(ctx.user.id, true);
      }),

    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        return await getUserNotifications(ctx.user.id);
      }),

    markAsRead: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const updated = await db.update(notifications)
          .set({ isRead: true })
          .where(and(eq(notifications.id, input), eq(notifications.userId, ctx.user.id)));
        if (!updated || getAffectedRows(updated) !== 1) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu bildirishnomani o‘qilgan deb belgilash huquqi yo‘q' });
        }
        return { success: true };
      }),
  }),

  // Buyer watchlist
  favorites: router({
    ids: protectedProcedure.query(async ({ ctx }) => getFavoriteAccountIds(ctx.user.id)),
    list: protectedProcedure.query(async ({ ctx }) => getFavoriteAccounts(ctx.user.id)),
    toggle: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const account = await getPubgAccountById(input.accountId);
        if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Akkaunt topilmadi' });
        const existing = await db.select().from(favorites).where(and(eq(favorites.userId, ctx.user.id), eq(favorites.accountId, input.accountId))).limit(1);
        if (existing.length > 0) {
          await db.delete(favorites).where(eq(favorites.id, existing[0].id));
          return { saved: false };
        }
        await db.insert(favorites).values({ userId: ctx.user.id, accountId: input.accountId, initialPrice: account.price.toString(), priceDropAlerts: true });
        return { saved: true, priceDropAlerts: true };
      }),

    watchlist: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return await db.select({ accountId: favorites.accountId, initialPrice: favorites.initialPrice, priceDropAlerts: favorites.priceDropAlerts })
        .from(favorites)
        .where(eq(favorites.userId, ctx.user.id));
    }),

    setPriceDropAlerts: protectedProcedure
      .input(z.object({ accountId: z.number().int().positive(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const account = await getPubgAccountById(input.accountId);
        if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Akkaunt topilmadi' });
        const updated = await db.update(favorites)
          .set({ priceDropAlerts: input.enabled, initialPrice: account.price.toString() })
          .where(and(eq(favorites.userId, ctx.user.id), eq(favorites.accountId, input.accountId)));
        if (!updated || getAffectedRows(updated) !== 1) throw new TRPCError({ code: 'NOT_FOUND', message: 'Akkaunt wishlist’da yo‘q' });
        return { accountId: input.accountId, enabled: input.enabled, initialPrice: account.price.toString() };
      }),
  }),

  // Profile, public seller trust card, and referrals
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => getUserById(ctx.user.id)),
    update: protectedProcedure
      .input(z.object({ name: z.string().min(2).max(80).optional(), profileBio: z.string().max(500).optional(), avatarUrl: z.string().max(500).optional(), telegramUsername: z.string().max(128).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(users).set({ name: input.name?.trim() || null, profileBio: input.profileBio?.trim() || null, avatarUrl: input.avatarUrl?.trim() || null, telegramUsername: input.telegramUsername?.trim() || null }).where(eq(users.id, ctx.user.id));
        return await getUserById(ctx.user.id);
      }),
    referral: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      const code = user.referralCode || `IS${user.id}${user.openId.slice(0, 6).toUpperCase()}`;
      if (!user.referralCode) await db.update(users).set({ referralCode: code }).where(eq(users.id, ctx.user.id));
      const rows = await db.select().from(referrals).where(eq(referrals.referrerId, ctx.user.id));
      return { code, total: rows.length, credited: rows.filter(row => row.status === 'credited').length, reward: rows.reduce((sum, row) => sum + Number(row.rewardAmount), 0) };
    }),
    claimReferral: protectedProcedure
      .input(z.object({ code: z.string().min(3).max(32) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const referrerRows = await db.select().from(users).where(eq(users.referralCode, input.code.trim().toUpperCase())).limit(1);
        const referrer = referrerRows[0];
        if (!referrer || referrer.id === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Referral kodi noto‘g‘ri' });
        const existing = await db.select().from(referrals).where(eq(referrals.referredUserId, ctx.user.id)).limit(1);
        if (existing.length > 0) throw new TRPCError({ code: 'CONFLICT', message: 'Referral allaqachon ishlatilgan' });
        const reward = 5000;
        await db.transaction(async (tx: any) => {
          await tx.insert(referrals).values({ referrerId: referrer.id, referredUserId: ctx.user.id, code: input.code.trim().toUpperCase(), rewardAmount: reward.toString(), status: 'credited', creditedAt: new Date() });
          await tx.update(users).set({ walletBalance: sql`walletBalance + ${reward}` }).where(eq(users.id, referrer.id));
          await tx.insert(transactions).values({ userId: referrer.id, type: 'referral_reward', amount: reward.toString(), description: `Referral bonusi: ${ctx.user.name || 'yangi foydalanuvchi'}`, status: 'completed' });
        });
        return { success: true, reward };
      }),
  }),

  // Private buyer/seller messaging. Threads are visible only to participants and admins.
  chat: router({
    threads: protectedProcedure.query(async ({ ctx }) => getUserChatThreads(ctx.user.id)),
    messages: protectedProcedure
      .input(z.object({ threadId: z.number() }))
      .query(async ({ ctx, input }) => {
        const thread = await getChatThreadById(input.threadId);
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat topilmadi' });
        if (thread.buyerId !== ctx.user.id && thread.sellerId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (db && ctx.user.role !== 'admin') await db.update(chatMessages).set({ isRead: true }).where(and(eq(chatMessages.threadId, input.threadId), eq(chatMessages.isRead, false)));
        return await getChatMessages(input.threadId);
      }),
    open: protectedProcedure
      .input(z.object({ accountId: z.number(), orderId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const account = await getPubgAccountById(input.accountId);
        if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Akkaunt topilmadi' });
        if (account.sellerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'O‘zingizga xabar yubora olmaysiz' });
        const existingRows = await db.select().from(chatThreads).where(and(eq(chatThreads.accountId, input.accountId), eq(chatThreads.buyerId, ctx.user.id), eq(chatThreads.sellerId, account.sellerId))).limit(1);
        if (existingRows[0]) return existingRows[0];
        const result = await db.insert(chatThreads).values({ accountId: input.accountId, orderId: input.orderId, buyerId: ctx.user.id, sellerId: account.sellerId, status: 'open' });
        return await getChatThreadById(getInsertId(result));
      }),
    send: protectedProcedure
      .input(z.object({ threadId: z.number(), body: z.string().trim().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const thread = await getChatThreadById(input.threadId);
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND' });
        if (thread.buyerId !== ctx.user.id && thread.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        const result = await db.insert(chatMessages).values({ threadId: input.threadId, senderId: ctx.user.id, body: input.body });
        await db.update(chatThreads).set({ updatedAt: new Date() }).where(eq(chatThreads.id, input.threadId));
        const recipientId = thread.buyerId === ctx.user.id ? thread.sellerId : thread.buyerId;
        await db.insert(notifications).values({ userId: recipientId, type: 'admin_message', title: 'Yangi xavfsiz chat xabari', message: input.body.slice(0, 180), accountId: thread.accountId ?? undefined, orderId: thread.orderId ?? undefined });
        return { messageId: getInsertId(result) };
      }),
    close: protectedProcedure
      .input(z.object({ threadId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const thread = await getChatThreadById(input.threadId);
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND' });
        if (thread.buyerId !== ctx.user.id && thread.sellerId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(chatThreads).set({ status: 'closed' }).where(eq(chatThreads.id, input.threadId));
        return { success: true };
      }),
  }),

  // Disputes and owner alerts
  disputes: router({
    create: protectedProcedure
      .input(z.object({ orderId: z.number(), reason: z.string().min(3).max(255), description: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Buyurtma topilmadi' });
        if (order.buyerId !== ctx.user.id && order.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        if (order.status === 'completed' || order.status === 'cancelled') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Yakunlangan savdoga nizo ochib bo‘lmaydi' });
        const existing = await getOrderDispute(input.orderId);
        if (existing && existing.status !== 'closed') throw new TRPCError({ code: 'CONFLICT', message: 'Bu buyurtma uchun nizo allaqachon ochilgan' });

        const result = await db.insert(disputes).values({
          orderId: input.orderId,
          reportedBy: ctx.user.id,
          reason: input.reason,
          description: input.description,
          status: 'open',
        });
        await db.update(orders).set({ status: 'disputed' }).where(and(eq(orders.id, input.orderId), eq(orders.status, order.status)));
        const owner = await getUserByOpenId(ENV.ownerOpenId);
        if (owner) {
          await db.insert(notifications).values({
            userId: owner.id,
            type: 'dispute_alert',
            title: 'Yangi nizo ochildi',
            message: `#${getInsertId(result)} nizo: ${input.reason}`,
            orderId: input.orderId,
          });
        }
        await notifyOwner({
          title: 'Yangi savdo nizosi',
          content: `#${input.orderId} buyurtma bo‘yicha nizo ochildi: ${input.reason}`,
        }).catch(() => undefined);
        return { disputeId: getInsertId(result) };
      }),
  }),

  // Admin: Disputes & Management
  admin: router({
    getPendingAccounts: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await getPendingAccounts();
      }),

    verifyAccount: protectedProcedure
      .input(z.object({ accountId: z.number(), approved: z.boolean(), notes: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const account = await getPubgAccountById(input.accountId);
        if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Akkaunt topilmadi' });
        if (account.status !== 'pending_verification') throw new TRPCError({ code: 'CONFLICT', message: 'Bu e’lon allaqachon ko‘rib chiqilgan' });

        await db.update(pubgAccounts).set({
          status: input.approved ? 'available' : 'delisted',
          isVerified: input.approved,
          verificationNotes: input.notes,
        }).where(and(eq(pubgAccounts.id, input.accountId), eq(pubgAccounts.status, 'pending_verification')));
        await db.insert(notifications).values({
          userId: account.sellerId,
          type: 'admin_message',
          title: input.approved ? 'E’lon tasdiqlandi' : 'E’lon rad etildi',
          message: input.notes || (input.approved ? 'E’loningiz Inferno Stealth bozorida ko‘rinadi.' : 'E’loningiz tekshiruvdan o‘tmadi.'),
          accountId: input.accountId,
        });
        return { success: true };
      }),

    getDisputes: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await getAdminDisputes();
      }),

    getWithdrawalChecklist: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return { environment: ENV.isProduction ? 'production' : 'staging', stagingTestEnabled: !ENV.isProduction, items: [...withdrawalChecklist] };
      }),

    getDepositRequests: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return await db.select().from(depositRequests).orderBy(desc(depositRequests.createdAt)).limit(100);
    }),

    reviewDeposit: protectedProcedure
      .input(z.object({ depositId: z.number().int().positive(), approved: z.boolean(), notes: z.string().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        let userId = 0;
        let amount = '0';
        let userTelegramId: string | null = null;
        await db.transaction(async (tx: any) => {
          const rows = await tx.select().from(depositRequests).where(eq(depositRequests.id, input.depositId)).limit(1);
          const deposit = rows[0];
          if (!deposit) throw new TRPCError({ code: 'NOT_FOUND', message: 'To‘lov so‘rovi topilmadi' });
          if (deposit.status !== 'pending') throw new TRPCError({ code: 'CONFLICT', message: 'Bu chek allaqachon ko‘rib chiqilgan' });
          userId = deposit.userId;
          amount = String(deposit.amount);

          const userRows = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
          if (userRows[0]) {
            userTelegramId = userRows[0].telegramId || userRows[0].openId;
          }

          const nextStatus = input.approved ? 'approved' : 'rejected';
          await tx.update(depositRequests).set({ status: nextStatus, adminNotes: input.notes?.trim() || (input.approved ? 'Chek tasdiqlandi.' : 'Chek rad etildi.') }).where(and(eq(depositRequests.id, input.depositId), eq(depositRequests.status, 'pending')));
          if (input.approved) {
            await tx.update(users).set({ walletBalance: sql`walletBalance + ${deposit.amount}` }).where(eq(users.id, userId));
            await tx.insert(transactions).values({ userId, type: 'topup', amount: String(deposit.amount), description: `Karta cheki tasdiqlandi #${input.depositId}`, status: 'completed' });
          }
          await tx.insert(adminAuditLogs).values({ adminId: ctx.user.id, action: input.approved ? 'deposit_approved' : 'deposit_rejected', targetType: 'deposit', targetId: input.depositId, details: `${input.approved ? 'Tasdiqlandi' : 'Rad etildi'}: ${input.notes?.trim() || 'Izoh kiritilmagan.'}` });
        });

        const depositMsg = input.approved
          ? `<b>✅ To'lovingiz muvaffaqiyatli tasdiqlandi!</b>\n\nChek raqami: #${input.depositId}\nSumma: <b>${amount} so'm</b>\nHolat: Balansingizga qo'shildi va xarid qilishga tayyor. 🚀`
          : `<b>❌ To'lov chekingiz rad etildi</b>\n\nChek raqami: #${input.depositId}\nSabab: ${input.notes?.trim() || 'Chek ma\'lumotlari mos kelmadi yoki tasdiqlanmadi.'}\n\nIltimos, qo'llab-quvvatlash bo'limiga murojaat qiling.`;

        await db.insert(notifications).values({ userId, type: 'admin_message', title: input.approved ? 'To‘lov tasdiqlandi' : 'To‘lov rad etildi', message: depositMsg });

        if (userTelegramId) {
          await sendTelegramNotification(userTelegramId, depositMsg, '/profile').catch(() => undefined);
        }

        return { success: true, depositId: input.depositId, approved: input.approved, amount };
      }),

    createTestWithdrawal: protectedProcedure
      .input(z.object({ amount: z.number().int().positive().min(10000).max(100000000).default(25000), useMockBalance: z.boolean().default(true) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        if (ENV.isProduction) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Staging testi production muhitida o‘chirilgan.' });
        if (!input.useMockBalance) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Avval admin panelida Mock balans rejimini yoqing.' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const result = await db.insert(withdrawalRequests).values({
          userId: ctx.user.id,
          amount: String(input.amount),
          cardNumber: '0000000000000000',
          cardHolderName: 'STAGING TEST',
          status: 'pending',
          isTest: true,
          adminNotes: 'STAGING_TEST + MOCK_BALANCE: haqiqiy balans yechilmaydi; faqat admin oqimini tekshirish uchun.',
        });
        const requestId = getInsertId(result);
        await db.insert(adminAuditLogs).values({ adminId: ctx.user.id, action: 'staging_withdrawal_created', targetType: 'withdrawal', targetId: requestId, details: `Staging test + mock balans so‘rovi yaratildi: ${input.amount} so‘m. Real wallet o‘zgarmadi.` });
        return { success: true, requestId, isTest: true, mockBalance: true };
      }),

    getWithdrawalRequests: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        return await db.select().from(withdrawalRequests).orderBy(desc(withdrawalRequests.createdAt)).limit(100);
      }),

    getAuditLogs: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        return await db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(100);
      }),

    reviewWithdrawal: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), approved: z.boolean(), notes: z.string().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        let userId = 0;
        let amount = '0';
        await db.transaction(async (tx: any) => {
          const rows = await tx.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, input.requestId)).limit(1);
          const request = rows[0];
          if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Yechib olish so‘rovi topilmadi' });
          if (request.status !== 'pending') throw new TRPCError({ code: 'CONFLICT', message: 'Bu so‘rov allaqachon ko‘rib chiqilgan' });
          userId = request.userId;
          amount = String(request.amount);
          const nextStatus = input.approved ? 'approved' : 'rejected';
          await tx.update(withdrawalRequests).set({ status: nextStatus, adminNotes: input.notes?.trim() || (input.approved ? 'Admin tomonidan tasdiqlandi.' : 'Admin tomonidan rad etildi.') }).where(and(eq(withdrawalRequests.id, input.requestId), eq(withdrawalRequests.status, 'pending')));
          await tx.update(transactions).set({ status: input.approved ? 'completed' : 'failed' }).where(and(eq(transactions.userId, request.userId), eq(transactions.type, 'withdrawal'), eq(transactions.status, 'pending'), sql`description like ${`Yechib olish #${input.requestId}%`}`));
          if (!input.approved && !request.isTest) {
            await tx.update(users).set({ walletBalance: sql`walletBalance + ${request.amount}` }).where(eq(users.id, request.userId));
            await tx.insert(transactions).values({ userId: request.userId, type: 'topup', amount: String(request.amount), description: `Yechib olish #${input.requestId} rad etildi — balans qaytarildi`, status: 'completed' });
          }
          await tx.insert(adminAuditLogs).values({
            adminId: ctx.user.id,
            action: request.isTest ? 'staging_withdrawal_reviewed' : 'withdrawal_reviewed',
            targetType: 'withdrawal',
            targetId: input.requestId,
            details: `${request.isTest ? 'STAGING TEST. ' : ''}${input.approved ? 'Tasdiqlandi' : 'Rad etildi'}: ${input.notes?.trim() || 'Izoh kiritilmagan.'}`,
          });
        });
        const copy = input.approved
          ? withdrawalCopy.approved(input.requestId, amount)
          : withdrawalCopy.rejected(input.requestId, input.notes?.trim() || 'Admin tasdig‘i yetarli emas.');
        await db.insert(notifications).values({ userId, type: 'admin_message', title: copy.title, message: copy.message });
        return { success: true, requestId: input.requestId, approved: input.approved, amount };
      }),

    broadcast: protectedProcedure
      .input(z.object({ message: z.string().min(3).max(2000), title: z.string().min(3).max(255).default('Inferno Stealth xabari') }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const userRows = await db.select({ id: users.id }).from(users);
        if (userRows.length > 0) {
          await db.insert(notifications).values(userRows.map(user => ({
            userId: user.id,
            type: 'admin_message' as const,
            title: input.title,
            message: input.message,
          })));
        }
        return { success: true, recipients: userRows.length };
      }),

    resolveDispute: protectedProcedure
      .input(z.object({
        disputeId: z.number(),
        resolution: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        await db.update(disputes).set({
          status: 'resolved',
          resolution: input.resolution,
          resolvedAt: new Date(),
        }).where(eq(disputes.id, input.disputeId));

        return { success: true };
      }),

    getChatThreads: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        return await db.select().from(chatThreads);
      }),

    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const [userRows, accountRows, orderRows, payoutRows, disputeRows] = await Promise.all([
          db.select().from(users),
          db.select().from(pubgAccounts),
          db.select().from(orders),
          db.select().from(transactions).where(eq(transactions.type, 'seller_payout')),
          getAdminDisputes(),
        ]);
        return {
          totalUsers: userRows.length,
          totalAccounts: accountRows.filter(row => row.status === 'available').length,
          pendingAccounts: accountRows.filter(row => row.status === 'pending_verification').length,
          totalSales: orderRows.filter(row => row.status === 'completed').length,
          totalRevenue: payoutRows.reduce((sum, row) => sum + Number(row.amount), 0),
          openDisputes: disputeRows.length,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
