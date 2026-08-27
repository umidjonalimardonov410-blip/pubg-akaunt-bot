/**
 * Saqlangan qidiruv (saved search) uchun moslik tekshirgichi.
 * Yangi e'lon bozorga chiqqanda kimlarga push yuborishni aniqlaydi.
 */

export type SavedSearchFilters = {
  q?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  minLevel?: number;
  maxLevel?: number;
  minKd?: number;
  hasXSuit?: boolean;
  hasConquerorHistory?: boolean;
  minUc?: number;
};

export type ListingSnapshot = {
  playerName: string;
  description?: string | null;
  region: string;
  price: number;
  level: number;
  kdRatio: number;
  ucBalance: number;
  hasXSuit: boolean;
  hasConquerorHistory: boolean;
};

export function parseSavedFilters(raw: string): SavedSearchFilters | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SavedSearchFilters) : null;
  } catch {
    return null;
  }
}

/** Barcha ko'rsatilgan shartlar bajarilsa `true`. Bo'sh filtr hech kimga push yubormaydi. */
export function matchesSavedSearch(filters: SavedSearchFilters | null, listing: ListingSnapshot) {
  if (!filters) return false;
  const keys = Object.keys(filters).filter(key => (filters as Record<string, unknown>)[key] !== undefined && (filters as Record<string, unknown>)[key] !== "");
  if (keys.length === 0) return false;

  if (filters.q) {
    const needle = filters.q.trim().toLowerCase();
    const hay = `${listing.playerName} ${listing.description ?? ""}`.toLowerCase();
    if (needle && !hay.includes(needle)) return false;
  }
  if (filters.region && filters.region.toLowerCase() !== listing.region.toLowerCase()) return false;
  if (typeof filters.minPrice === "number" && listing.price < filters.minPrice) return false;
  if (typeof filters.maxPrice === "number" && listing.price > filters.maxPrice) return false;
  if (typeof filters.minLevel === "number" && listing.level < filters.minLevel) return false;
  if (typeof filters.maxLevel === "number" && listing.level > filters.maxLevel) return false;
  if (typeof filters.minKd === "number" && listing.kdRatio < filters.minKd) return false;
  if (typeof filters.minUc === "number" && listing.ucBalance < filters.minUc) return false;
  if (filters.hasXSuit && !listing.hasXSuit) return false;
  if (filters.hasConquerorHistory && !listing.hasConquerorHistory) return false;
  return true;
}
