/**
 * Flash-sale avtomatikasi: har daqiqada tekshiradi.
 *  - Toshkent vaqti 20:00 bo'lsa va bugun aksiya bo'lmagan bo'lsa — 3 ta akkauntga
 *    10-15% chegirma qo'yadi va Telegram orqali xabar yuboradi.
 *  - Muddati tugagan aksiyalarda narxni avtomatik asl holiga qaytaradi.
 */
import { and, eq, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { flashSales, notifications, pubgAccounts, users } from "../drizzle/schema";
import {
  FLASH_SALE_DURATION_MS,
  FLASH_SALE_SLOTS,
  discountedPrice,
  isFlashWindow,
  rollDiscountPercent,
  selectFlashAccounts,
  tashkentDayKey,
} from "./flashSale";
import { sendTelegramNotification } from "./telegramNotifications";
import { runDailyDigestCycle } from "./telegramDigest";

/** Bitta xabar to'lqinida ko'pi bilan shuncha foydalanuvchiga yuboriladi. */
export const FLASH_BROADCAST_LIMIT = 300;

const money = (value: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(value));

/** Muddati tugagan aksiyalarni yopadi va narxlarni tiklaydi. */
export async function endExpiredFlashSales(now = new Date()) {
  const db = await getDb();
  if (!db) return 0;
  const expired = await db
    .select()
    .from(flashSales)
    .where(and(eq(flashSales.status, "active"), lte(flashSales.endsAt, now)));
  for (const sale of expired) {
    await db
      .update(pubgAccounts)
      .set({ price: String(sale.originalPrice) })
      .where(eq(pubgAccounts.id, sale.accountId));
    await db.update(flashSales).set({ status: "ended" }).where(eq(flashSales.id, sale.id));
  }
  return expired.length;
}

/** Aksiya haqida Telegram foydalanuvchilariga xabar yuboradi. */
async function broadcast(text: string) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: users.id, openId: users.openId })
    .from(users)
    .where(sql`${users.openId} like 'telegram:%'`)
    .limit(FLASH_BROADCAST_LIMIT);
  let sent = 0;
  for (const row of rows) {
    const chatId = row.openId.slice("telegram:".length);
    const result = await sendTelegramNotification({ chatId, text }).catch(() => null);
    if (result?.sent) sent += 1;
    await db.insert(notifications).values({
      userId: row.id,
      type: "price_drop",
      title: "Flash-sale boshlandi",
      message: text,
    });
    // Telegram limitiga urilmaslik uchun kichik pauza.
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  return sent;
}

/** Aksiyani darhol boshlaydi (scheduler ham, admin tugmasi ham shuni chaqiradi). */
export async function startFlashSaleNow(now = new Date()) {
  const db = await getDb();
  if (!db) return 0;
  const dayKey = tashkentDayKey(now);
  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(flashSales)
    .where(eq(flashSales.dayKey, dayKey));
  if (Number(existing?.count ?? 0) > 0) return 0;

  const candidates = await db
    .select({
      id: pubgAccounts.id,
      price: pubgAccounts.price,
      playerName: pubgAccounts.playerName,
      viewCount: pubgAccounts.viewCount,
      isVerified: pubgAccounts.isVerified,
    })
    .from(pubgAccounts)
    .where(eq(pubgAccounts.status, "available"))
    .limit(200);
  if (candidates.length === 0) return 0;

  const chosen = selectFlashAccounts(
    candidates.map(row => ({ ...row, price: Number(row.price) })),
    FLASH_SALE_SLOTS,
  );
  const endsAt = new Date(now.getTime() + FLASH_SALE_DURATION_MS);
  const lines: string[] = [];

  for (const account of chosen) {
    const percent = rollDiscountPercent();
    const salePrice = discountedPrice(account.price, percent);
    await db.insert(flashSales).values({
      accountId: account.id,
      originalPrice: String(account.price),
      salePrice: String(salePrice),
      discountPercent: percent,
      dayKey,
      startsAt: now,
      endsAt,
      status: "active",
    });
    await db.update(pubgAccounts).set({ price: String(salePrice) }).where(eq(pubgAccounts.id, account.id));
    lines.push(`• ${account.playerName} — ${money(account.price)} ➜ ${money(salePrice)} so'm (-${percent}%)`);
  }

  await broadcast(
    `⚡️ FLASH-SALE BOSHLANDI — atigi 1 soat!\n\n${lines.join("\n")}\n\nVaqt tugashi bilan narx avtomatik qaytadi. Shoshiling!`,
  );
  return chosen.length;
}

/** Bir tsikl: tugaganlarini yopadi, vaqti kelsa yangisini boshlaydi. */
export async function runFlashSaleCycle(now = new Date()) {
  const ended = await endExpiredFlashSales(now);
  const started = isFlashWindow(now) ? await startFlashSaleNow(now) : 0;
  const digest = await runDailyDigestCycle(now).catch(() => ({ posted: false as const }));
  return { ended, started, digest: digest.posted };
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Serverda davriy tekshiruvni yoqadi (har 60 soniya). */
export function startEventScheduler(intervalMs = 60_000) {
  if (timer) return timer;
  timer = setInterval(() => {
    runFlashSaleCycle(new Date()).catch(error => console.error("[FlashSale] cycle failed:", error));
  }, intervalMs);
  // Node jarayonini ushlab turmasin.
  if (typeof timer.unref === "function") timer.unref();
  runFlashSaleCycle(new Date()).catch(error => console.error("[FlashSale] initial cycle failed:", error));
  return timer;
}

export function stopEventScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
