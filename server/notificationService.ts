import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { favorites, notifications, priceWatches, pubgAccounts, users } from "../drizzle/schema";
import { sendTelegramNotification } from "./telegramNotifications";

export type AlertPreferences = { telegramAlerts: boolean; priceDropAlerts: boolean };

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = { telegramAlerts: true, priceDropAlerts: true };

export function parseAlertPreferences(raw: unknown): AlertPreferences {
  if (typeof raw !== "string" || !raw.trim()) return { ...DEFAULT_ALERT_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<AlertPreferences>;
    return {
      telegramAlerts: parsed.telegramAlerts !== false,
      priceDropAlerts: parsed.priceDropAlerts !== false,
    };
  } catch {
    return { ...DEFAULT_ALERT_PREFERENCES };
  }
}

/** `openId` is stored as `telegram:<chatId>` for Telegram Mini App users. */
export function telegramChatIdFromOpenId(openId?: string | null) {
  if (!openId || !openId.startsWith("telegram:")) return null;
  const chatId = openId.slice("telegram:".length).trim();
  return chatId || null;
}

export function formatPriceDropText(playerName: string, oldPrice: number, newPrice: number) {
  const money = (value: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(value));
  const percent = oldPrice > 0 ? Math.round(((oldPrice - newPrice) / oldPrice) * 100) : 0;
  return `🔻 Narx tushdi: ${playerName}\n${money(oldPrice)} → ${money(newPrice)} so'm (-${percent}%)`;
}

export function formatAuctionCountdown(endsAt: Date, now = new Date()) {
  const diff = endsAt.getTime() - now.getTime();
  if (diff <= 0) return { ended: true, totalMs: 0, label: "Tugadi" };
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  const label = hours > 0 ? `${hours} soat ${minutes} daqiqa` : minutes > 0 ? `${minutes} daqiqa ${seconds} soniya` : `${seconds} soniya`;
  return { ended: false, totalMs: diff, label };
}

type PushInput = {
  userId: number;
  type: "new_listing" | "order_status" | "review_received" | "dispute_alert" | "admin_message" | "price_drop" | "auction_ending" | "dispute_update";
  title: string;
  message: string;
  accountId?: number;
  orderId?: number;
  telegramText?: string;
};

/**
 * Stores an in-app notification and, when the user allows it, mirrors the alert
 * to Telegram as a push message.
 */
export async function pushNotification(input: PushInput) {
  const db = await getDb();
  if (!db) return { stored: false, pushed: false };

  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    accountId: input.accountId ?? null,
    orderId: input.orderId ?? null,
  });

  const rows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  const user = rows[0];
  if (!user) return { stored: true, pushed: false };

  const prefs = parseAlertPreferences((user as any).alertPreferences);
  if (!prefs.telegramAlerts) return { stored: true, pushed: false };
  if (input.type === "price_drop" && !prefs.priceDropAlerts) return { stored: true, pushed: false };

  const chatId = telegramChatIdFromOpenId(user.openId);
  if (!chatId) return { stored: true, pushed: false };

  const result = await sendTelegramNotification({
    chatId,
    text: input.telegramText ?? `${input.title}\n${input.message}`,
  }).catch(() => ({ sent: false as const }));

  return { stored: true, pushed: Boolean(result?.sent) };
}

/**
 * Notifies every watcher (explicit price watch + saved/favorite users) when a
 * listing price is lowered.
 */
export async function notifyPriceDrop(accountId: number, oldPrice: number, newPrice: number) {
  if (!(newPrice < oldPrice)) return { notified: 0 };
  const db = await getDb();
  if (!db) return { notified: 0 };

  const accountRows = await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, accountId)).limit(1);
  const account = accountRows[0];
  if (!account) return { notified: 0 };

  const [watchRows, favoriteRows] = await Promise.all([
    db.select().from(priceWatches).where(and(eq(priceWatches.accountId, accountId), eq(priceWatches.isActive, true))),
    db.select().from(favorites).where(eq(favorites.accountId, accountId)),
  ]);

  const targets = new Map<number, number | null>();
  for (const row of favoriteRows) targets.set(row.userId, null);
  for (const row of watchRows) targets.set(row.userId, row.targetPrice === null ? null : Number(row.targetPrice));

  let notified = 0;
  for (const [userId, targetPrice] of Array.from(targets.entries())) {
    if (userId === account.sellerId) continue;
    if (targetPrice !== null && newPrice > targetPrice) continue;
    await pushNotification({
      userId,
      type: "price_drop",
      title: "Kuzatuvdagi akkaunt narxi tushdi",
      message: formatPriceDropText(account.playerName, oldPrice, newPrice),
      accountId,
      telegramText: formatPriceDropText(account.playerName, oldPrice, newPrice),
    });
    notified += 1;
  }

  if (watchRows.length) {
    await db.update(priceWatches)
      .set({ lastNotifiedPrice: newPrice.toString() })
      .where(inArray(priceWatches.id, watchRows.map(row => row.id)));
  }

  return { notified };
}
