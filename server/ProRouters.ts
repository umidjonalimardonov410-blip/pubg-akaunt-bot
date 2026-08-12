import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { supportTickets, supportTicketMessages, sellerVerifications, sellerBadgeAudits, premiumPromotions, priceEstimates, priceEvaluationRules, securityAudits, pubgAccounts, orders, reviews, users } from "../drizzle/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createHash, createHmac, randomBytes } from "node:crypto";

export type PriceEstimateInput = { level: number; kd: number; skinsCount: number; hasM416Glacier: boolean; hasXSuit: boolean };

const defaultPriceRules = [
  { ruleKey: 'level', label: 'Level koeffitsiyenti', multiplier: 25000, flatAmount: 0 },
  { ruleKey: 'kd', label: 'K/D koeffitsiyenti', multiplier: 100000, flatAmount: 0 },
  { ruleKey: 'skins', label: 'Skinlar koeffitsiyenti', multiplier: 15000, flatAmount: 0 },
  { ruleKey: 'm416_glacier', label: 'M416 Glacier bonusi', multiplier: 0, flatAmount: 800000 },
  { ruleKey: 'x_suit', label: 'X-Suit bonusi', multiplier: 0, flatAmount: 1200000 },
] as const;

function base32Encode(bytes: Buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index] ?? 0;
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (const char of value.replace(/=+$/, '').toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid TOTP secret');
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) { output.push((buffer >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(output);
}

function totp(secret: string, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 30000);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

function verifyTotp(secret: string, token: string) {
  return [-30000, 0, 30000].some((offset) => totp(secret, Date.now() + offset) === token);
}

function requestHashes(req: { ip?: string; headers: Record<string, unknown>; get?: (name: string) => string | undefined }) {
  const ip = String(req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown');
  const userAgent = String(req.get?.('user-agent') ?? req.headers['user-agent'] ?? 'unknown');
  const platform = String(req.get?.('x-telegram-web-app-platform') ?? req.headers['x-telegram-web-app-platform'] ?? 'unknown');
  const session = String(req.headers.cookie ?? 'anonymous');
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  return { ipHash: hash(ip), deviceHash: hash(`${userAgent}|${platform}`), sessionHash: hash(session) };
}

export function estimateAccountPrice(input: PriceEstimateInput) {
  let base = input.level * 25000;
  base += input.kd * 100000;
  base += input.skinsCount * 15000;
  if (input.hasM416Glacier) base += 800000;
  if (input.hasXSuit) base += 1200000;
  return {
    minPrice: Math.round(base * 0.85),
    maxPrice: Math.round(base * 1.2),
    recommended: Math.round(base),
  };
}

export const proRouter = router({
  // AI Account Price Estimator
  estimatePrice: publicProcedure
    .input(z.object({ level: z.number(), kd: z.number(), skinsCount: z.number(), hasM416Glacier: z.boolean(), hasXSuit: z.boolean() }))
    .query(({ input }) => estimateAccountPrice(input)),

  priceHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return db.select().from(priceEstimates).where(eq(priceEstimates.userId, ctx.user.id)).orderBy(desc(priceEstimates.createdAt));
  }),

  savePriceEstimate: protectedProcedure
    .input(z.object({ level: z.number().int().min(1).max(100), kd: z.number().min(0).max(50), skinsCount: z.number().int().min(0).max(500), hasM416Glacier: z.boolean(), hasXSuit: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const estimate = estimateAccountPrice(input);
      await db.insert(priceEstimates).values({ userId: ctx.user.id, level: input.level, kd: String(input.kd), skinsCount: input.skinsCount, hasM416Glacier: input.hasM416Glacier, hasXSuit: input.hasXSuit, minPrice: String(estimate.minPrice), recommended: String(estimate.recommended), maxPrice: String(estimate.maxPrice) });
      return estimate;
    }),

  pricingRules: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return defaultPriceRules;
      const rows = await db.select().from(priceEvaluationRules).where(eq(priceEvaluationRules.isActive, true));
      return rows.length ? rows : defaultPriceRules;
    }),
    upsert: protectedProcedure.input(z.object({ ruleKey: z.string().min(2).max(64), label: z.string().min(2).max(160), multiplier: z.number().min(0).max(1000000), flatAmount: z.number().min(0).max(100000000), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const existing = (await db.select().from(priceEvaluationRules).where(eq(priceEvaluationRules.ruleKey, input.ruleKey)).limit(1))[0];
      if (existing) await db.update(priceEvaluationRules).set({ label: input.label, multiplier: String(input.multiplier), flatAmount: String(input.flatAmount), isActive: input.isActive, updatedBy: ctx.user.id }).where(eq(priceEvaluationRules.id, existing.id));
      else await db.insert(priceEvaluationRules).values({ ruleKey: input.ruleKey, label: input.label, multiplier: String(input.multiplier), flatAmount: String(input.flatAmount), isActive: input.isActive, updatedBy: ctx.user.id });
      return { success: true };
    }),
  }),

  security: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return db.select().from(securityAudits).where(eq(securityAudits.userId, ctx.user.id)).orderBy(desc(securityAudits.createdAt));
    }),
    record: protectedProcedure.input(z.object({ eventType: z.string().min(2).max(64), riskScore: z.number().int().min(0).max(100), details: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await db.insert(securityAudits).values({ userId: ctx.user.id, ...input, ...requestHashes(ctx.req) });
      return { success: true };
    }),
    evaluate: protectedProcedure.input(z.object({ eventType: z.string().min(2).max(64), details: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const hashes = requestHashes(ctx.req);
      const previous = await db.select().from(securityAudits).where(eq(securityAudits.userId, ctx.user.id)).orderBy(desc(securityAudits.createdAt));
      const latest = previous[0];
      const recent = previous.filter((item) => item.createdAt && Date.now() - new Date(item.createdAt).getTime() < 10 * 60 * 1000);
      const factors: string[] = [];
      let riskScore = 0;
      if (latest?.deviceHash && latest.deviceHash !== hashes.deviceHash) { riskScore += 35; factors.push('Yangi qurilma yoki brauzer'); }
      if (latest?.ipHash && latest.ipHash !== hashes.ipHash) { riskScore += 25; factors.push('IP muhiti o‘zgargan'); }
      if (recent.length >= 5) { riskScore += 30; factors.push('Qisqa vaqtda ko‘p sessiya hodisasi'); }
      const status = riskScore >= 60 ? 'review' : riskScore >= 30 ? 'watch' : 'clear';
      await db.insert(securityAudits).values({ userId: ctx.user.id, eventType: input.eventType, riskScore, details: JSON.stringify({ status, factors, message: input.details ?? null }), ...hashes });
      return { riskScore, status, factors };
    }),
  }),

  // Support Tickets
  tickets: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(supportTickets).where(eq(supportTickets.userId, ctx.user.id)).orderBy(desc(supportTickets.createdAt));
    }),
    create: protectedProcedure
      .input(z.object({ subject: z.string().min(3).max(255), category: z.string(), message: z.string().min(5).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const result = await db.insert(supportTickets).values({
          userId: ctx.user.id,
          subject: input.subject,
          category: input.category,
          message: input.message,
          status: 'open',
        });
        const ticketId = Number(result[0]?.insertId ?? 0);
        if (ticketId) {
          await db.insert(supportTicketMessages).values({ ticketId, authorId: ctx.user.id, authorRole: 'user', body: input.message });
        }
        return { success: true, ticketId };
      }),
  }),

  // Threaded live-help conversation
  messages: router({
    list: protectedProcedure.input(z.object({ ticketId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const ticket = (await db.select().from(supportTickets).where(eq(supportTickets.id, input.ticketId)).limit(1))[0];
      if (!ticket || (ticket.userId !== ctx.user.id && ctx.user.role !== 'admin')) throw new TRPCError({ code: 'FORBIDDEN' });
      return db.select().from(supportTicketMessages).where(eq(supportTicketMessages.ticketId, input.ticketId)).orderBy(asc(supportTicketMessages.createdAt));
    }),
    send: protectedProcedure.input(z.object({ ticketId: z.number().int().positive(), body: z.string().min(1).max(4000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const ticket = (await db.select().from(supportTickets).where(eq(supportTickets.id, input.ticketId)).limit(1))[0];
      if (!ticket || (ticket.userId !== ctx.user.id && ctx.user.role !== 'admin')) throw new TRPCError({ code: 'FORBIDDEN' });
      await db.insert(supportTicketMessages).values({ ticketId: input.ticketId, authorId: ctx.user.id, authorRole: ctx.user.role === 'admin' ? 'admin' : 'user', body: input.body });
      await db.update(supportTickets).set({ status: ctx.user.role === 'admin' ? 'in_progress' : ticket.status }).where(eq(supportTickets.id, input.ticketId));
      return { success: true };
    }),
  }),

  // Admin ticket inbox
  adminTickets: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt));
  }),

  // Explicit seller badge history
  badgeAudit: router({
    list: protectedProcedure.input(z.object({ userId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && input.userId && input.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return db.select().from(sellerBadgeAudits).where(eq(sellerBadgeAudits.userId, input.userId ?? ctx.user.id)).orderBy(desc(sellerBadgeAudits.createdAt));
    }),
    record: protectedProcedure.input(z.object({ userId: z.number().int().positive(), previousBadge: z.enum(['none', 'trusted', 'elite', 'legendary']), nextBadge: z.enum(['none', 'trusted', 'elite', 'legendary']), reason: z.string().min(3).max(1000) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await db.insert(sellerBadgeAudits).values({ ...input, adminId: ctx.user.id });
      await db.update(users).set({ sellerBadge: input.nextBadge, isVerifiedSeller: input.nextBadge !== 'none' }).where(eq(users.id, input.userId));
      return { success: true };
    }),
  }),

  // Premium listing promotions
  promotions: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return db.select().from(premiumPromotions).where(eq(premiumPromotions.userId, ctx.user.id)).orderBy(desc(premiumPromotions.createdAt));
    }),
    create: protectedProcedure.input(z.object({ accountId: z.number().int().positive(), durationDays: z.union([z.literal(7), z.literal(14), z.literal(30)]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const account = (await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, input.accountId)).limit(1))[0];
      if (!account || account.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      const cost = input.durationDays * 50000;
      const expiresAt = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000);
      await db.insert(premiumPromotions).values({ accountId: input.accountId, userId: ctx.user.id, durationDays: input.durationDays, cost: String(cost), status: 'active', expiresAt });
      return { success: true, cost, expiresAt };
    }),
  }),

  twoFactor: router({
    status: protectedProcedure.query(({ ctx }) => ({ enabled: Boolean(ctx.user.twoFactorEnabled), configured: Boolean(ctx.user.twoFactorSecret) })),
    begin: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const secret = base32Encode(randomBytes(20));
      await db.update(users).set({ twoFactorSecret: secret, twoFactorEnabled: false }).where(eq(users.id, ctx.user.id));
      const label = encodeURIComponent(`Inferno Stealth:${ctx.user.name ?? ctx.user.openId}`);
      return { secret, otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=Inferno%20Stealth` };
    }),
    confirm: protectedProcedure.input(z.object({ token: z.string().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.twoFactorSecret || !verifyTotp(ctx.user.twoFactorSecret, input.token)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tasdiqlash kodi noto‘g‘ri yoki eskirgan' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, ctx.user.id));
      return { enabled: true };
    }),
    disable: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await db.update(users).set({ twoFactorSecret: null, twoFactorEnabled: false }).where(eq(users.id, ctx.user.id));
      return { enabled: false };
    }),
  }),

  // Transparent Telegram/escrow security status
  securityStatus: protectedProcedure.query(({ ctx }) => ({
    telegramSession: true,
    passwordStorage: false,
    escrowProtection: true,
    sellerVerification: Boolean(ctx.user.isVerifiedSeller),
    twoFactorEnabled: Boolean(ctx.user.twoFactorEnabled),
    badge: ctx.user.sellerBadge,
    recommendations: ctx.user.isVerifiedSeller ? [] : ['Sotuvchi verifikatsiyasini yakunlang'],
  })),

  // Seller analytics and trust summary
  sellerDashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    const listings = await db.select().from(pubgAccounts).where(eq(pubgAccounts.sellerId, ctx.user.id));
    const sellerOrders = await db.select().from(orders).where(eq(orders.sellerId, ctx.user.id));
    const sellerReviews = await db.select().from(reviews).where(eq(reviews.sellerId, ctx.user.id));
    const completed = sellerOrders.filter(order => order.status === 'completed');
    const revenue = completed.reduce((total, order) => total + Number(order.price || 0), 0);
    const rating = sellerReviews.length ? sellerReviews.reduce((total, review) => total + review.rating, 0) / sellerReviews.length : 0;
    return {
      listingCount: listings.length,
      availableCount: listings.filter(item => item.status === 'available').length,
      completedSales: completed.length,
      revenue,
      rating: Number(rating.toFixed(2)),
      verified: ctx.user.isVerifiedSeller,
      badge: ctx.user.sellerBadge,
    };
  }),

  // Seller Verifications
  verification: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(sellerVerifications).where(eq(sellerVerifications.userId, ctx.user.id)).limit(1);
      return rows[0] || null;
    }),
    submit: protectedProcedure
      .input(z.object({ fullName: z.string().min(2), telegramUsername: z.string().min(2), idCardPhotoUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.insert(sellerVerifications).values({
          userId: ctx.user.id,
          fullName: input.fullName,
          telegramUsername: input.telegramUsername,
          idCardPhotoUrl: input.idCardPhotoUrl,
          status: 'pending',
        });
        return { success: true };
      }),
  }),
});
