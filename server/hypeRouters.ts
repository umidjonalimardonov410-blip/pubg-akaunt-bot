import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb, getUserById } from "./db";
import { notifications, orders, promoCodes, pubgAccounts, transactions, users } from "../drizzle/schema";
import {
  SPIN_PRIZES,
  buildBadges,
  buildSpinPromoCode,
  canSpin,
  levelFromXp,
  nextSpinAt,
  nextSpinStreak,
  pickSpinPrize,
} from "./gamification";
import { sendTelegramNotification } from "./telegramNotifications";

function money(value: unknown) {
  return Number(value ?? 0);
}

async function telegramPush(userId: number, text: string) {
  const user = await getUserById(userId);
  if (!user?.openId?.startsWith("telegram:")) return;
  await sendTelegramNotification({ chatId: user.openId.slice("telegram:".length), text }).catch(() => undefined);
}

/**
 * "Hype" surfaces: jonli savdo lentasi, bozor pulsi, daraja/XP va omad g'ildiragi.
 * Barcha bildirishnomalar Telegram bot orqali yuboriladi (mini app ichida emas).
 */
export const hypeRouter = router({
  /** Oxirgi savdolar lentasi — bosh sahifadagi jonli ticker uchun. */
  liveFeed: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(30).default(12) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const limit = input?.limit ?? 12;
      const rows = await db
        .select({
          id: orders.id,
          price: orders.price,
          status: orders.status,
          createdAt: orders.createdAt,
          playerName: pubgAccounts.playerName,
          region: pubgAccounts.region,
          level: pubgAccounts.level,
        })
        .from(orders)
        .innerJoin(pubgAccounts, eq(orders.accountId, pubgAccounts.id))
        .orderBy(desc(orders.createdAt))
        .limit(limit);
      return rows.map(row => ({
        id: row.id,
        playerName: row.playerName,
        region: row.region,
        level: row.level,
        price: money(row.price),
        status: row.status,
        createdAt: row.createdAt,
      }));
    }),

  /** Bozor pulsi: nechta e'lon, bugungi savdolar, o'rtacha va eng qimmat narx. */
  pulse: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { listings: 0, soldToday: 0, sold24hVolume: 0, avgPrice: 0, topPrice: 0, sellers: 0, onlineNow: 0 };
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [listingStats] = await db
      .select({
        listings: sql<number>`count(*)`,
        avgPrice: sql<number>`coalesce(avg(price), 0)`,
        topPrice: sql<number>`coalesce(max(price), 0)`,
        sellers: sql<number>`count(distinct sellerId)`,
      })
      .from(pubgAccounts)
      .where(eq(pubgAccounts.status, "available"));
    const [orderStats] = await db
      .select({ soldToday: sql<number>`count(*)`, volume: sql<number>`coalesce(sum(price), 0)` })
      .from(orders)
      .where(gte(orders.createdAt, dayAgo));
    return {
      listings: Number(listingStats?.listings ?? 0),
      sellers: Number(listingStats?.sellers ?? 0),
      avgPrice: Math.round(Number(listingStats?.avgPrice ?? 0)),
      topPrice: Math.round(Number(listingStats?.topPrice ?? 0)),
      soldToday: Number(orderStats?.soldToday ?? 0),
      sold24hVolume: Math.round(Number(orderStats?.volume ?? 0)),
      onlineNow: 0,
    };
  }),

  /** Eng faol sotuvchilar (savdo soni + reyting). */
  topTraders: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(10).default(5) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          totalSales: users.totalSales,
          rating: users.sellerRating,
          badge: users.sellerBadge,
          verified: users.isVerifiedSeller,
          xp: users.xp,
        })
        .from(users)
        .orderBy(desc(users.totalSales), desc(users.sellerRating))
        .limit(input?.limit ?? 5);
      return rows
        .filter(row => Number(row.totalSales ?? 0) > 0 || Number(row.xp ?? 0) > 0)
        .map((row, index) => ({
          rank: index + 1,
          id: row.id,
          name: row.name || `Sotuvchi #${row.id}`,
          avatarUrl: row.avatarUrl,
          totalSales: Number(row.totalSales ?? 0),
          rating: Number(row.rating ?? 0),
          badge: row.badge,
          verified: Boolean(row.verified),
          ...levelFromXp(Number(row.xp ?? 0)),
        }));
    }),

  /** Joriy foydalanuvchining darajasi, nishonlari va g'ildirak holati. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    let purchases = 0;
    if (db) {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(eq(orders.buyerId, ctx.user.id));
      purchases = Number(row?.count ?? 0);
    }
    const progress = levelFromXp(Number(user.xp ?? 0));
    return {
      ...progress,
      spinStreak: Number(user.spinStreak ?? 0),
      canSpin: canSpin(user.lastSpinAt),
      nextSpinAt: nextSpinAt(user.lastSpinAt),
      purchases,
      totalSales: Number(user.totalSales ?? 0),
      badges: buildBadges({
        totalSales: Number(user.totalSales ?? 0),
        purchases,
        spinStreak: Number(user.spinStreak ?? 0),
        level: progress.level,
        isVerifiedSeller: Boolean(user.isVerifiedSeller),
        rating: Number(user.sellerRating ?? 0),
      }),
      prizes: SPIN_PRIZES.map(prize => ({ key: prize.key, label: prize.label, emoji: prize.emoji })),
    };
  }),

  /** Kunlik omad g'ildiragi — 24 soatda bir marta. */
  spin: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canSpin(user.lastSpinAt)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "G‘ildirak 24 soatda bir marta aylanadi." });
    }

    const now = new Date();
    const { index, prize } = pickSpinPrize();
    const streak = nextSpinStreak(user.lastSpinAt, Number(user.spinStreak ?? 0), now);
    const streakBonusXp = Math.min(streak, 7) * 10;
    const totalXp = prize.xp + streakBonusXp;
    let promoCode: string | null = null;

    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({
          xp: sql`xp + ${totalXp}`,
          spinStreak: streak,
          lastSpinAt: now,
          ...(prize.cash > 0 ? { walletBalance: sql`walletBalance + ${prize.cash}` } : {}),
        })
        .where(eq(users.id, ctx.user.id));

      if (prize.cash > 0) {
        await tx.insert(transactions).values({
          userId: ctx.user.id,
          type: "referral_reward",
          amount: prize.cash.toString(),
          description: "Omad g‘ildiragi bonusi",
          status: "completed",
        });
      }

      if (prize.discountPercent > 0) {
        promoCode = buildSpinPromoCode(ctx.user.id, now);
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await tx
          .insert(promoCodes)
          .values({
            code: promoCode,
            discountPercent: prize.discountPercent,
            maxUses: 1,
            isActive: true,
            expiresAt,
          })
          .onDuplicateKeyUpdate({
            set: { discountPercent: prize.discountPercent, maxUses: sql`usedCount + 1`, isActive: true, expiresAt },
          });
      }

      await tx.insert(notifications).values({
        userId: ctx.user.id,
        type: "admin_message",
        title: "Omad g‘ildiragi",
        message: `${prize.emoji} ${prize.label}${promoCode ? ` — promo-kod: ${promoCode}` : ""}`,
      });
    });

    const fresh = await getUserById(ctx.user.id);
    const progress = levelFromXp(Number(fresh?.xp ?? 0));

    await telegramPush(
      ctx.user.id,
      [
        `🎡 Omad g‘ildiragi: ${prize.emoji} ${prize.label}`,
        `⚡ +${totalXp} XP (streak ${streak} kun)`,
        promoCode ? `🎟️ Promo-kod: ${promoCode} (7 kun amal qiladi)` : "",
        `🏅 Daraja ${progress.level} — ${progress.title}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    return {
      index,
      prize: { key: prize.key, label: prize.label, emoji: prize.emoji },
      xpGained: totalXp,
      cash: prize.cash,
      promoCode,
      streak,
      level: progress.level,
      title: progress.title,
      nextSpinAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    };
  }),
});
