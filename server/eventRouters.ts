/**
 * Flash-sale va Mystery Box uchun tRPC yo'llari.
 * Ikkala funksiya ham wallet balansi va bazadagi limitlar bilan ishlaydi.
 */
import { z } from "zod";
import { and, desc, eq, gt, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb, getUserById } from "./db";
import {
  flashSales,
  mysteryBoxOpens,
  notifications,
  promoCodes,
  pubgAccounts,
  transactions,
  users,
} from "../drizzle/schema";
import { countdownLabel, nextFlashStart, tashkentDayKey } from "./flashSale";
import {
  MYSTERY_ACCOUNT_MAX_PRICE,
  MYSTERY_BOX_PRICE,
  MYSTERY_DAILY_GLOBAL_LIMIT,
  MYSTERY_DAILY_USER_LIMIT,
  MYSTERY_PROMO_PERCENT,
  MYSTERY_PROMO_TTL_MS,
  checkMysteryAvailability,
  generateBoxCode,
  prizeLabel,
  rollMysteryPrize,
  rollUcAmount,
  type MysteryPrizeKind,
} from "./mysteryBox";
import { runFlashSaleCycle, startFlashSaleNow } from "./eventScheduler";
import { sendTelegramNotification } from "./telegramNotifications";

async function pushTelegram(userId: number, text: string) {
  const user = await getUserById(userId);
  if (!user?.openId?.startsWith("telegram:")) return;
  await sendTelegramNotification({ chatId: user.openId.slice("telegram:".length), text }).catch(() => undefined);
}

/** Hozir faol bo'lgan flash-sale e'lonlari (akkaunt ma'lumotlari bilan). */
export async function listActiveFlashSales(now = new Date()) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: flashSales.id,
      accountId: flashSales.accountId,
      originalPrice: flashSales.originalPrice,
      salePrice: flashSales.salePrice,
      discountPercent: flashSales.discountPercent,
      endsAt: flashSales.endsAt,
      playerName: pubgAccounts.playerName,
      level: pubgAccounts.level,
      region: pubgAccounts.region,
      thumbnailUrl: pubgAccounts.thumbnailUrl,
      isVerified: pubgAccounts.isVerified,
      status: pubgAccounts.status,
    })
    .from(flashSales)
    .innerJoin(pubgAccounts, eq(pubgAccounts.id, flashSales.accountId))
    .where(and(eq(flashSales.status, "active"), gt(flashSales.endsAt, now)))
    .orderBy(desc(flashSales.discountPercent));

  return rows.map(row => ({
    ...row,
    originalPrice: Number(row.originalPrice),
    salePrice: Number(row.salePrice),
    endsAt: row.endsAt,
    msLeft: Math.max(0, new Date(row.endsAt).getTime() - now.getTime()),
  }));
}

export const eventsRouter = router({
  /** Flash-sale: 1 soatlik chegirmalar. */
  flash: router({
    active: publicProcedure.query(async () => {
      const now = new Date();
      const items = await listActiveFlashSales(now);
      const next = nextFlashStart(now);
      return {
        items,
        serverTime: now.toISOString(),
        nextStart: next.toISOString(),
        nextStartLabel: countdownLabel(next.getTime() - now.getTime()),
      };
    }),
    /** Admin uchun: aksiyani darhol boshlash (test va marketing uchun). */
    trigger: adminProcedure.mutation(async () => {
      const started = await startFlashSaleNow(new Date());
      return { started };
    }),
    /** Admin uchun: tugagan aksiyalarni majburan yakunlash. */
    sweep: adminProcedure.mutation(async () => {
      const result = await runFlashSaleCycle(new Date());
      return result;
    }),
  }),

  /** Mystery Box: 50 000 so'mlik noma'lum quti. */
  mystery: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      const dayKey = tashkentDayKey(new Date());
      if (!db) {
        return {
          price: MYSTERY_BOX_PRICE,
          balance: 0,
          globalRemaining: MYSTERY_DAILY_GLOBAL_LIMIT,
          userRemaining: MYSTERY_DAILY_USER_LIMIT,
          canOpen: false,
          history: [] as { prize: MysteryPrizeKind; prizeLabel: string; createdAt: Date }[],
        };
      }
      const [globalRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(mysteryBoxOpens)
        .where(eq(mysteryBoxOpens.dayKey, dayKey));
      const [userRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(mysteryBoxOpens)
        .where(and(eq(mysteryBoxOpens.dayKey, dayKey), eq(mysteryBoxOpens.userId, ctx.user.id)));
      const history = await db
        .select({ prize: mysteryBoxOpens.prize, prizeLabel: mysteryBoxOpens.prizeLabel, createdAt: mysteryBoxOpens.createdAt })
        .from(mysteryBoxOpens)
        .where(eq(mysteryBoxOpens.userId, ctx.user.id))
        .orderBy(desc(mysteryBoxOpens.createdAt))
        .limit(10);

      const availability = checkMysteryAvailability({
        globalToday: Number(globalRow?.count ?? 0),
        userToday: Number(userRow?.count ?? 0),
      });
      const fresh = await getUserById(ctx.user.id);
      const balance = Number(fresh?.walletBalance ?? 0);
      return {
        price: MYSTERY_BOX_PRICE,
        balance,
        globalRemaining: availability.globalRemaining,
        userRemaining: availability.userRemaining,
        canOpen: availability.canOpen && balance >= MYSTERY_BOX_PRICE,
        history,
      };
    }),

    open: protectedProcedure.input(z.object({}).optional()).mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Baza vaqtincha ishlamayapti." });
      const dayKey = tashkentDayKey(new Date());

      const [globalRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(mysteryBoxOpens)
        .where(eq(mysteryBoxOpens.dayKey, dayKey));
      const [userRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(mysteryBoxOpens)
        .where(and(eq(mysteryBoxOpens.dayKey, dayKey), eq(mysteryBoxOpens.userId, ctx.user.id)));
      const availability = checkMysteryAvailability({
        globalToday: Number(globalRow?.count ?? 0),
        userToday: Number(userRow?.count ?? 0),
      });
      if (!availability.canOpen) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            availability.reason === "global_limit"
              ? "Bugungi qutilar tugadi. Ertaga yangi partiya chiqadi."
              : "Bugun uchun quti limitingiz tugadi (3 ta).",
        });
      }

      const fresh = await getUserById(ctx.user.id);
      const balance = Number(fresh?.walletBalance ?? 0);
      if (balance < MYSTERY_BOX_PRICE) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Balans yetarli emas. Avval hisobni to'ldiring." });
      }

      // Pulni yechish — limit tekshiruvidan keyin, sovrin berishdan oldin.
      await db
        .update(users)
        .set({ walletBalance: sql`${users.walletBalance} - ${MYSTERY_BOX_PRICE}` })
        .where(eq(users.id, ctx.user.id));
      await db.insert(transactions).values({
        userId: ctx.user.id,
        type: "order_payment",
        amount: String(MYSTERY_BOX_PRICE),
        description: "Mystery Box",
        status: "completed",
      });

      let kind = rollMysteryPrize();
      let rewardCode: string | null = null;
      let accountId: number | null = null;
      let detail: string | undefined;

      if (kind === "account") {
        const [cheap] = await db
          .select({ id: pubgAccounts.id, playerName: pubgAccounts.playerName })
          .from(pubgAccounts)
          .where(and(eq(pubgAccounts.status, "available"), lte(pubgAccounts.price, String(MYSTERY_ACCOUNT_MAX_PRICE))))
          .orderBy(sql`rand()`)
          .limit(1);
        if (cheap) {
          accountId = cheap.id;
          detail = cheap.playerName;
          await db.update(pubgAccounts).set({ status: "sold" }).where(eq(pubgAccounts.id, cheap.id));
        } else {
          // Mos akkaunt topilmasa foydalanuvchi zarar ko'rmasin: promo kodga almashtiriladi.
          kind = "promo";
        }
      }

      if (kind === "promo") {
        rewardCode = generateBoxCode("BOX");
        detail = rewardCode;
        await db.insert(promoCodes).values({
          code: rewardCode,
          discountPercent: MYSTERY_PROMO_PERCENT,
          maxUses: 1,
          isActive: true,
          expiresAt: new Date(Date.now() + MYSTERY_PROMO_TTL_MS),
        });
      }

      let ucAmount = 0;
      if (kind === "uc") {
        ucAmount = rollUcAmount();
        rewardCode = generateBoxCode("UC");
        detail = String(ucAmount);
      }

      const label = prizeLabel(kind, detail);
      await db.insert(mysteryBoxOpens).values({
        userId: ctx.user.id,
        dayKey,
        price: String(MYSTERY_BOX_PRICE),
        prize: kind,
        prizeLabel: label,
        rewardCode,
        accountId,
      });
      await db.insert(notifications).values({
        userId: ctx.user.id,
        type: "admin_message",
        title: "Mystery Box",
        message: label,
      });
      await pushTelegram(ctx.user.id, `🎁 Mystery Box ochildi!\n\n${label}`);

      return { prize: kind, label, rewardCode, accountId, ucAmount, remaining: availability.userRemaining - 1 };
    }),
  }),
});
