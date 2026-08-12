import { createHmac } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: new Map<any, any[]>(),
  currentUserId: 0,
  currentRole: "user" as "user" | "admin",
  inserts: [] as Array<{ table: any; values: any }>,
  updates: [] as Array<{ table: any; values: any }>,
  db: undefined as any,
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getDb: vi.fn(async () => state.db) };
});

import { appRouter } from "./routers";
import { orders, premiumPromotions, pubgAccounts, reviews, securityAudits, sellerVerifications, supportTicketMessages, supportTickets, users } from "../drizzle/schema";

function selectQuery(rows: any[]) {
  const query: any = {
    where: vi.fn(() => query),
    orderBy: vi.fn(async () => rows),
    limit: vi.fn(async () => rows.slice(0, 1)),
    then: (resolve: (value: any[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
  };
  return query;
}

function visibleRows(table: any) {
  const rows = state.rows.get(table) ?? [];
  if (table === premiumPromotions) return rows.filter((row) => row.userId === state.currentUserId);
  if (table === supportTickets) return state.currentRole === "admin" ? rows : rows.filter((row) => row.userId === state.currentUserId);
  if (table === pubgAccounts || table === orders || table === reviews) return rows.filter((row) => row.sellerId === state.currentUserId);
  if (table === securityAudits) return rows.filter((row) => row.userId === state.currentUserId);
  return rows;
}

function installDb() {
  state.db = {
    select: vi.fn(() => ({ from: (table: any) => selectQuery(visibleRows(table)) })),
    insert: vi.fn((table: any) => ({
      values: vi.fn(async (values: any) => {
        state.inserts.push({ table, values });
        return table === supportTickets ? [{ insertId: 51 }] : [];
      }),
    })),
    update: vi.fn((table: any) => ({
      set: vi.fn((values: any) => ({
        where: vi.fn(async () => {
          state.updates.push({ table, values });
          return [];
        }),
      })),
    })),
  };
}

function context(user: any) {
  state.currentUserId = user.id;
  state.currentRole = user.role;
  return {
    user,
    req: {
      ip: "10.0.0.1",
      headers: { "user-agent": "Telegram Android", "x-telegram-web-app-platform": "android", cookie: "sid=secure" },
      get: (name: string) => ({ "user-agent": "Telegram Android", "x-telegram-web-app-platform": "android" }[name]),
    },
    res: {},
  } as any;
}

function decodeBase32(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (const char of secret) {
    buffer = (buffer << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function totpFor(secret: string, timestamp: number) {
  const counter = Math.floor(timestamp / 30000);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

beforeEach(() => {
  state.rows = new Map();
  state.currentUserId = 0;
  state.currentRole = "user";
  state.inserts = [];
  state.updates = [];
  installDb();
});

afterEach(() => vi.useRealTimers());

describe("Inferno Stealth Pro procedure behavior", () => {
  it("scores a device and IP change, then persists an anti-fraud audit", async () => {
    const now = new Date();
    state.rows.set(securityAudits, Array.from({ length: 5 }, () => ({ userId: 7, deviceHash: "old-device", ipHash: "old-ip", createdAt: now })));
    const caller = appRouter.createCaller(context({ id: 7, role: "user" }));

    const result = await caller.pro.security.evaluate({ eventType: "manual_security_recheck", details: "test" });

    expect(result.status).toBe("review");
    expect(result.riskScore).toBe(90);
    expect(result.factors).toEqual(expect.arrayContaining(["Yangi qurilma yoki brauzer", "IP muhiti o‘zgargan"]));
    const audit = state.inserts.find((entry) => entry.table === securityAudits);
    expect(audit?.values).toEqual(expect.objectContaining({ riskScore: 90, ipHash: expect.any(String), deviceHash: expect.any(String), sessionHash: expect.any(String) }));
  });

  it("completes the TOTP 2FA begin, confirm, and disable lifecycle", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T00:00:00.000Z"));
    const user = { id: 7, role: "user", name: "Test User", openId: "test-open-id", twoFactorEnabled: false, twoFactorSecret: null };
    const caller = appRouter.createCaller(context(user));

    const started = await caller.pro.twoFactor.begin();
    expect(started.secret).toMatch(/^[A-Z2-7]+$/);
    expect(started.otpauthUrl).toContain("otpauth://totp/");
    expect(state.updates.at(-1)?.values).toEqual({ twoFactorSecret: started.secret, twoFactorEnabled: false });

    user.twoFactorSecret = started.secret;
    const confirmed = await caller.pro.twoFactor.confirm({ token: totpFor(started.secret, Date.now()) });
    expect(confirmed).toEqual({ enabled: true });
    expect(state.updates.at(-1)?.values).toEqual({ twoFactorEnabled: true });

    const disabled = await caller.pro.twoFactor.disable();
    expect(disabled).toEqual({ enabled: false });
    expect(state.updates.at(-1)?.values).toEqual({ twoFactorSecret: null, twoFactorEnabled: false });
  });

  it("creates a seller premium promotion only for the owning seller", async () => {
    state.rows.set(pubgAccounts, [{ id: 12, sellerId: 7 }]);
    const caller = appRouter.createCaller(context({ id: 7, role: "user" }));

    const result = await caller.pro.promotions.create({ accountId: 12, durationDays: 7 });

    expect(result.success).toBe(true);
    expect(result.cost).toBe(350000);
    const createdPromotion = state.inserts.find((entry) => entry.table === premiumPromotions)?.values;
    expect(createdPromotion).toEqual(expect.objectContaining({ accountId: 12, userId: 7, durationDays: 7, cost: "350000", status: "active" }));
    state.rows.set(premiumPromotions, [{ id: 91, ...createdPromotion }]);
    await expect(caller.pro.promotions.mine()).resolves.toEqual([expect.objectContaining({ id: 91, userId: 7, accountId: 12 })]);

    const otherCaller = appRouter.createCaller(context({ id: 8, role: "user" }));
    await expect(otherCaller.pro.promotions.mine()).resolves.toEqual([]);
    await expect(otherCaller.pro.promotions.create({ accountId: 12, durationDays: 7 })).rejects.toThrow("FORBIDDEN");
  });

  it("creates a ticket, appends its first message, and keeps threaded replies scoped", async () => {
    const caller = appRouter.createCaller(context({ id: 7, role: "user" }));
    const created = await caller.pro.tickets.create({ subject: "Escrow yordam", category: "escrow", message: "Buyurtmamni tekshirib bering" });
    expect(created).toEqual({ success: true, ticketId: 51 });
    expect(state.inserts.filter((entry) => entry.table === supportTicketMessages)).toHaveLength(1);

    state.rows.set(supportTickets, [{ id: 51, userId: 7, status: "open" }]);
    await caller.pro.messages.send({ ticketId: 51, body: "Qo‘shimcha ma’lumot yubordim" });
    expect(state.inserts.find((entry) => entry.table === supportTicketMessages)?.values).toEqual(expect.objectContaining({ ticketId: 51, authorId: 7, authorRole: "user" }));
  });

  it("submits seller verification and calculates seller dashboard metrics", async () => {
    const user = { id: 7, role: "user", isVerifiedSeller: false, sellerBadge: "none" };
    const caller = appRouter.createCaller(context(user));
    await caller.pro.verification.submit({ fullName: "Test Seller", telegramUsername: "@testseller", idCardPhotoUrl: "https://storage.test/id.png" });
    expect(state.inserts.find((entry) => entry.table === sellerVerifications)?.values).toEqual(expect.objectContaining({ userId: 7, status: "pending" }));

    state.rows.set(pubgAccounts, [{ id: 1, sellerId: 7, status: "available" }, { id: 2, sellerId: 7, status: "sold" }]);
    state.rows.set(orders, [{ sellerId: 7, status: "completed", price: "850000" }, { sellerId: 7, status: "pending", price: "500000" }]);
    state.rows.set(reviews, [{ sellerId: 7, rating: 5 }, { sellerId: 7, rating: 4 }]);
    const dashboard = await caller.pro.sellerDashboard();
    expect(dashboard).toEqual(expect.objectContaining({ listingCount: 2, availableCount: 1, completedSales: 1, revenue: 850000, rating: 4.5, verified: false, badge: "none" }));
  });

  it("lists premium promotions for the authenticated seller only", async () => {
    state.rows.set(premiumPromotions, [{ id: 91, accountId: 12, userId: 7, durationDays: 14, status: "active" }]);
    const seller = appRouter.createCaller(context({ id: 7, role: "user" }));
    await expect(seller.pro.promotions.mine()).resolves.toEqual([{ id: 91, accountId: 12, userId: 7, durationDays: 14, status: "active" }]);
  });

  it("returns threaded support history to the owner and blocks another user", async () => {
    state.rows.set(supportTickets, [{ id: 51, userId: 7, status: "open" }]);
    state.rows.set(supportTicketMessages, [{ id: 1, ticketId: 51, authorId: 7, authorRole: "user", body: "Birinchi xabar" }, { id: 2, ticketId: 51, authorId: 99, authorRole: "admin", body: "Admin javobi" }]);
    const owner = appRouter.createCaller(context({ id: 7, role: "user" }));
    await expect(owner.pro.messages.list({ ticketId: 51 })).resolves.toHaveLength(2);

    const admin = appRouter.createCaller(context({ id: 99, role: "admin" }));
    await expect(admin.pro.messages.list({ ticketId: 51 })).resolves.toHaveLength(2);

    const otherUser = appRouter.createCaller(context({ id: 8, role: "user" }));
    await expect(otherUser.pro.messages.list({ ticketId: 51 })).rejects.toThrow("FORBIDDEN");
  });
});
