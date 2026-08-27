/**
 * "Mystery Box" — 50 000 so'mlik noma'lum quti.
 * Ichidan chiqishi mumkin: arzon akkaunt, 10% chegirma kodi, UC kodi yoki bo'sh quti.
 *
 * Toza funksiyalar: ehtimollik va limitlar bazasiz test qilinadi.
 */

/** Quti narxi (so'm). */
export const MYSTERY_BOX_PRICE = 50_000;
/** Kunlik umumiy limit — kuniga shuncha quti sotiladi. */
export const MYSTERY_DAILY_GLOBAL_LIMIT = 50;
/** Bitta foydalanuvchi uchun kunlik limit. */
export const MYSTERY_DAILY_USER_LIMIT = 3;
/** Quti ichidan chiqadigan akkauntning maksimal narxi. */
export const MYSTERY_ACCOUNT_MAX_PRICE = 400_000;
/** Chegirma kodi foizi. */
export const MYSTERY_PROMO_PERCENT = 10;
/** Chegirma kodi amal qilish muddati. */
export const MYSTERY_PROMO_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type MysteryPrizeKind = "account" | "promo" | "uc" | "empty";

export type MysteryPrizeWeight = { kind: MysteryPrizeKind; weight: number };

/** Ehtimolliklar: bo'sh quti eng ko'p, akkaunt eng kam. */
export const MYSTERY_WEIGHTS: MysteryPrizeWeight[] = [
  { kind: "empty", weight: 40 },
  { kind: "promo", weight: 30 },
  { kind: "uc", weight: 25 },
  { kind: "account", weight: 5 },
];

/** UC nominal qiymatlari. */
export const MYSTERY_UC_AMOUNTS = [60, 120, 325] as const;

export type Rng = () => number;

function clampRandom(rng: Rng): number {
  const value = rng();
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.999999, value));
}

/** Og'irliklar bo'yicha sovrin turini tanlaydi. */
export function rollMysteryPrize(rng: Rng = Math.random, weights = MYSTERY_WEIGHTS): MysteryPrizeKind {
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let ticket = clampRandom(rng) * total;
  for (const entry of weights) {
    ticket -= entry.weight;
    if (ticket < 0) return entry.kind;
  }
  return weights[weights.length - 1]?.kind ?? "empty";
}

/** Tasodifiy UC nominali. */
export function rollUcAmount(rng: Rng = Math.random): number {
  const index = Math.floor(clampRandom(rng) * MYSTERY_UC_AMOUNTS.length);
  return MYSTERY_UC_AMOUNTS[index] ?? MYSTERY_UC_AMOUNTS[0];
}

/** Ko'rinadigan, chalkashtirmaydigan kod (0/O/1/I yo'q). */
export function generateBoxCode(prefix: string, length = 6, rng: Rng = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(clampRandom(rng) * alphabet.length)];
  }
  return `${prefix}-${out}`;
}

export type MysteryLimitState = {
  globalToday: number;
  userToday: number;
};

export type MysteryAvailability = {
  canOpen: boolean;
  reason: "ok" | "global_limit" | "user_limit";
  globalRemaining: number;
  userRemaining: number;
};

/** Kunlik limitlarni tekshiradi. */
export function checkMysteryAvailability(state: MysteryLimitState): MysteryAvailability {
  const globalRemaining = Math.max(0, MYSTERY_DAILY_GLOBAL_LIMIT - state.globalToday);
  const userRemaining = Math.max(0, MYSTERY_DAILY_USER_LIMIT - state.userToday);
  if (globalRemaining <= 0) return { canOpen: false, reason: "global_limit", globalRemaining, userRemaining };
  if (userRemaining <= 0) return { canOpen: false, reason: "user_limit", globalRemaining, userRemaining };
  return { canOpen: true, reason: "ok", globalRemaining, userRemaining };
}

/** Sovrin uchun foydalanuvchiga ko'rinadigan matn. */
export function prizeLabel(kind: MysteryPrizeKind, detail?: string): string {
  if (kind === "account") return `Akkaunt: ${detail ?? "sovg'a akkaunt"}`;
  if (kind === "promo") return `${MYSTERY_PROMO_PERCENT}% chegirma kodi: ${detail ?? ""}`.trim();
  if (kind === "uc") return `${detail ?? "60"} UC kodi`;
  return "Bo'sh quti — omad keyingi safar";
}
