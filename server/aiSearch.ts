import { callGateway } from "./listingAssistant";

export type AiFilters = {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minLevel?: number;
  region?: string;
  hasGlacier?: boolean;
  hasXSuit?: boolean;
  hasConquerorHistory?: boolean;
  sortBy?: "newest" | "price_asc" | "price_desc" | "level_desc" | "popular";
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);

export function sanitizeFilters(raw: any): AiFilters {
  const f: AiFilters = {};
  if (typeof raw?.search === "string" && raw.search.trim()) f.search = raw.search.trim().slice(0, 60);
  f.minPrice = num(raw?.minPrice); f.maxPrice = num(raw?.maxPrice); f.minLevel = num(raw?.minLevel);
  if (typeof raw?.region === "string" && raw.region.trim()) f.region = raw.region.trim().slice(0, 20);
  for (const k of ["hasGlacier", "hasXSuit", "hasConquerorHistory"] as const) if (raw?.[k] === true) f[k] = true;
  if (["newest", "price_asc", "price_desc", "level_desc", "popular"].includes(raw?.sortBy)) f.sortBy = raw.sortBy;
  for (const k of Object.keys(f) as (keyof AiFilters)[]) if (f[k] === undefined) delete f[k];
  return f;
}

/** Keyword fallback when AI is unavailable. */
export function parseQueryLocally(query: string): AiFilters {
  const q = query.toLowerCase();
  const f: AiFilters = {};
  if (/glacier|глейсер/.test(q)) f.hasGlacier = true;
  if (/x-?suit|икс/.test(q)) f.hasXSuit = true;
  if (/conqueror|zabt|конкерор/.test(q)) f.hasConquerorHistory = true;
  const m = q.match(/(\d+(?:[.,]\d+)?)\s*(mln|million|млн|ming|k|тыс)?\s*(gacha|дo|до|under|max)/);
  if (m) {
    let v = parseFloat(m[1].replace(",", "."));
    if (/mln|million|млн/.test(m[2] ?? "")) v *= 1_000_000; else if (/ming|k|тыс/.test(m[2] ?? "")) v *= 1000;
    f.maxPrice = Math.round(v);
  }
  if (/arzon|дешев|cheap/.test(q)) f.sortBy = "price_asc";
  if (!Object.keys(f).length) f.search = query.trim().slice(0, 60);
  return f;
}

export async function parseQueryWithAi(query: string): Promise<{ filters: AiFilters; usedAi: boolean }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { filters: parseQueryLocally(query), usedAi: false };
  const prompt = [
    "Convert a PUBG Mobile account marketplace search request (Uzbek, Russian or English) into filters.",
    'Reply ONLY with JSON: {"search": string|null, "minPrice": number|null, "maxPrice": number|null, "minLevel": number|null, "region": string|null, "hasGlacier": boolean, "hasXSuit": boolean, "hasConquerorHistory": boolean, "sortBy": "newest"|"price_asc"|"price_desc"|"level_desc"|"popular"|null}.',
    "Prices are in Uzbek so'm (mln = 1 000 000, ming = 1 000). Put only a short skin/player keyword in search, otherwise null.",
    `Request: """${query.slice(0, 300)}"""`,
  ].join("\n");
  try {
    const raw = await callGateway(apiKey, prompt, []);
    const match = raw.match(/\{[\s\S]*\}/);
    const filters = sanitizeFilters(match ? JSON.parse(match[0]) : {});
    return { filters, usedAi: true };
  } catch (error) {
    console.error("[AiSearch] fallback", error);
    return { filters: parseQueryLocally(query), usedAi: false };
  }
}
