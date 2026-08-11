import { describe, expect, it } from "vitest";
import { and, eq, or } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { disputes, notifications, orders, pubgAccounts, transactions, users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const runIntegration = process.env.RUN_MARKETPLACE_DB_INTEGRATION === "1";

type TestUser = NonNullable<TrpcContext["user"]>;

function contextFor(user: TestUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function insertedId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { insertId?: number | string }).insertId);
}

describe.skipIf(!runIntegration)("marketplace real database flow", () => {
  it("persists the full verified account to completed escrow lifecycle", async () => {
    const db = await getDb();
    if (!db) throw new Error("DATABASE_URL is required for this integration test");

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdUserIds: number[] = [];
    let accountId: number | undefined;
    let orderId: number | undefined;

    const makeUser = async (role: "user" | "admin", name: string, balance = "0") => {
      const result = await db.insert(users).values({
        openId: `integration-${role}-${suffix}-${createdUserIds.length}`,
        name,
        role,
        walletBalance: balance,
      });
      const id = insertedId(result);
      createdUserIds.push(id);
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!rows[0]) throw new Error(`Could not load integration user ${id}`);
      return rows[0] as TestUser;
    };

    const seller = await makeUser("user", "Integration Seller");
    const buyer = await makeUser("user", "Integration Buyer", "2500000");
    const admin = await makeUser("admin", "Integration Admin");

    try {
      const sellerCaller = appRouter.createCaller(contextFor(seller));
      const buyerCaller = appRouter.createCaller(contextFor(buyer));
      const adminCaller = appRouter.createCaller(contextFor(admin));

      const created = await sellerCaller.accounts.create({
        accountId: `INT-${suffix}`,
        playerName: "Integration Inferno",
        level: 74,
        region: "KR",
        kdRatio: 4.8,
        winRate: 61.2,
        totalMatches: 1250,
        headshotPercentage: 26.4,
        ucBalance: 9600,
        outfitCount: 120,
        gunSkinCount: 88,
        vehicleCount: 18,
        featuredSkins: ["M416 Glacier", "X-Suit"],
        price: 1250000,
        description: "Isolated integration listing",
        galleryUrls: [],
      });
      accountId = Number(created.id);
      expect(accountId).toBeGreaterThan(0);

      const pending = await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, accountId)).limit(1);
      expect(pending[0]?.status).toBe("pending_verification");

      await adminCaller.admin.verifyAccount({ accountId, approved: true, notes: "Integration approval" });
      const approved = await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, accountId)).limit(1);
      expect(approved[0]?.status).toBe("available");
      expect(approved[0]?.isVerified).toBe(true);

      const createdOrder = await buyerCaller.orders.create({ accountId });
      orderId = Number(createdOrder.orderId);
      expect(orderId).toBeGreaterThan(0);

      const reserved = await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, accountId)).limit(1);
      expect(reserved[0]?.status).toBe("pending_verification");

      const afterFreeze = await buyerCaller.orders.getById(orderId);
      expect(afterFreeze.status).toBe("pending");
      expect(afterFreeze.escrowStage).toBe("payment_frozen");

      await sellerCaller.orders.updateStatus({ orderId, status: "in_escrow", escrowStage: "account_verification" });
      await sellerCaller.orders.updateStatus({ orderId, status: "in_escrow", escrowStage: "buyer_confirmation" });
      const beforeConfirmation = await buyerCaller.orders.getById(orderId);
      expect(beforeConfirmation.status).toBe("in_escrow");
      expect(beforeConfirmation.escrowStage).toBe("buyer_confirmation");

      await buyerCaller.orders.confirmBuyer(orderId);
      const completed = await buyerCaller.orders.getById(orderId);
      expect(completed.status).toBe("completed");
      expect(completed.buyerConfirmed).toBe(true);

      const payoutRows = await db.select().from(transactions).where(and(eq(transactions.orderId, orderId), eq(transactions.type, "seller_payout")));
      expect(payoutRows).toHaveLength(1);
      expect(Number(payoutRows[0]?.amount)).toBe(1250000);

      const buyerRow = await db.select().from(users).where(eq(users.id, buyer.id)).limit(1);
      expect(Number(buyerRow[0]?.walletBalance)).toBe(1250000);
      const sellerRow = await db.select().from(users).where(eq(users.id, seller.id)).limit(1);
      expect(Number(sellerRow[0]?.walletBalance)).toBe(1250000);
    } finally {
      if (orderId) {
        await db.delete(notifications).where(or(eq(notifications.orderId, orderId), eq(notifications.accountId, accountId ?? -1)));
        await db.delete(disputes).where(eq(disputes.orderId, orderId));
        await db.delete(transactions).where(eq(transactions.orderId, orderId));
        await db.delete(orders).where(eq(orders.id, orderId));
      }
      if (accountId) {
        await db.delete(notifications).where(eq(notifications.accountId, accountId));
        await db.delete(pubgAccounts).where(eq(pubgAccounts.id, accountId));
      }
      if (createdUserIds.length) {
        await db.delete(notifications).where(or(...createdUserIds.map(id => eq(notifications.userId, id))));
        await db.delete(users).where(or(...createdUserIds.map(id => eq(users.id, id))));
      }
    }
  });
});

if (!runIntegration) {
  describe("marketplace real database flow", () => {
    it.skip("requires RUN_MARKETPLACE_DB_INTEGRATION=1 and an isolated DATABASE_URL", () => undefined);
  });
}

export {};
