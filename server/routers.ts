import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb, searchPubgAccounts, getPubgAccountById, getUserById, getUserByOpenId, getSellerAccounts, getOrderById, getUserOrders, getSellerOrders, getSellerReviews, getUserTransactions, getUserNotifications, getOrderReview, getOrderDispute, getAdminDisputes, getAccountSuggestions, getPendingAccounts, getInsertId, getAffectedRows, getFavoriteAccountIds, getFavoriteAccounts, getChatThreadById, getChatMessages, getUserChatThreads } from "./db";
import { users, pubgAccounts, orders, reviews, transactions, notifications, disputes, favorites, chatThreads, chatMessages, referrals } from "../drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

export const appRouter = router({
  system: systemRouter,
  
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
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        return await searchPubgAccounts(input);
      }),

    suggestions: publicProcedure
      .input(z.object({ query: z.string().max(80) }))
      .query(async ({ input }) => getAccountSuggestions(input.query)),

    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await getPubgAccountById(input);
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
        const sellerId = input || ctx.user.id;
        return await getSellerAccounts(sellerId);
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

    topup: protectedProcedure
      .input(z.object({ amount: z.number().int().positive().min(1000).max(100000000) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        await db.transaction(async (tx: any) => {
          await tx.update(users).set({ walletBalance: sql`walletBalance + ${input.amount}` }).where(eq(users.id, ctx.user.id));
          await tx.insert(transactions).values({
            userId: ctx.user.id,
            type: 'topup',
            amount: input.amount.toString(),
            description: 'Hamyon to‘ldirildi',
            status: 'completed',
          });
        });

        return { success: true };
      }),

    withdraw: protectedProcedure
      .input(z.object({ amount: z.number().int().positive().min(10000).max(100000000), destination: z.string().min(4).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        await db.transaction(async (tx: any) => {
          const balanceResult = await tx.update(users)
            .set({ walletBalance: sql`walletBalance - ${input.amount}` })
            .where(and(eq(users.id, ctx.user.id), gte(users.walletBalance, input.amount.toString())));
          if (!balanceResult || getAffectedRows(balanceResult) !== 1) {
            throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Yechib olish uchun balans yetarli emas' });
          }
          await tx.insert(transactions).values({
            userId: ctx.user.id,
            type: 'withdrawal',
            amount: input.amount.toString(),
            description: `Yechib olish so‘rovi: ${input.destination}`,
            status: 'pending',
          });
        });

        await notifyOwner({
          title: 'Yangi yechib olish so‘rovi',
          content: `Foydalanuvchi #${ctx.user.id} ${input.amount} so‘m yechib olishni so‘radi.`,
        }).catch(() => undefined);
        return { success: true };
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
        await db.insert(favorites).values({ userId: ctx.user.id, accountId: input.accountId });
        return { saved: true };
      }),
  }),

  // Profile, public seller trust card, and referrals
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => getUserById(ctx.user.id)),
    update: protectedProcedure
      .input(z.object({ name: z.string().min(2).max(80).optional(), profileBio: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(users).set({ name: input.name?.trim() || null, profileBio: input.profileBio?.trim() || null }).where(eq(users.id, ctx.user.id));
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
