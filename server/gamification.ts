/**
 * Gamification core: XP/level math, badges and the daily "omad g'ildiragi".
 * Pure functions here so they can be unit tested without a database.
 */

export type SpinPrize = {
  key: string;
  label: string;
  emoji: string;
  weight: number;
  xp: number;
  /** Wallet bonus in so'm. */
  cash: number;
  /** Personal promo discount percent (0 = no promo). */
  discountPercent: number;
};

/** Wheel segments — order matters, the client renders them in this order. */
export const SPIN_PRIZES: SpinPrize[] = [
  { key: "xp_50", label: "50 XP", emoji: "⚡", weight: 26, xp: 50, cash: 0, discountPercent: 0 },
  { key: "promo_5", label: "5% chegirma", emoji: "🎟️", weight: 18, xp: 20, cash: 0, discountPercent: 5 },
  { key: "cash_2000", label: "2 000 so'm", emoji: "💰", weight: 14, xp: 20, cash: 2000, discountPercent: 0 },
  { key: "xp_150", label: "150 XP", emoji: "🔥", weight: 14, xp: 150, cash: 0, discountPercent: 0 },
  { key: "promo_10", label: "10% chegirma", emoji: "🎫", weight: 10, xp: 30, cash: 0, discountPercent: 10 },
  { key: "cash_10000", label: "10 000 so'm", emoji: "💎", weight: 6, xp: 40, cash: 10000, discountPercent: 0 },
  { key: "xp_300", label: "300 XP", emoji: "🚀", weight: 8, xp: 300, cash: 0, discountPercent: 0 },
  { key: "promo_15", label: "15% chegirma", emoji: "👑", weight: 4, xp: 60, cash: 0, discountPercent: 15 },
];

export const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Deterministic when `roll` is supplied (tests); otherwise weighted-random. */
export function pickSpinPrize(roll = Math.random()) {
  const total = SPIN_PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let cursor = Math.min(Math.max(roll, 0), 0.999999) * total;
  for (let index = 0; index < SPIN_PRIZES.length; index += 1) {
    cursor -= SPIN_PRIZES[index].weight;
    if (cursor < 0) return { index, prize: SPIN_PRIZES[index] };
  }
  return { index: 0, prize: SPIN_PRIZES[0] };
}

export function canSpin(lastSpinAt?: Date | string | null, now = new Date()) {
  if (!lastSpinAt) return true;
  const last = lastSpinAt instanceof Date ? lastSpinAt : new Date(lastSpinAt);
  if (Number.isNaN(last.getTime())) return true;
  return now.getTime() - last.getTime() >= SPIN_COOLDOWN_MS;
}

export function nextSpinAt(lastSpinAt?: Date | string | null) {
  if (!lastSpinAt) return null;
  const last = lastSpinAt instanceof Date ? lastSpinAt : new Date(lastSpinAt);
  if (Number.isNaN(last.getTime())) return null;
  return new Date(last.getTime() + SPIN_COOLDOWN_MS);
}

export const LEVEL_TITLES = [
  "Rookie",
  "Scavenger",
  "Raider",
  "Hunter",
  "Ace",
  "Predator",
  "Conqueror",
  "Inferno Legend",
] as const;

/** Level curve: level N needs 250 * N * (N+1) / 2 total XP. */
export function levelFromXp(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  while (level < 60 && safeXp >= totalXpForLevel(level + 1)) level += 1;
  const currentFloor = totalXpForLevel(level);
  const nextFloor = totalXpForLevel(level + 1);
  const title = LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 3))];
  return {
    level,
    title,
    xp: safeXp,
    intoLevel: safeXp - currentFloor,
    levelSpan: nextFloor - currentFloor,
    nextLevelXp: nextFloor,
    progress: Math.min(1, (safeXp - currentFloor) / Math.max(1, nextFloor - currentFloor)),
  };
}

export function totalXpForLevel(level: number) {
  const n = Math.max(1, level) - 1;
  return (250 * n * (n + 1)) / 2;
}

export type BadgeState = { key: string; label: string; emoji: string; earned: boolean; hint: string };

export function buildBadges(input: {
  totalSales: number;
  purchases: number;
  spinStreak: number;
  level: number;
  isVerifiedSeller: boolean;
  rating: number;
}): BadgeState[] {
  return [
    { key: "first_deal", label: "Birinchi savdo", emoji: "🎯", earned: input.purchases + input.totalSales >= 1, hint: "Birinchi kafolatli savdoni yakunlang" },
    { key: "trader", label: "Savdogar", emoji: "🤝", earned: input.purchases + input.totalSales >= 5, hint: "5 ta savdo yakunlang" },
    { key: "verified", label: "Tasdiqlangan", emoji: "🛡️", earned: input.isVerifiedSeller, hint: "Sotuvchi tekshiruvidan o'ting" },
    { key: "streak_3", label: "3 kun streak", emoji: "🔥", earned: input.spinStreak >= 3, hint: "3 kun ketma-ket g'ildirakni aylantiring" },
    { key: "streak_7", label: "Haftalik streak", emoji: "⚔️", earned: input.spinStreak >= 7, hint: "7 kun ketma-ket kiring" },
    { key: "level_5", label: "5-daraja", emoji: "⭐", earned: input.level >= 5, hint: "5-darajaga chiqing" },
    { key: "top_rated", label: "Top reyting", emoji: "👑", earned: input.rating >= 4.8 && input.totalSales >= 3, hint: "4.8+ reyting va 3 savdo" },
  ];
}

/** Streak continues when the previous spin was within the last 48 hours. */
export function nextSpinStreak(lastSpinAt: Date | string | null | undefined, current: number, now = new Date()) {
  if (!lastSpinAt) return 1;
  const last = lastSpinAt instanceof Date ? lastSpinAt : new Date(lastSpinAt);
  if (Number.isNaN(last.getTime())) return 1;
  const diff = now.getTime() - last.getTime();
  return diff <= 2 * SPIN_COOLDOWN_MS ? Math.max(1, current) + 1 : 1;
}

export function buildSpinPromoCode(userId: number, now = new Date()) {
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `SPIN${userId}${stamp}`;
}
