/**
 * Sotuvchi ishonch reytingi va reputatsiya darajalari.
 * Toza funksiyalar — DB'siz test qilinadi.
 */

export type TrustInput = {
  rating: number;
  totalSales: number;
  completedOrders: number;
  disputes: number;
  isVerifiedSeller: boolean;
  accountAgeDays: number;
  cancelledOrders?: number;
};

export type TrustRank = {
  key: string;
  label: string;
  emoji: string;
  minScore: number;
  color: string;
};

/** Reputatsiya darajalari — PUBG ranklariga o'xshash. */
export const TRUST_RANKS: TrustRank[] = [
  { key: "conqueror", label: "Conqueror Trader", emoji: "👑", minScore: 90, color: "#f59e0b" },
  { key: "ace", label: "Ace Trader", emoji: "💎", minScore: 75, color: "#a855f7" },
  { key: "crown", label: "Crown Trader", emoji: "🔱", minScore: 60, color: "#38bdf8" },
  { key: "diamond", label: "Diamond Trader", emoji: "🛡️", minScore: 45, color: "#22d3ee" },
  { key: "gold", label: "Gold Trader", emoji: "🥇", minScore: 30, color: "#eab308" },
  { key: "bronze", label: "Bronze Trader", emoji: "🥉", minScore: 0, color: "#94a3b8" },
];

export function rankForScore(score: number): TrustRank {
  return TRUST_RANKS.find(rank => score >= rank.minScore) ?? TRUST_RANKS[TRUST_RANKS.length - 1];
}

/**
 * 0–100 ishonch bali:
 *  - reyting 35 ball, yakunlangan savdolar 30, tasdiqlanish 15,
 *  - akkaunt yoshi 10, nizo/bekor qilishlar minus 30 gacha.
 */
export function computeTrustScore(input: TrustInput) {
  const rating = Math.min(5, Math.max(0, input.rating || 0));
  const completed = Math.max(0, input.completedOrders || 0);
  const sales = Math.max(0, input.totalSales || 0);
  const disputes = Math.max(0, input.disputes || 0);
  const cancelled = Math.max(0, input.cancelledOrders || 0);
  const ageDays = Math.max(0, input.accountAgeDays || 0);

  const ratingPoints = completed + sales > 0 ? (rating / 5) * 35 : 10;
  const volumePoints = Math.min(30, Math.log10(1 + completed + sales) * 22);
  const verifiedPoints = input.isVerifiedSeller ? 15 : 0;
  const agePoints = Math.min(10, (ageDays / 180) * 10);
  const penalty = Math.min(30, disputes * 9 + cancelled * 3);

  const raw = ratingPoints + volumePoints + verifiedPoints + agePoints - penalty;
  const score = Math.round(Math.min(100, Math.max(0, raw)));
  const rank = rankForScore(score);

  return {
    score,
    rank,
    breakdown: {
      rating: Math.round(ratingPoints),
      volume: Math.round(volumePoints),
      verified: verifiedPoints,
      age: Math.round(agePoints),
      penalty: Math.round(penalty),
    },
    signals: buildTrustSignals({ ...input, rating, completed, sales, disputes, ageDays }),
  };
}

function buildTrustSignals(input: {
  rating: number;
  completed: number;
  sales: number;
  disputes: number;
  ageDays: number;
  isVerifiedSeller: boolean;
}) {
  const signals: { key: string; label: string; tone: "good" | "warn" | "bad" }[] = [];
  signals.push(
    input.isVerifiedSeller
      ? { key: "verified", label: "Hujjati tasdiqlangan sotuvchi", tone: "good" }
      : { key: "verified", label: "Hali tasdiqlanmagan sotuvchi", tone: "warn" },
  );
  if (input.sales + input.completed >= 10) signals.push({ key: "volume", label: "10+ yakunlangan savdo", tone: "good" });
  else if (input.sales + input.completed === 0) signals.push({ key: "volume", label: "Hali savdo tarixi yo'q", tone: "warn" });
  if (input.rating >= 4.7 && input.sales >= 3) signals.push({ key: "rating", label: "Yuqori reyting (4.7+)", tone: "good" });
  if (input.disputes > 0) signals.push({ key: "disputes", label: `${input.disputes} ta nizo tarixi`, tone: input.disputes > 2 ? "bad" : "warn" });
  if (input.ageDays < 7) signals.push({ key: "age", label: "Yangi akkaunt (7 kundan kam)", tone: "warn" });
  return signals;
}
