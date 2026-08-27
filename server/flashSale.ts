/**
 * "1 soatlik flash-sale" — har kuni Toshkent vaqti bilan 20:00 da 3 ta akkauntga
 * 10-15% chegirma beriladi va aynan 1 soatdan keyin narx avtomatik tiklanadi.
 *
 * Bu modul faqat toza (bazasiz) funksiyalardan iborat, shuning uchun
 * rejalashtirish mantiqi to'liq test qilinadi.
 */

/** Toshkent UTC+5 — server qaysi zonada bo'lishidan qat'i nazar barqaror hisob. */
export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
/** Flash-sale har kuni shu soatda boshlanadi (Toshkent vaqti). */
export const FLASH_SALE_HOUR = 20;
/** Aksiya davomiyligi — aniq 1 soat. */
export const FLASH_SALE_DURATION_MS = 60 * 60 * 1000;
/** Bir aksiyada nechta akkaunt chegirmaga tushadi. */
export const FLASH_SALE_SLOTS = 3;
/** Chegirma oralig'i (foizda). */
export const FLASH_MIN_DISCOUNT = 10;
export const FLASH_MAX_DISCOUNT = 15;

export type Rng = () => number;

/** Toshkent vaqtidagi kun kaliti (`YYYY-MM-DD`) — kuniga bir marta ishga tushirish uchun. */
export function tashkentDayKey(date: Date | number): string {
  const shifted = new Date(new Date(date).getTime() + TASHKENT_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/** Toshkent vaqtidagi soat (0-23). */
export function tashkentHour(date: Date | number): number {
  return new Date(new Date(date).getTime() + TASHKENT_OFFSET_MS).getUTCHours();
}

/** Bugungi aksiya oynasi ochiqmi (20:00 dan 21:00 gacha). */
export function isFlashWindow(date: Date | number): boolean {
  return tashkentHour(date) === FLASH_SALE_HOUR;
}

/** Keyingi 20:00 (UTC Date) — countdown va "keyingi aksiya" bloki uchun. */
export function nextFlashStart(from: Date | number): Date {
  const now = new Date(from).getTime();
  const local = new Date(now + TASHKENT_OFFSET_MS);
  const startLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    FLASH_SALE_HOUR,
    0,
    0,
    0,
  );
  const startUtc = startLocal - TASHKENT_OFFSET_MS;
  return new Date(startUtc > now ? startUtc : startUtc + 24 * 60 * 60 * 1000);
}

/** 10-15% oralig'idagi chegirma. */
export function rollDiscountPercent(rng: Rng = Math.random): number {
  const span = FLASH_MAX_DISCOUNT - FLASH_MIN_DISCOUNT + 1;
  return FLASH_MIN_DISCOUNT + Math.floor(Math.max(0, Math.min(0.999999, rng())) * span);
}

/** Chegirmali narx — 1000 so'mgacha yaxlitlanadi, 1000 dan past tushmaydi. */
export function discountedPrice(price: number, percent: number): number {
  const raw = price * (1 - percent / 100);
  return Math.max(1000, Math.round(raw / 1000) * 1000);
}

export type FlashCandidate = {
  id: number;
  price: number;
  viewCount?: number;
  isVerified?: boolean;
};

/**
 * Nomzodlardan `slots` ta akkauntni tanlaydi: ko'rishlar va tasdiqlanganlik
 * ustunlik beradi, tenglikda esa tasodifiy aralashtirish ishlaydi.
 */
export function selectFlashAccounts<T extends FlashCandidate>(
  candidates: T[],
  slots = FLASH_SALE_SLOTS,
  rng: Rng = Math.random,
): T[] {
  const scored = candidates
    .filter(item => Number(item.price) > 0)
    .map(item => ({
      item,
      score: (Number(item.viewCount ?? 0) + 1) * (item.isVerified ? 1.5 : 1) * (0.5 + rng()),
    }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(0, slots)).map(entry => entry.item);
}

/** `01:23:45` ko'rinishidagi countdown matni. */
export function countdownLabel(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
