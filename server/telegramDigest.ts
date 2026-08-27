/**
 * Kunlik digest: Toshkent vaqti bilan har kuni bir marta kanalga
 * "Bugun N ta akkaunt sotildi, eng qimmati X" posti joylanadi.
 */
import { and, eq, gte, lt } from "drizzle-orm";

import { getDb } from "./db";
import { orders, pubgAccounts } from "../drizzle/schema";
import { TASHKENT_OFFSET_MS, tashkentDayKey, tashkentHour } from "./flashSale";
import { buildDailyDigestText, postDailyDigestToChannel } from "./telegramChannel";

/** Digest shu soatda (Toshkent vaqti) joylanadi. */
export const DIGEST_HOUR = Number(process.env.TELEGRAM_DIGEST_HOUR ?? 21);

export function isDigestEnabled() {
  const flag = (process.env.TELEGRAM_DAILY_DIGEST ?? "true").toLowerCase();
  return flag !== "false" && flag !== "0" && flag !== "off";
}

/** Toshkent kunining UTC boshlanishi va tugashi. */
export function tashkentDayRange(now: Date | number) {
  const shifted = new Date(new Date(now).getTime() + TASHKENT_OFFSET_MS);
  const startLocal = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 0, 0, 0, 0);
  const start = new Date(startLocal - TASHKENT_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Bugungi savdolar va yangi e'lonlar statistikasi. */
export async function collectDigestData(now = new Date()) {
  const db = await getDb();
  if (!db) return null;
  const { start, end } = tashkentDayRange(now);

  const soldRows = await db
    .select({ playerName: pubgAccounts.playerName, price: orders.price })
    .from(orders)
    .leftJoin(pubgAccounts, eq(pubgAccounts.id, orders.accountId))
    .where(and(eq(orders.status, "completed"), gte(orders.completedAt, start), lt(orders.completedAt, end)));

  const newRows = await db
    .select({ id: pubgAccounts.id })
    .from(pubgAccounts)
    .where(and(gte(pubgAccounts.createdAt, start), lt(pubgAccounts.createdAt, end)));

  return {
    dayKey: tashkentDayKey(now),
    sales: soldRows.map(row => ({ playerName: row.playerName ?? "PUBG akkaunt", price: Number(row.price ?? 0) })),
    newListings: newRows.length,
  };
}

/** Digestni hozir joylaydi (admin /digest buyrug'i ham shuni chaqiradi). */
export async function postDailyDigestNow(now = new Date()) {
  const data = await collectDigestData(now);
  if (!data) return { ok: false as const, reason: "database_unavailable" as const };
  const text = buildDailyDigestText(data);
  const result = await postDailyDigestToChannel(text);
  return { ...result, text, sales: data.sales.length };
}

let lastDigestDayKey: string | null = null;

/** Scheduler tsikli — kuniga faqat bir marta yuboradi. */
export async function runDailyDigestCycle(now = new Date()) {
  if (!isDigestEnabled()) return { posted: false as const, reason: "disabled" as const };
  if (tashkentHour(now) !== DIGEST_HOUR) return { posted: false as const, reason: "not_time" as const };
  const dayKey = tashkentDayKey(now);
  if (lastDigestDayKey === dayKey) return { posted: false as const, reason: "already_posted" as const };
  lastDigestDayKey = dayKey;
  const result = await postDailyDigestNow(now);
  return { posted: Boolean(result.ok), reason: "posted" as const };
}

/** Testlar uchun holatni tozalaydi. */
export function resetDigestState() {
  lastDigestDayKey = null;
}
