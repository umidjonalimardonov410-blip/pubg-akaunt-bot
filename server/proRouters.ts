import { z } from "zod";
import { and, desc, eq, gt, gte, ne, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb, getUserById } from "./db";
import {
  accountHolds,
  auctionBids,
  auctions,
  disputes,
  notifications,
  orders,
  pubgAccounts,
  users,
} from "../drizzle/schema";
import { computeTrustScore, TRUST_RANKS } from "./trustScore";
import { estimateFairPrice, FAIR_LABELS, median, type Comparable } from "./fairPrice";
import { scanListing } from "./scamGuard";
import { buildDealRoom, type EscrowStage } from "./dealRoom";
import { sendTelegramNotification } from "./telegramNotifications";

/** Bron muddati — xaridor akkauntni 15 daqiqaga band qila oladi. */
export const HOLD_DURATION_MS = 15 * 60 * 1000;
/** Auksion snayperlariga qarshi: oxirgi 2 daqiqadagi stavka vaqtni 2 daqiqaga uzaytiradi. */
export const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000;
export const ANTI_SNIPE_EXTENSION_MS = 2 * 60 * 1000;

async function push(userId: number, text: string) {
  const user = await getUserById(userId);
  if (!user?.openId?.startsWith("telegram:")) return;
  await sendTelegramNotification({ chatId: user.openId.slice("telegram:".length), text }).catch(() => undefined);
}

function toComparable(row: any): Comparable {
  return {
    price: Number(row.price ?? 0),
    level: Number(row.level ?? 0),
    kdRatio: Number(row.kdRatio ?? 0),
    ucBalance: Number(row.ucBalance ?? 0),
    outfitCount: Number(row.outfitCount ?? 0),
    gunSkinCount: Number(row.gunSkinCount ?? 0),
    hasXSuit: Boolean(row.hasXSuit),
    hasConquerorHistory: Boolean(row.hasConquerorHistory),
    region: String(row.region ?? ""),
  };
}

/** Faol (muddati o'tmagan) bronni qaytaradi. */
export async function getActiveHold(db: any, accountId: number, now = new Date()) {
  const rows = await db
    .select()
    .from(accountHolds)
    .where(and(eq(accountHolds.accountId, accountId), eq(accountHolds.status, "active"), gt(accountHolds.expiresAt, now)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Pro-paket: ishonch reytingi, fair-price, deal room taymeri,
 * bron, anti-snayper auksion va anti-scam skaner.
 */
export const proRouter = router({
  /** Sotuvchining ishonch bali, darajasi va signal-belgilari. */
  trust: publicProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const seller = await getUserById(input.userId);
    if (!seller) throw new TRPCError({ code: "NOT_FOUND" });

    const [[completed], [disputeCount], [cancelled]] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(orders).where(and(eq(orders.sellerId, input.userId), eq(orders.status, "completed"))),
      db.select({ value: sql<number>`count(*)` }).from(disputes).innerJoin(orders, eq(disputes.orderId, orders.id)).where(eq(orders.sellerId, input.userId)),
      db.select({ value: sql<number>`count(*)` }).from(orders).where(and(eq(orders.sellerId, input.userId), eq(orders.status, "cancelled"))),
    ]);

    const ageDays = Math.max(0, (Date.now() - new Date(seller.createdAt).getTime()) / 86_400_000);
    const trust = computeTrustScore({
      rating: Number(seller.sellerRating ?? 0),
      totalSales: Number(seller.totalSales ?? 0),
      completedOrders: Number(completed?.value ?? 0),
      disputes: Number(disputeCount?.value ?? 0),
      cancelledOrders: Number(cancelled?.value ?? 0),
      isVerifiedSeller: Boolean(seller.isVerifiedSeller),
      accountAgeDays: ageDays,
    });

    return {
      userId: seller.id,
      name: seller.name,
      avatarUrl: seller.avatarUrl,
      isVerifiedSeller: Boolean(seller.isVerifiedSeller),
      completedOrders: Number(completed?.value ?? 0),
      ...trust,
    };
  }),

  /** Reputatsiya darajalari ro'yxati (UI legendasi uchun). */
  trustRanks: publicProcedure.query(() => TRUST_RANKS),

  /** Eng ishonchli sotuvchilar reytingi. */
  leaderboard: publicProcedure
    .input(z.object({ limit: z.number().int().min(3).max(50).default(10) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          sellerRating: users.sellerRating,
          totalSales: users.totalSales,
          isVerifiedSeller: users.isVerifiedSeller,
          createdAt: users.createdAt,
          xp: users.xp,
        })
        .from(users)
        .where(gte(users.totalSales, 1))
        .orderBy(desc(users.totalSales))
        .limit(60);

      return rows
        .map(row => {
          const trust = computeTrustScore({
            rating: Number(row.sellerRating ?? 0),
            totalSales: Number(row.totalSales ?? 0),
            completedOrders: Number(row.totalSales ?? 0),
            disputes: 0,
            isVerifiedSeller: Boolean(row.isVerifiedSeller),
            accountAgeDays: Math.max(0, (Date.now() - new Date(row.createdAt).getTime()) / 86_400_000),
          });
          return {
            userId: row.id,
            name: row.name,
            avatarUrl: row.avatarUrl,
            totalSales: Number(row.totalSales ?? 0),
            rating: Number(row.sellerRating ?? 0),
            xp: Number(row.xp ?? 0),
            score: trust.score,
            rank: trust.rank,
          };
        })
        .sort((a, b) => b.score - a.score || b.totalSales - a.totalSales)
        .slice(0, input?.limit ?? 10);
    }),

  /** Fair-price indikatori: shu akkaunt narxi bozorga nisbatan qanday. */
  fairPrice: publicProcedure.input(z.object({ accountId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, input.accountId)).limit(1);
    const account = rows[0];
    if (!account) throw new TRPCError({ code: "NOT_FOUND" });

    const comparableRows = await db
      .select()
      .from(pubgAccounts)
      .where(and(ne(pubgAccounts.id, input.accountId), eq(pubgAccounts.region, account.region)))
      .limit(200);
    const pool = comparableRows.length >= 3
      ? comparableRows
      : await db.select().from(pubgAccounts).where(ne(pubgAccounts.id, input.accountId)).limit(200);

    const target = toComparable(account);
    const estimate = estimateFairPrice(target, pool.map(toComparable));
    return { ...estimate, price: target.price, ...FAIR_LABELS[estimate.verdict] };
  }),

  /** Escrow Deal Room: bosqichlar, taymer va kim harakat qilishi kerakligi. */
  dealRoom: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
    const order = rows[0];
    if (!order) throw new TRPCError({ code: "NOT_FOUND" });
    if (order.buyerId !== ctx.user.id && order.sellerId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const room = buildDealRoom({
      status: order.status,
      escrowStage: order.escrowStage as EscrowStage | null,
      updatedAt: order.updatedAt,
      createdAt: order.createdAt,
    });
    return {
      orderId: order.id,
      price: Number(order.price),
      status: order.status,
      viewerRole: order.buyerId === ctx.user.id ? "buyer" : order.sellerId === ctx.user.id ? "seller" : "admin",
      yourTurn:
        (room.responsible === "buyer" && order.buyerId === ctx.user.id) ||
        (room.responsible === "seller" && order.sellerId === ctx.user.id),
      ...room,
    };
  }),

  /** Muddati o'tgan escrow bosqichlari bo'yicha Telegram eslatmasi (admin/cron). */
  dealRoomSweep: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(orders).where(eq(orders.status, "in_escrow")).limit(200);
    let notified = 0;
    for (const order of rows) {
      const room = buildDealRoom({
        status: order.status,
        escrowStage: order.escrowStage as EscrowStage | null,
        updatedAt: order.updatedAt,
        createdAt: order.createdAt,
      });
      if (!room.overdue && !room.urgent) continue;
      const targetId = room.responsible === "buyer" ? order.buyerId : order.sellerId;
      await push(
        targetId,
        `⏳ Deal Room #${order.id}\n${room.label} bosqichi ${room.overdue ? "muddati tugadi" : `${room.countdownLabel} ichida tugaydi`}.\n${room.hint}`,
      );
      notified += 1;
    }
    return { notified };
  }),

  /** Akkauntni 15 daqiqaga bron qilish (bir vaqtda faqat bitta xaridor). */
  hold: protectedProcedure.input(z.object({ accountId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, input.accountId)).limit(1);
    const account = rows[0];
    if (!account) throw new TRPCError({ code: "NOT_FOUND" });
    if (account.status !== "available") throw new TRPCError({ code: "CONFLICT", message: "Akkaunt sotuvda emas" });
    if (account.sellerId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "O'z e'loningizni bron qilolmaysiz" });

    const now = new Date();
    const existing = await getActiveHold(db, input.accountId, now);
    if (existing && existing.userId !== ctx.user.id) {
      throw new TRPCError({ code: "CONFLICT", message: "Bu akkaunt hozir boshqa xaridor tomonidan bron qilingan" });
    }
    const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);
    if (existing) {
      await db.update(accountHolds).set({ expiresAt }).where(eq(accountHolds.id, existing.id));
    } else {
      await db.insert(accountHolds).values({ accountId: input.accountId, userId: ctx.user.id, expiresAt, status: "active" });
    }

    await push(
      account.sellerId,
      `🔒 <b>Bron</b>\n"${account.playerName}" e'loningiz 15 daqiqaga bron qilindi — xaridor to'lovga tayyorlanmoqda.`,
    );
    return { expiresAt, holdMs: HOLD_DURATION_MS };
  }),

  /** Bronni bekor qilish. */
  releaseHold: protectedProcedure.input(z.object({ accountId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db
      .update(accountHolds)
      .set({ status: "released" })
      .where(and(eq(accountHolds.accountId, input.accountId), eq(accountHolds.userId, ctx.user.id), eq(accountHolds.status, "active")));
    return { success: true };
  }),

  /** Akkaunt bron holati — "Sotib olish" tugmasi tepasida ko'rsatiladi. */
  holdStatus: publicProcedure.input(z.object({ accountId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { held: false, mine: false, expiresAt: null as Date | null };
    const hold = await getActiveHold(db, input.accountId);
    if (!hold) return { held: false, mine: false, expiresAt: null as Date | null };
    return { held: true, mine: ctx.user?.id === hold.userId, expiresAt: hold.expiresAt as Date };
  }),

  /** Anti-snayper himoyali auksion stavkasi. */
  bid: protectedProcedure
    .input(z.object({ auctionId: z.number().int().positive(), amount: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(auctions).where(eq(auctions.id, input.auctionId)).limit(1);
      const auction = rows[0];
      if (!auction) throw new TRPCError({ code: "NOT_FOUND" });
      if (auction.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Auksion yakunlangan" });

      const now = new Date();
      const endsAt = new Date(auction.endsAt);
      if (endsAt.getTime() <= now.getTime()) throw new TRPCError({ code: "BAD_REQUEST", message: "Auksion vaqti tugadi" });
      if (auction.highestBidderId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Siz allaqachon eng yuqori stavkadasiz" });
      }
      const current = Number(auction.currentBid ?? auction.startingBid);
      const minStep = Math.max(1000, Math.round(current * 0.02));
      if (input.amount < current + minStep) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Minimal stavka: ${current + minStep}` });
      }

      const remaining = endsAt.getTime() - now.getTime();
      const extended = remaining <= ANTI_SNIPE_WINDOW_MS;
      const newEndsAt = extended ? new Date(endsAt.getTime() + ANTI_SNIPE_EXTENSION_MS) : endsAt;
      const previousLeader = auction.highestBidderId;

      await db.transaction(async (tx: any) => {
        await tx.insert(auctionBids).values({ auctionId: auction.id, bidderId: ctx.user.id, amount: input.amount.toString() });
        await tx
          .update(auctions)
          .set({ currentBid: input.amount.toString(), highestBidderId: ctx.user.id, endsAt: newEndsAt })
          .where(and(eq(auctions.id, auction.id), eq(auctions.status, "active")));
      });

      if (previousLeader && previousLeader !== ctx.user.id) {
        await push(previousLeader, `⚔️ Auksion #${auction.id}: stavkangiz ortda qoldi. Yangi narx ${input.amount}.`);
      }
      return { currentBid: input.amount, endsAt: newEndsAt, extended, minNextBid: input.amount + Math.max(1000, Math.round(input.amount * 0.02)) };
    }),

  /** E'lon uchun anti-scam tekshiruvi (e'lon kartasida ko'rsatiladi). */
  riskScan: publicProcedure.input(z.object({ accountId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, input.accountId)).limit(1);
    const account = rows[0];
    if (!account) throw new TRPCError({ code: "NOT_FOUND" });
    const seller = await getUserById(account.sellerId);
    const others = await db.select({ price: pubgAccounts.price }).from(pubgAccounts).where(ne(pubgAccounts.id, account.id)).limit(200);

    const result = scanListing({
      description: account.description,
      playerName: account.playerName,
      price: Number(account.price),
      marketMedian: median(others.map((row: any) => Number(row.price ?? 0))),
      level: account.level,
      kdRatio: Number(account.kdRatio),
      winRate: Number(account.winRate),
      totalMatches: account.totalMatches,
      ucBalance: account.ucBalance,
      galleryCount: (account.galleryUrls as string[] | null)?.length ?? 0,
      hasVideo: Boolean(account.videoUrl),
      sellerTotalSales: Number(seller?.totalSales ?? 0),
      sellerIsVerified: Boolean(seller?.isVerifiedSeller),
      sellerAccountAgeDays: seller ? Math.max(0, (Date.now() - new Date(seller.createdAt).getTime()) / 86_400_000) : 0,
    });
    return result;
  }),

  /** Referal cashback tarixi — profildagi "cashback" kartasi uchun. */
  cashback: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, entries: [] as { id: number; title: string; message: string; createdAt: Date }[] };
    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.type, "admin_message")))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const entries = rows
      .filter((row: any) => String(row.title).toLowerCase().includes("cashback"))
      .map((row: any) => ({ id: row.id, title: row.title, message: row.message, createdAt: row.createdAt }));
    return { total: entries.length, entries };
  }),
});
