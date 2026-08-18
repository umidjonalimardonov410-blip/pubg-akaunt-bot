import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb, searchPubgAccounts, getPubgAccountById, getUserById, getUserByOpenId, getSellerAccounts, getOrderById, getUserOrders, getSellerOrders, getSellerReviews, getUserTransactions, getUserNotifications, getOrderReview, getOrderDispute, getAdminDisputes, getAccountSuggestions, getPendingAccounts, getInsertId, getAffectedRows, getFavoriteAccountIds, getFavoriteAccounts, getChatThreadById, getChatMessages, getUserChatThreads } from "./db";
import { users, pubgAccounts, orders, reviews as orderReviews, reviewReports, sellerVerifications, transactions, notifications, disputes, favorites, chatThreads, chatMessages, referrals, depositReceipts, securityAudits } from "../drizzle/schema";
import { eq, and, gte, desc, sql, or, isNull } from "drizzle-orm";
import { storagePut, storagePresignPut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { expansionRouter } from "./ExpansionRouters";
import { sendTelegramNotification } from "./telegramBot";

function escapeTelegramHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

async function notifyTelegramUser(userId: number, text: string, path = '/profile') {
  const user = await getUserById(userId);
  if (!user?.openId.startsWith('telegram:')) return;
  const chatId = user.openId.slice('telegram:'.length);
  await sendTelegramNotification(chatId, text, path).catch(() => undefined);
}

const REVIEW_ABUSE_TERMS = ['suka', 'blyat', 'блять', 'ебать', 'idiot', 'тупой', 'ahmoq', 'harom'];

export function getReviewModerationReason(comment?: string) {
  const value = (comment ?? '').trim();
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (value.length > 1200) return 'Sharh 1200 belgidan oshmasin.';
  if (normalized.includes('http://') || normalized.includes('https://') || normalized.includes('t.me/') || normalized.includes('www.')) return 'Sharh ichida havola yuborish mumkin emas.';
  if (normalized.split('').some((character, index) => character && normalized.slice(index, index + 7) === character.repeat(7))) return 'Takroriy belgilar spam sifatida belgilandi.';
  if (REVIEW_ABUSE_TERMS.some(term => normalized.includes(term))) return 'Haqoratli yoki tajovuzkor so‘zlar aniqlangan.';
  const words = normalized.split(/\s+/).filter(Boolean);
  const repeatedWord = words.some(word => word.length > 2 && words.filter(item => item === word).length >= 4);
  if (repeatedWord) return 'Takroriy so‘zlar spam sifatida belgilandi.';
  return null;
}

export const appRouter = router({
  system: systemRouter,
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
        category: z.enum(['all', 'pro', 'conqueror', 'classic']).optional(),
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
          // Public marketplace listings go live immediately. Admin moderation remains available
          // through delisting/verification controls, while sellers can start receiving buyers.
          status: 'available',
          isVerified: false,
        });

        const accountId = getInsertId(result);
        await notifyOwner({
          title: "Yangi PUBG akkaunt e'loni",
          content: `${input.playerName} (${input.region}) e'loni Inferno Stealth ommaviy bozoriga joylandi. Narx: ${input.price} so'm.`,
        }).catch(() => undefined);
        try {
          const owner = await getUserByOpenId(ENV.ownerOpenId);
          if (owner) {
            await db.insert(notifications).values({
              userId: owner.id,
              type: 'new_listing',
              title: "Yangi PUBG akkaunt e'loni",
              message: `${input.playerName} e'loni ommaviy bozorga joylandi. Xaridorlar hozir ko‘rishi mumkin.`,
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
        if (sellerId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await getSellerAccounts(sellerId);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        playerName: z.string().trim().min(2).max(100).optional(),
        level: z.number().int().min(1).max(100).optional(),
        region: z.string().trim().min(2).max(50).optional(),
        price: z.number().int().min(0).optional(),
        description: z.string().trim().max(5000).optional(),
        featuredSkins: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
        thumbnailUrl: z.string().url().max(500).nullable().optional(),
        galleryUrls: z.array(z.string().url().max(500)).max(12).optional(),
        videoUrl: z.string().url().max(500).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const account = await getPubgAccountById(input.id);
        if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Akkaunt topilmadi' });
        if (account.sellerId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Faqat o‘z e’loningizni tahrirlashingiz mumkin' });
        if (account.status === 'sold') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Sotilgan akkauntni tahrirlab bo‘lmaydi' });
        const updateData: Record<string, unknown> = {};
        if (input.playerName !== undefined) updateData.playerName = input.playerName;
        if (input.level !== undefined) updateData.level = input.level;
        if (input.region !== undefined) updateData.region = input.region;
        if (input.price !== undefined) updateData.price = input.price.toString();
        if (input.description !== undefined) updateData.description = input.description || null;
        if (input.featuredSkins !== undefined) updateData.featuredSkins = input.featuredSkins;
        if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl;
        if (input.galleryUrls !== undefined) updateData.galleryUrls = input.galleryUrls;
        if (input.videoUrl !== undefined) updateData.videoUrl = input.videoUrl;
        if (Object.keys(updateData).length === 0) return { success: true };
        const ownershipCondition = ctx.user.role === 'admin' ? eq(pubgAccounts.id, input.id) : and(eq(pubgAccounts.id, input.id), eq(pubgAccounts.sellerId, ctx.user.id));
        await db.update(pubgAccounts).set(updateData).where(ownershipCondition);
        return { success: true };
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

    // Large media (video up to 200 MB): browser PUTs straight to S3 with a presigned URL.
    presignUpload: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1).max(180),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"]),
        size: z.number().int().positive().max(200 * 1024 * 1024),
      }))
      .mutation(async ({ ctx, input }) => {
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
        return await storagePresignPut(`users/${ctx.user.id}/accounts/${safeName}`, input.contentType);
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

        const saleMessage = `🎉 <b>Akkauntingiz sotildi!</b>\n\n#${input} buyurtma muvaffaqiyatli yakunlandi. Sotuvchi balansi ${Number(order.price).toLocaleString('uz-UZ')} so‘mga to‘ldirildi.`;
        await db.insert(notifications).values({
          userId: order.sellerId,
          type: 'order_status',
          title: 'Akkauntingiz sotildi',
          message: `#${input} buyurtma yakunlandi. Sotuvchi to‘lovi balansingizga qo‘shildi.`,
          accountId: order.accountId,
          orderId: input,
        });
        await notifyTelegramUser(order.sellerId, saleMessage, '/orders');

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
        const moderationReason = getReviewModerationReason(input.comment);
        if (moderationReason) throw new TRPCError({ code: 'BAD_REQUEST', message: moderationReason });

        const result = await db.insert(orderReviews).values({
          orderId: input.orderId,
          reviewerId: ctx.user.id,
          sellerId: order.sellerId,
          rating: input.rating,
          comment: input.comment?.trim() || null,
          moderationStatus: 'published',
        });

        return { reviewId: getInsertId(result) };
      }),

    getSellerReviews: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const rows = await getSellerReviews(input);
        return rows.filter(row => row.moderationStatus !== 'hidden');
      }),

    report: protectedProcedure
      .input(z.object({ reviewId: z.number().int().positive(), reason: z.string().trim().min(3).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const review = await db.select().from(orderReviews).where(eq(orderReviews.id, input.reviewId)).limit(1);
        if (!review[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sharh topilmadi' });
        if (review[0].reviewerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'O‘zingizning sharhingizni shikoyat qila olmaysiz' });
        const existing = await db.select().from(reviewReports).where(and(eq(reviewReports.reviewId, input.reviewId), eq(reviewReports.reporterId, ctx.user.id), eq(reviewReports.status, 'pending'))).limit(1);
        if (existing.length) throw new TRPCError({ code: 'CONFLICT', message: 'Bu sharh bo‘yicha shikoyatingiz allaqachon yuborilgan' });
        const result = await db.insert(reviewReports).values({ reviewId: input.reviewId, reporterId: ctx.user.id, reason: input.reason.trim(), status: 'pending' });
        await notifyOwner({ title: 'Yangi sharh shikoyati', content: `Review #${input.reviewId}: ${input.reason.trim()}` }).catch(() => undefined);
        return { reportId: getInsertId(result), status: 'pending' as const };
      }),
  }),

  // Marketplace: Wallet & Transactions
  wallet: router({
    getBalance: protectedProcedure
      .query(async ({ ctx }) => {
        const user = await getUserById(ctx.user.id);
        return { balance: user?.walletBalance || 0 };
      }),

    getTopupInstructions: protectedProcedure.query(() => ({
      amounts: [10000, 20000, 50000] as const,
      cardNumber: ENV.adminPayoutCardNumber,
      cardHolder: ENV.adminPayoutCardHolder,
      instructions: 'Kartaga tanlangan summani o‘tkazing, keyin to‘lov chekini shu yerga yuboring. Admin tasdiqlagach balans avtomatik qo‘shiladi.',
    })),

    uploadReceipt: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1).max(180),
        contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
        dataBase64: z.string().min(1).max(12_000_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const bytes = Buffer.from(input.dataBase64, 'base64');
        if (bytes.length > 8 * 1024 * 1024) {
          throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: 'Chek hajmi 8 MB dan oshmasin' });
        }
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
        return await storagePut(`users/${ctx.user.id}/receipts/${Date.now()}-${safeName}`, bytes, input.contentType);
      }),

    submitReceipt: protectedProcedure
      .input(z.object({
        amount: z.union([z.literal(10000), z.literal(20000), z.literal(50000)]),
        receiptKey: z.string().min(1).max(500),
        receiptUrl: z.string().min(1).max(700),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        if (!input.receiptKey.startsWith(`users/${ctx.user.id}/receipts/`)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Chek fayli noto‘g‘ri xotira yo‘lida' });
        }
        const duplicate = await db.select({ id: depositReceipts.id })
          .from(depositReceipts)
          .where(eq(depositReceipts.receiptKey, input.receiptKey))
          .limit(1);
        if (duplicate.length > 0) throw new TRPCError({ code: 'CONFLICT', message: 'Bu chek allaqachon yuborilgan' });

        const result = await db.transaction(async (tx: any) => {
          const transactionResult = await tx.insert(transactions).values({
            userId: ctx.user.id,
            type: 'topup',
            amount: input.amount.toString(),
            description: 'Manual chek tekshiruvi kutilmoqda',
            status: 'pending',
          });
          const transactionId = getInsertId(transactionResult);
          const receiptResult = await tx.insert(depositReceipts).values({
            userId: ctx.user.id,
            amount: input.amount.toString(),
            receiptKey: input.receiptKey,
            receiptUrl: input.receiptUrl,
            status: 'pending',
            transactionId,
          });
          await tx.insert(securityAudits).values({
            userId: ctx.user.id,
            eventType: 'deposit_receipt_submitted',
            riskScore: 0,
            details: JSON.stringify({ receiptId: getInsertId(receiptResult), amount: input.amount }),
          });
          return { receiptId: getInsertId(receiptResult), transactionId };
        });

        await notifyOwner({
          title: 'Yangi balans cheki',
          content: `Foydalanuvchi #${ctx.user.id} ${input.amount.toLocaleString('uz-UZ')} so‘m uchun chek yubordi. Admin paneldan tekshiring.`,
        }).catch(() => undefined);
        return { success: true, ...result };
      }),

    getDepositReceipts: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return await db.select().from(depositReceipts)
        .where(eq(depositReceipts.userId, ctx.user.id))
        .orderBy(desc(depositReceipts.createdAt));
    }),

    // Kept as a compatibility guard: no route may credit a wallet without an approved receipt.
    topup: protectedProcedure
      .input(z.object({ amount: z.number().int().positive() }))
      .mutation(() => {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Balansni to‘ldirish uchun karta to‘lovidan keyin chek yuboring.' });
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
          const transactionResult = await tx.insert(transactions).values({
            userId: ctx.user.id,
            type: 'withdrawal',
            amount: input.amount.toString(),
            description: `Yechib olish so‘rovi: ${input.destination}`,
            status: 'pending',
          });
          await tx.insert(securityAudits).values({
            userId: ctx.user.id,
            eventType: 'payout_requested',
            riskScore: 0,
            details: JSON.stringify({ transactionId: getInsertId(transactionResult), amount: input.amount, destination: input.destination }),
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
    get: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) return null;
      const db = await getDb();
      let ratingStats = { avgRating: 5.0, reviewCount: 0 };
      if (db) {
        const reviewRows = await db.select({ rating: orderReviews.rating }).from(orderReviews).innerJoin(orders, eq(orderReviews.orderId, orders.id)).where(eq(orders.sellerId, ctx.user.id));
        if (reviewRows.length > 0) {
          const total = reviewRows.reduce((sum, r) => sum + r.rating, 0);
          ratingStats = { avgRating: Number((total / reviewRows.length).toFixed(1)), reviewCount: reviewRows.length };
        }
      }
      return { ...user, ...ratingStats };
    }),
    update: protectedProcedure
      .input(z.object({ name: z.string().min(2).max(80).optional(), profileBio: z.string().max(500).optional(), phone: z.string().max(32).optional(), languageCode: z.enum(['uz','ru','en']).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const patch: Record<string, unknown> = {};
        if (input.name !== undefined) patch.name = input.name.trim() || null;
        if (input.profileBio !== undefined) patch.profileBio = input.profileBio.trim() || null;
        if (input.phone !== undefined) patch.phone = input.phone.trim() || null;
        if (input.languageCode !== undefined) patch.languageCode = input.languageCode;
        if (Object.keys(patch).length > 0) await db.update(users).set(patch).where(eq(users.id, ctx.user.id));
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
        const senderIsBuyer = thread.buyerId === ctx.user.id;
        const recipientId = senderIsBuyer ? thread.sellerId : thread.buyerId;
        const messagePreview = input.body.slice(0, 180);
        await db.insert(notifications).values({ userId: recipientId, type: 'admin_message', title: senderIsBuyer ? 'Xaridordan yangi xabar' : 'Yangi xavfsiz chat xabari', message: messagePreview, accountId: thread.accountId ?? undefined, orderId: thread.orderId ?? undefined });
        if (senderIsBuyer) {
          await notifyTelegramUser(thread.sellerId, `💬 <b>Xaridordan yangi xabar</b>\n\n${escapeTelegramHtml(messagePreview)}`, `/chat/${thread.id}`);
        }
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

  sellerVerification: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const rows = await db.select().from(sellerVerifications).where(eq(sellerVerifications.userId, ctx.user.id)).limit(1);
      return rows[0] ?? null;
    }),

    submit: protectedProcedure
      .input(z.object({
        fullName: z.string().trim().min(3).max(128),
        telegramUsername: z.string().trim().min(2).max(64),
        idCardPhotoUrl: z.string().trim().min(5).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const existing = await db.select().from(sellerVerifications).where(eq(sellerVerifications.userId, ctx.user.id)).limit(1);
        if (existing[0]?.status === 'approved') throw new TRPCError({ code: 'CONFLICT', message: 'Sotuvchi profilingiz allaqachon tasdiqlangan' });
        if (existing[0]) {
          await db.update(sellerVerifications).set({ fullName: input.fullName, telegramUsername: input.telegramUsername, idCardPhotoUrl: input.idCardPhotoUrl, status: 'pending' }).where(eq(sellerVerifications.id, existing[0].id));
          return { verificationId: existing[0].id, status: 'pending' as const };
        }
        const result = await db.insert(sellerVerifications).values({ ...input, status: 'pending', userId: ctx.user.id });
        await notifyOwner({ title: 'Yangi sotuvchi verifikatsiyasi', content: `${input.fullName} (@${input.telegramUsername}) tasdiqlash uchun ariza yubordi.` }).catch(() => undefined);
        return { verificationId: getInsertId(result), status: 'pending' as const };
      }),
  }),

  // Admin: Disputes & Management
  admin: router({
    getSellerVerificationQueue: protectedProcedure
      .input(z.object({ status: z.enum(['all', 'pending', 'approved', 'rejected']).default('pending') }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const fields = { application: sellerVerifications, userName: users.name, userOpenId: users.openId };
        const status = input?.status ?? 'pending';
        const query = db.select(fields).from(sellerVerifications).leftJoin(users, eq(users.id, sellerVerifications.userId)).orderBy(desc(sellerVerifications.createdAt));
        return status === 'all' ? await query : await query.where(eq(sellerVerifications.status, status));
      }),

    reviewSellerVerification: protectedProcedure
      .input(z.object({ verificationId: z.number().int().positive(), approved: z.boolean(), note: z.string().trim().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const applications = await db.select().from(sellerVerifications).where(eq(sellerVerifications.id, input.verificationId)).limit(1);
        const application = applications[0];
        if (!application) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sotuvchi arizasi topilmadi' });
        if (application.status !== 'pending') throw new TRPCError({ code: 'CONFLICT', message: 'Bu sotuvchi arizasi allaqachon ko‘rib chiqilgan' });
        const status = input.approved ? 'approved' : 'rejected';
        await db.transaction(async (tx: any) => {
          await tx.update(sellerVerifications).set({ status }).where(and(eq(sellerVerifications.id, input.verificationId), eq(sellerVerifications.status, 'pending')));
          if (input.approved) {
            await tx.update(users).set({ isVerifiedSeller: true, sellerBadge: 'trusted' }).where(eq(users.id, application.userId));
          }
          await tx.insert(securityAudits).values({
            userId: application.userId,
            eventType: input.approved ? 'seller_verification_approved' : 'seller_verification_rejected',
            riskScore: input.approved ? 0 : 5,
            details: JSON.stringify({ verificationId: application.id, reviewedBy: ctx.user.id, note: input.note?.trim() || null }),
          });
          await tx.insert(notifications).values({
            userId: application.userId,
            type: 'admin_message',
            title: input.approved ? 'Sotuvchi profilingiz tasdiqlandi' : 'Sotuvchi arizasi rad etildi',
            message: input.note?.trim() || (input.approved ? 'Tasdiqlangan sotuvchi belgisi profilingizga qo‘shildi.' : 'Arizangiz tekshiruvdan o‘tmadi. Ma’lumotlarni to‘ldirib qayta yuborishingiz mumkin.'),
          });
        });
        await notifyTelegramUser(application.userId, input.approved
          ? `✅ <b>Sotuvchi profilingiz tasdiqlandi</b>\n\nProfilingizda tasdiqlangan sotuvchi belgisi yoqildi.`
          : `ℹ️ <b>Sotuvchi arizasi rad etildi</b>\n\n${input.note?.trim() || 'Ma’lumotlarni to‘ldirib qayta yuborishingiz mumkin.'}`,
          '/profile');
        return { success: true, status };
      }),

    getReviewReports: protectedProcedure
      .input(z.object({ status: z.enum(['all', 'pending', 'dismissed', 'hidden']).default('pending') }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const fields = { report: reviewReports, review: orderReviews, reporterName: users.name };
        const query = db.select(fields).from(reviewReports).leftJoin(orderReviews, eq(orderReviews.id, reviewReports.reviewId)).leftJoin(users, eq(users.id, reviewReports.reporterId)).orderBy(desc(reviewReports.createdAt));
        const status = input?.status ?? 'pending';
        return status === 'all' ? await query : await query.where(eq(reviewReports.status, status));
      }),

    moderateReviewReport: protectedProcedure
      .input(z.object({ reportId: z.number().int().positive(), action: z.enum(['dismissed', 'hidden']), note: z.string().trim().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const rows = await db.select().from(reviewReports).where(eq(reviewReports.id, input.reportId)).limit(1);
        const report = rows[0];
        if (!report) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sharh shikoyati topilmadi' });
        if (report.status !== 'pending') throw new TRPCError({ code: 'CONFLICT', message: 'Bu shikoyat allaqachon ko‘rib chiqilgan' });
        await db.transaction(async (tx: any) => {
          await tx.update(reviewReports).set({ status: input.action, adminNote: input.note?.trim() || null, reviewedAt: new Date() }).where(and(eq(reviewReports.id, input.reportId), eq(reviewReports.status, 'pending')));
          if (input.action === 'hidden') await tx.update(orderReviews).set({ moderationStatus: 'hidden' }).where(eq(orderReviews.id, report.reviewId));
          await tx.insert(securityAudits).values({ userId: report.reporterId, eventType: input.action === 'hidden' ? 'review_hidden' : 'review_report_dismissed', riskScore: input.action === 'hidden' ? 4 : 0, details: JSON.stringify({ reportId: report.id, reviewId: report.reviewId, reviewedBy: ctx.user.id, note: input.note?.trim() || null }) });
        });
        await notifyTelegramUser(report.reporterId, input.action === 'hidden' ? '✅ Sharh bo‘yicha shikoyatingiz ko‘rib chiqildi.' : 'ℹ️ Sharh bo‘yicha shikoyatingiz tekshirildi va qoidabuzarlik topilmadi.');
        return { success: true, status: input.action };
      }),

    getPendingAccounts: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return await getPendingAccounts();
      }),

    getDepositReceipts: protectedProcedure
      .input(z.object({ status: z.enum(['all', 'pending', 'approved', 'rejected']).default('all') }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const status = input?.status ?? 'all';
        const fields = {
          receipt: depositReceipts,
          userName: users.name,
          userOpenId: users.openId,
        };
        if (status === 'all') {
          return await db.select(fields).from(depositReceipts)
            .leftJoin(users, eq(users.id, depositReceipts.userId))
            .orderBy(desc(depositReceipts.createdAt));
        }
        return await db.select(fields).from(depositReceipts)
          .leftJoin(users, eq(users.id, depositReceipts.userId))
          .where(eq(depositReceipts.status, status))
          .orderBy(desc(depositReceipts.createdAt));
      }),

    reviewDepositReceipt: protectedProcedure
      .input(z.object({ receiptId: z.number().int().positive(), approved: z.boolean(), note: z.string().trim().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const result = await db.transaction(async (tx: any) => {
          const rows = await tx.select().from(depositReceipts).where(eq(depositReceipts.id, input.receiptId)).limit(1);
          const receipt = rows[0];
          if (!receipt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chek topilmadi' });
          if (receipt.status !== 'pending') throw new TRPCError({ code: 'CONFLICT', message: 'Bu chek allaqachon ko‘rib chiqilgan' });

          const nextStatus = input.approved ? 'approved' : 'rejected';
          const updateResult = await tx.update(depositReceipts).set({
            status: nextStatus,
            reviewedBy: ctx.user.id,
            reviewNote: input.note?.trim() || null,
            reviewedAt: new Date(),
          }).where(and(eq(depositReceipts.id, input.receiptId), eq(depositReceipts.status, 'pending')));
          if (!updateResult || getAffectedRows(updateResult) !== 1) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Chek boshqa admin tomonidan ko‘rib chiqildi' });
          }

          if (receipt.transactionId) {
            await tx.update(transactions).set({
              status: input.approved ? 'completed' : 'failed',
              description: input.approved ? 'Manual chek tasdiqlandi' : `Manual chek rad etildi${input.note ? `: ${input.note.trim()}` : ''}`,
            }).where(and(eq(transactions.id, receipt.transactionId), eq(transactions.status, 'pending')));
          }
          if (input.approved) {
            await tx.update(users).set({ walletBalance: sql`walletBalance + ${receipt.amount}` }).where(eq(users.id, receipt.userId));
          }
          await tx.insert(securityAudits).values({
            userId: receipt.userId,
            eventType: input.approved ? 'deposit_receipt_approved' : 'deposit_receipt_rejected',
            riskScore: input.approved ? 0 : 10,
            details: JSON.stringify({ receiptId: receipt.id, amount: receipt.amount, reviewedBy: ctx.user.id, note: input.note?.trim() || null }),
          });
          await tx.insert(notifications).values({
            userId: receipt.userId,
            type: 'admin_message',
            title: input.approved ? 'Balans to‘ldirildi' : 'Chek rad etildi',
            message: input.approved
              ? `${Number(receipt.amount).toLocaleString('uz-UZ')} so‘m balansingizga qo‘shildi.`
              : (input.note?.trim() || 'Chek ma’lumotlari tasdiqlanmadi. To‘g‘ri chek bilan qayta yuboring.'),
          });
          return { userId: receipt.userId, amount: Number(receipt.amount), status: nextStatus };
        });

        await notifyTelegramUser(
          result.userId,
          result.status === 'approved'
            ? `✅ <b>Balans tasdiqlandi</b>\n\n${result.amount.toLocaleString('uz-UZ')} so‘m balansingizga qo‘shildi.`
            : `❌ <b>Chek rad etildi</b>\n\n${input.note?.trim() || 'Chek ma’lumotlari tasdiqlanmadi. To‘g‘ri chek bilan qayta yuboring.'}`,
        );
        return { success: true, status: result.status };
      }),

    getPayoutQueue: protectedProcedure
      .input(z.object({ status: z.enum(['pending', 'completed', 'failed', 'all']).default('pending') }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const status = input?.status ?? 'pending';
        const fields = { transaction: transactions, userName: users.name, userOpenId: users.openId };
        if (status === 'all') {
          return await db.select(fields).from(transactions)
            .leftJoin(users, eq(users.id, transactions.userId))
            .where(eq(transactions.type, 'withdrawal'))
            .orderBy(desc(transactions.createdAt));
        }
        return await db.select(fields).from(transactions)
          .leftJoin(users, eq(users.id, transactions.userId))
          .where(and(eq(transactions.type, 'withdrawal'), eq(transactions.status, status)))
          .orderBy(desc(transactions.createdAt));
      }),

    processPayout: protectedProcedure
      .input(z.object({ transactionId: z.number().int().positive(), approved: z.boolean(), note: z.string().trim().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const result = await db.transaction(async (tx: any) => {
          const rows = await tx.select().from(transactions).where(and(eq(transactions.id, input.transactionId), eq(transactions.type, 'withdrawal'))).limit(1);
          const transaction = rows[0];
          if (!transaction) throw new TRPCError({ code: 'NOT_FOUND', message: 'Yechib olish so‘rovi topilmadi' });
          if (transaction.status !== 'pending') throw new TRPCError({ code: 'CONFLICT', message: 'Bu payout allaqachon ko‘rib chiqilgan' });
          const updateResult = await tx.update(transactions).set({
            status: input.approved ? 'completed' : 'failed',
            description: `${transaction.description || 'Yechib olish so‘rovi'}${input.note?.trim() ? ` | ${input.note.trim()}` : ''}`,
          }).where(and(eq(transactions.id, input.transactionId), eq(transactions.status, 'pending')));
          if (!updateResult || getAffectedRows(updateResult) !== 1) throw new TRPCError({ code: 'CONFLICT', message: 'Payout boshqa admin tomonidan ko‘rib chiqildi' });
          if (!input.approved) {
            await tx.update(users).set({ walletBalance: sql`walletBalance + ${transaction.amount}` }).where(eq(users.id, transaction.userId));
          }
          await tx.insert(securityAudits).values({
            userId: transaction.userId,
            eventType: input.approved ? 'payout_approved' : 'payout_rejected',
            riskScore: input.approved ? 0 : 5,
            details: JSON.stringify({ transactionId: transaction.id, amount: transaction.amount, reviewedBy: ctx.user.id, note: input.note?.trim() || null }),
          });
          await tx.insert(notifications).values({
            userId: transaction.userId,
            type: 'admin_message',
            title: input.approved ? 'Yechib olish tasdiqlandi' : 'Yechib olish rad etildi',
            message: input.approved
              ? `${Number(transaction.amount).toLocaleString('uz-UZ')} so‘m payout tasdiqlandi.`
              : `Balans qaytarildi. ${input.note?.trim() || 'Payout so‘rovi rad etildi.'}`,
          });
          return { userId: transaction.userId, amount: Number(transaction.amount), status: input.approved ? 'completed' : 'failed' };
        });
        await notifyTelegramUser(
          result.userId,
          result.status === 'completed'
            ? `✅ <b>Payout tasdiqlandi</b>\n\n${result.amount.toLocaleString('uz-UZ')} so‘m so‘rovingiz tasdiqlandi.`
            : `↩️ <b>Payout rad etildi</b>\n\nBalans qaytarildi. ${input.note?.trim() || 'Admin izoh qoldirmadi.'}`,
        );
        return { success: true, status: result.status };
      }),

    getAuditLogs: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        return await db.select({ audit: securityAudits, userName: users.name })
          .from(securityAudits)
          .leftJoin(users, eq(users.id, securityAudits.userId))
          .orderBy(desc(securityAudits.createdAt))
          .limit(input?.limit ?? 100);
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
        const [userRows, accountRows, orderRows, payoutRows, pendingDepositRows, pendingPayoutRows, disputeRows] = await Promise.all([
          db.select().from(users),
          db.select().from(pubgAccounts),
          db.select().from(orders),
          db.select().from(transactions).where(eq(transactions.type, 'seller_payout')),
          db.select().from(depositReceipts).where(eq(depositReceipts.status, 'pending')),
          db.select().from(transactions).where(and(eq(transactions.type, 'withdrawal'), eq(transactions.status, 'pending'))),
          getAdminDisputes(),
        ]);
        return {
          totalUsers: userRows.length,
          totalAccounts: accountRows.filter(row => row.status === 'available').length,
          pendingAccounts: accountRows.filter(row => row.status === 'pending_verification').length,
          totalSales: orderRows.filter(row => row.status === 'completed').length,
          totalRevenue: payoutRows.reduce((sum, row) => sum + Number(row.amount), 0),
          pendingDeposits: pendingDepositRows.length,
          pendingPayouts: pendingPayoutRows.length,
          openDisputes: disputeRows.length,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
