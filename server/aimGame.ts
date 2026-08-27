/**
 * "Aim Trainer Discount" — yangi foydalanuvchi uchun bir martalik mini-o'yin.
 * Ball serverda hisoblanadi: klient faqat tegish vaqtlarini yuboradi.
 * Toza funksiyalar — bazasiz test qilinadi.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** O'yin davomiyligi (ms). */
export const AIM_DURATION_MS = 15_000;
/** Tarmoq kechikishi uchun qo'shimcha vaqt. */
export const AIM_GRACE_MS = 2_500;
/** Ikki tegish orasidagi eng kichik inson-real interval (ms). */
export const AIM_MIN_GAP_MS = 110;
/** Bundan ortiq tegish = bot/skript. */
export const AIM_MAX_HITS = 40;
/** Token amal qilish muddati. */
export const AIM_TOKEN_TTL_MS = 60_000;

export type AimTier = { minScore: number; discountPercent: number; label: string };

/** Chegirma pog'onalari — yuqoridan pastga tekshiriladi. */
export const AIM_TIERS: AimTier[] = [
  { minScore: 10, discountPercent: 5, label: "Conqueror aim" },
  { minScore: 7, discountPercent: 3, label: "Ace aim" },
  { minScore: 4, discountPercent: 2, label: "Diamond aim" },
];

export function aimTierFor(score: number): AimTier | null {
  return AIM_TIERS.find(tier => score >= tier.minScore) ?? null;
}

function secret() {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || "inferno-aim-trainer-secret";
}

/** Sessiya tokeni: `userId.issuedAt.signature`. */
export function signAimToken(userId: number, issuedAt = Date.now()) {
  const payload = `${userId}.${issuedAt}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
  return `${payload}.${signature}`;
}

export function verifyAimToken(token: string, userId: number, now = Date.now()) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [rawUserId, rawIssuedAt, signature] = parts;
  if (Number(rawUserId) !== userId) return null;
  const issuedAt = Number(rawIssuedAt);
  if (!Number.isFinite(issuedAt)) return null;
  if (now - issuedAt > AIM_TOKEN_TTL_MS || issuedAt - now > 5_000) return null;
  const expected = createHmac("sha256", secret()).update(`${rawUserId}.${rawIssuedAt}`).digest("hex").slice(0, 32);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { userId, issuedAt };
}

export type AimScoreResult = {
  score: number;
  rejected: number;
  discountPercent: number;
  tierLabel: string | null;
};

/**
 * Tegish vaqtlaridan (o'yin boshidan beri ms) haqiqiy ballni hisoblaydi.
 * Juda tez ketma-ket kelgan, oraliqdan tashqari yoki takrorlangan kliklar tashlanadi.
 */
export function scoreAimHits(hits: number[]): AimScoreResult {
  const sorted = [...hits].filter(value => Number.isFinite(value)).sort((a, b) => a - b);
  let last = -Infinity;
  let score = 0;
  let rejected = 0;
  for (const hit of sorted) {
    if (hit < 0 || hit > AIM_DURATION_MS + AIM_GRACE_MS) {
      rejected += 1;
      continue;
    }
    if (hit - last < AIM_MIN_GAP_MS) {
      rejected += 1;
      continue;
    }
    last = hit;
    score += 1;
  }
  if (score > AIM_MAX_HITS) {
    rejected += score - AIM_MAX_HITS;
    score = AIM_MAX_HITS;
  }
  const tier = aimTierFor(score);
  return {
    score,
    rejected,
    discountPercent: tier?.discountPercent ?? 0,
    tierLabel: tier?.label ?? null,
  };
}

/** Promo-kod: AIM5-7F3K ko'rinishida. */
export function buildAimPromoCode(userId: number, discountPercent: number, now = Date.now()) {
  const raw = createHmac("sha256", secret())
    .update(`aim:${userId}:${now}`)
    .digest("hex")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return `AIM${discountPercent}-${raw.slice(0, 4)}${(userId % 100).toString().padStart(2, "0")}`;
}

/** Promo amal qilish muddati — 24 soat. */
export const AIM_PROMO_TTL_MS = 24 * 60 * 60 * 1000;
