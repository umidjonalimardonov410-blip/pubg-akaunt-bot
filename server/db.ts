import { eq, and, or, like, gte, lte, desc, asc, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, pubgAccounts, orders, reviews, transactions, notifications, disputes, favorites, chatThreads, chatMessages, savedFilters } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone", "languageCode"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// PUBG Accounts queries
export function derivedPubgAccountCategory(account: { hasXSuit?: boolean | null; hasConquerorHistory?: boolean | null }): 'pro' | 'conqueror' | 'classic' {
  return account.hasXSuit ? 'pro' : account.hasConquerorHistory ? 'conqueror' : 'classic';
}

export async function searchPubgAccounts(filters: {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minLevel?: number;
  maxLevel?: number;
  region?: string;
  skins?: string[];
  hasGlacier?: boolean;
  hasXSuit?: boolean;
  hasConquerorHistory?: boolean;
  isOldAccount?: boolean;
  verifiedSeller?: boolean;
  mediaAvailable?: boolean;
  category?: 'all' | 'pro' | 'conqueror' | 'classic';
  minKd?: number;
  minWinRate?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'level_desc' | 'popular';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(pubgAccounts.status, 'available')];
  
  if (filters.search) {
    const query = `%${filters.search}%`;
    conditions.push(
      or(
        like(pubgAccounts.playerName, query),
        like(pubgAccounts.accountId, query),
      ),
    );
  }
  
  if (filters.minPrice !== undefined) {
    conditions.push(gte(pubgAccounts.price, filters.minPrice.toString()));
  }
  
  if (filters.maxPrice !== undefined) {
    conditions.push(lte(pubgAccounts.price, filters.maxPrice.toString()));
  }
  
  if (filters.minLevel !== undefined) {
    conditions.push(gte(pubgAccounts.level, filters.minLevel));
  }
  
  if (filters.maxLevel !== undefined) {
    conditions.push(lte(pubgAccounts.level, filters.maxLevel));
  }
  
  if (filters.region) {
    conditions.push(eq(pubgAccounts.region, filters.region));
  }
  if (filters.hasXSuit) conditions.push(eq(pubgAccounts.hasXSuit, true));
  if (filters.hasConquerorHistory) conditions.push(eq(pubgAccounts.hasConquerorHistory, true));
  if (filters.isOldAccount) conditions.push(lte(pubgAccounts.accountCreatedYear, 2022));

  const sort = filters.sort ?? 'newest';
  const orderClause =
    sort === 'price_asc' ? asc(pubgAccounts.price) :
    sort === 'price_desc' ? desc(pubgAccounts.price) :
    sort === 'popular' ? desc(pubgAccounts.viewCount) :
    sort === 'level_desc' ? desc(pubgAccounts.level) :
    desc(pubgAccounts.createdAt);
  const rows = await db.select().from(pubgAccounts).where(and(...conditions)).orderBy(orderClause);
  const verifiedSellerIds = filters.verifiedSeller
    ? (await db.select({ id: users.id }).from(users).where(eq(users.isVerifiedSeller, true))).map(row => row.id)
    : undefined;
  const selectedSkins = filters.skins?.map(skin => skin.toLowerCase()).filter(Boolean) ?? [];
  const filteredRows = rows.filter(row => {
    if (verifiedSellerIds && !verifiedSellerIds.includes(row.sellerId)) return false;
    if (filters.hasGlacier) {
      const inventory = (row.featuredSkins ?? []).map(skin => skin.toLowerCase());
      if (!inventory.some(item => item.includes("glacier"))) return false;
    }
    if (selectedSkins.length > 0) {
      const inventory = (row.featuredSkins ?? []).map(skin => skin.toLowerCase());
      if (!selectedSkins.every(skin => inventory.some(item => item.includes(skin)))) return false;
    }
    if (filters.mediaAvailable && !((row.galleryUrls?.length ?? 0) > 0 || Boolean(row.videoUrl))) return false;
    if (filters.minKd !== undefined && Number(row.kdRatio ?? 0) < filters.minKd) return false;
    if (filters.minWinRate !== undefined && Number(row.winRate ?? 0) < filters.minWinRate) return false;
    if (filters.category && filters.category !== 'all') {
      if (derivedPubgAccountCategory(row) !== filters.category) return false;
    }
    return true;
  });
  const sorted = sortPubgAccountRows(filteredRows, filters.sortBy);
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 20;
  return sorted.slice(offset, offset + limit);
}

/** Marketplace sorting used by the advanced search filters. */
export function sortPubgAccountRows<T extends { price: unknown; level?: number | null; viewCount?: number | null; createdAt?: Date | string | null }>(
  rows: T[],
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'level_desc' | 'popular',
): T[] {
  const copy = [...rows];
  const time = (value: Date | string | null | undefined) => (value ? new Date(value).getTime() : 0);
  switch (sortBy) {
    case 'price_asc':
      return copy.sort((a, b) => Number(a.price) - Number(b.price));
    case 'price_desc':
      return copy.sort((a, b) => Number(b.price) - Number(a.price));
    case 'level_desc':
      return copy.sort((a, b) => Number(b.level ?? 0) - Number(a.level ?? 0));
    case 'popular':
      return copy.sort((a, b) => Number(b.viewCount ?? 0) - Number(a.viewCount ?? 0));
    case 'newest':
    default:
      return copy.sort((a, b) => time(b.createdAt) - time(a.createdAt));
  }
}

export async function getPubgAccountById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSellerAccounts(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(pubgAccounts)
    .where(eq(pubgAccounts.sellerId, sellerId))
    .orderBy(desc(pubgAccounts.createdAt));
}

// Orders queries
export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(orders)
    .where(
      and(
        eq(orders.buyerId, userId)
      )
    )
    .orderBy(desc(orders.createdAt));
}

export async function getSellerOrders(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(orders)
    .where(eq(orders.sellerId, sellerId))
    .orderBy(desc(orders.createdAt));
}

// Reviews queries
export async function getSellerReviews(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(reviews)
    .where(eq(reviews.sellerId, sellerId))
    .orderBy(desc(reviews.createdAt));
}

export async function getOrderReview(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(reviews).where(eq(reviews.orderId, orderId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Transactions queries
export async function getUserTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt));
}

// Notifications queries
export async function getUserNotifications(userId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }
  
  return await db.select().from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));
}

// Disputes queries
export async function getOrderDispute(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(disputes).where(eq(disputes.orderId, orderId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAdminDisputes() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(disputes)
    .where(eq(disputes.status, 'open'))
    .orderBy(desc(disputes.createdAt));
}

export async function getAccountSuggestions(query: string) {
  const normalized = query.trim();
  if (normalized.length < 2) return [];
  const lower = normalized.toLowerCase();
  const featuredSkins = ['M416 Glacier', 'X-Suit', 'Pharaoh X-Suit', 'Glacier Set', 'Conqueror Set'];
  const skinSuggestions = featuredSkins
    .filter(skin => skin.toLowerCase().includes(lower))
    .map(skin => ({ type: 'Skin', label: skin, value: skin, accountId: undefined }));
  const db = await getDb();
  if (!db) return skinSuggestions.slice(0, 8);

  try {
    const rows = await db.select({
      id: pubgAccounts.id,
      accountId: pubgAccounts.accountId,
      playerName: pubgAccounts.playerName,
      region: pubgAccounts.region,
      featuredSkins: pubgAccounts.featuredSkins,
    }).from(pubgAccounts)
      .where(eq(pubgAccounts.status, 'available'))
      .orderBy(desc(pubgAccounts.createdAt))
      .limit(40);

    const suggestions = rows.flatMap(row => {
      const matchesText = [row.accountId, row.playerName, row.region].some(value => value.toLowerCase().includes(lower));
      const textMatches = matchesText ? [
        { type: 'Akkaunt ID', label: row.accountId, value: row.accountId, accountId: row.id },
        { type: "O'yinchi", label: row.playerName, value: row.playerName, accountId: row.id },
      ] : [];
      const matchedSkins = (row.featuredSkins ?? [])
        .filter(skin => skin.toLowerCase().includes(lower))
        .map(skin => ({ type: 'Skin', label: skin, value: skin, accountId: row.id }));
      return [...textMatches, ...matchedSkins];
    });

    const seen = new Set<string>();
    return [...suggestions, ...skinSuggestions].filter(item => {
      const key = `${item.type}:${item.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  } catch (error) {
    console.warn('[Database] Suggestions unavailable; using featured skin suggestions:', error);
    return skinSuggestions.slice(0, 8);
  }
}

export async function getPendingAccounts() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(pubgAccounts)
    .where(eq(pubgAccounts.status, 'pending_verification'))
    .orderBy(desc(pubgAccounts.createdAt));
}

/** Normalize mysql2/Drizzle insert results across driver result shapes. */
export function getInsertId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const id = Number((header as { insertId?: number | string } | undefined)?.insertId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Insert did not return a valid insertId");
  }
  return id;
}

/** Normalize affected-row counts across direct and tuple-shaped mysql2 results. */
export function getAffectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: number; rowsAffected?: number } | undefined)?.affectedRows ?? (header as { rowsAffected?: number } | undefined)?.rowsAffected ?? 0);
}

export async function getFavoriteAccountIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ accountId: favorites.accountId }).from(favorites).where(eq(favorites.userId, userId));
  return rows.map(row => row.accountId);
}

export async function getFavoriteAccounts(userId: number) {
  const ids = await getFavoriteAccountIds(userId);
  if (ids.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pubgAccounts).where(inArray(pubgAccounts.id, ids)).orderBy(desc(pubgAccounts.createdAt));
}

export async function getChatThreadById(threadId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(chatThreads).where(eq(chatThreads.id, threadId)).limit(1);
  return rows[0];
}

export async function getChatMessages(threadId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(chatMessages).where(eq(chatMessages.threadId, threadId)).orderBy(chatMessages.createdAt);
}

export async function getUserChatThreads(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(chatThreads)
    .where(or(eq(chatThreads.buyerId, userId), eq(chatThreads.sellerId, userId)))
    .orderBy(desc(chatThreads.updatedAt));
}

// ============= Price Alerts =============




// ============= Saved Filters =============
export async function saveUserFilter(userId: number, name: string, filters: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(savedFilters).values({ userId, name, filters });
  return true;
}

export async function getUserSavedFilters(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(savedFilters).where(eq(savedFilters.userId, userId)).orderBy(desc(savedFilters.createdAt));
}

export async function deleteSavedFilter(userId: number, filterId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(savedFilters).where(and(eq(savedFilters.id, filterId), eq(savedFilters.userId, userId)));
  return true;
}
