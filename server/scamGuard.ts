/**
 * Anti-scam skaner: e'lon matni, narxi va statistikasidagi shubhali belgilarni topadi.
 * Ball 0–100 (yuqori = xavfli). Toza funksiya.
 */

export type ScamInput = {
  description?: string | null;
  playerName: string;
  price: number;
  marketMedian?: number;
  level: number;
  kdRatio: number;
  winRate: number;
  totalMatches: number;
  ucBalance: number;
  galleryCount: number;
  hasVideo: boolean;
  sellerTotalSales: number;
  sellerIsVerified: boolean;
  sellerAccountAgeDays: number;
};

export type ScamFlag = { key: string; label: string; weight: number };

const CONTACT_PATTERNS = [/t\.me\//i, /telegram\.me/i, /whatsapp/i, /@[a-z0-9_]{4,}/i, /\+998\s?\d{2}/, /\bimo\b/i];
const OFFSITE_PATTERNS = [/tashqarida/i, /bevosita/i, /karta.?ga/i, /card.?ga/i, /naqd/i, /qo'?ldan/i, /vne sayta/i, /напрямую/i, /без бота/i];
const URGENCY_PATTERNS = [/shoshilinch/i, /tez sot/i, /bugun.?gacha/i, /faqat bugun/i, /срочно/i];

export function scanListing(input: ScamInput) {
  const text = `${input.description ?? ""} ${input.playerName}`;
  const flags: ScamFlag[] = [];

  if (CONTACT_PATTERNS.some(pattern => pattern.test(text))) {
    flags.push({ key: "contact", label: "E'londa tashqi kontakt/havola bor", weight: 28 });
  }
  if (OFFSITE_PATTERNS.some(pattern => pattern.test(text))) {
    flags.push({ key: "offsite", label: "Bot tashqarisida to'lovga chorlash", weight: 32 });
  }
  if (URGENCY_PATTERNS.some(pattern => pattern.test(text))) {
    flags.push({ key: "urgency", label: "Sun'iy shoshilinchlik ('faqat bugun')", weight: 8 });
  }
  if (input.marketMedian && input.marketMedian > 0 && input.price < input.marketMedian * 0.35) {
    flags.push({ key: "too_cheap", label: "Narx bozordan 65%+ arzon — klassik firibgarlik belgisi", weight: 30 });
  }
  if (input.galleryCount === 0 && !input.hasVideo) {
    flags.push({ key: "no_media", label: "Skrinshot ham, video ham yo'q", weight: 18 });
  }
  if (input.totalMatches > 0 && input.kdRatio > 12) {
    flags.push({ key: "impossible_kd", label: "Ishonib bo'lmaydigan K/D ko'rsatkichi", weight: 14 });
  }
  if (input.winRate > 80) {
    flags.push({ key: "impossible_wr", label: "Ishonib bo'lmaydigan g'alaba foizi", weight: 12 });
  }
  if (input.level > 80 && input.totalMatches < 200) {
    flags.push({ key: "stat_mismatch", label: "Daraja va o'yinlar soni mos emas", weight: 12 });
  }
  if (input.ucBalance > 20000 && !input.sellerIsVerified) {
    flags.push({ key: "high_uc", label: "Katta UC balansi, sotuvchi tasdiqlanmagan", weight: 10 });
  }
  if (!input.sellerIsVerified && input.sellerTotalSales === 0 && input.sellerAccountAgeDays < 3) {
    flags.push({ key: "fresh_seller", label: "Yangi va tarixsiz sotuvchi", weight: 16 });
  }

  const score = Math.min(100, flags.reduce((sum, flag) => sum + flag.weight, 0));
  const level: "safe" | "watch" | "risky" | "blocked" =
    score >= 60 ? "blocked" : score >= 35 ? "risky" : score >= 15 ? "watch" : "safe";

  return { score, level, flags, shouldBlock: level === "blocked" };
}

export const SCAM_LEVEL_LABELS = {
  safe: { label: "Xavfsiz", emoji: "🟢" },
  watch: { label: "Kuzatuvda", emoji: "🟡" },
  risky: { label: "Xavfli", emoji: "🟠" },
  blocked: { label: "Bloklandi", emoji: "🔴" },
} as const;
