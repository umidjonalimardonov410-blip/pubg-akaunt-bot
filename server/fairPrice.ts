/**
 * "Fair price" indikatori — o'xshash akkauntlar narxidan adolatli oraliq hisoblaydi.
 * Toza funksiya: DB'dan kelgan qiyoslanuvchi e'lonlar ro'yxatini oladi.
 */

export type Comparable = {
  price: number;
  level: number;
  kdRatio: number;
  ucBalance: number;
  outfitCount: number;
  gunSkinCount: number;
  hasXSuit: boolean;
  hasConquerorHistory: boolean;
  region: string;
};

export type FairVerdict = "steal" | "fair" | "high" | "overpriced" | "unknown";

export function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Akkaunt "og'irligi" — narxni normallashtirish uchun sifat ko'rsatkichi. */
export function accountWeight(account: Comparable) {
  return (
    1 +
    Math.min(2, account.level / 60) +
    Math.min(1.5, account.kdRatio / 4) +
    Math.min(1.5, account.ucBalance / 8000) +
    Math.min(1, account.outfitCount / 40) +
    Math.min(1, account.gunSkinCount / 30) +
    (account.hasXSuit ? 0.8 : 0) +
    (account.hasConquerorHistory ? 0.6 : 0)
  );
}

/**
 * Bozor medianasi va akkaunt sifatiga qarab adolatli narx oralig'ini qaytaradi.
 * Kamida 3 ta qiyoslanuvchi e'lon kerak, aks holda "unknown".
 */
export function estimateFairPrice(target: Comparable, comparables: Comparable[]) {
  const usable = comparables.filter(item => Number.isFinite(item.price) && item.price > 0);
  if (usable.length < 3) {
    return { verdict: "unknown" as FairVerdict, fair: 0, low: 0, high: 0, sampleSize: usable.length, deltaPercent: 0 };
  }

  const perWeight = median(usable.map(item => item.price / Math.max(0.5, accountWeight(item))));
  const fair = Math.round(perWeight * accountWeight(target));
  const low = Math.round(fair * 0.85);
  const high = Math.round(fair * 1.15);
  const deltaPercent = fair > 0 ? Math.round(((target.price - fair) / fair) * 100) : 0;

  let verdict: FairVerdict = "fair";
  if (deltaPercent <= -20) verdict = "steal";
  else if (deltaPercent <= 15) verdict = "fair";
  else if (deltaPercent <= 40) verdict = "high";
  else verdict = "overpriced";

  return { verdict, fair, low, high, sampleSize: usable.length, deltaPercent };
}

export const FAIR_LABELS: Record<FairVerdict, { label: string; emoji: string; tone: string }> = {
  steal: { label: "O'lja narx", emoji: "🔥", tone: "#22c55e" },
  fair: { label: "Adolatli narx", emoji: "✅", tone: "#38bdf8" },
  high: { label: "Bozordan qimmat", emoji: "⚠️", tone: "#f59e0b" },
  overpriced: { label: "Juda qimmat", emoji: "⛔", tone: "#ef4444" },
  unknown: { label: "Ma'lumot yetarli emas", emoji: "❔", tone: "#94a3b8" },
};
