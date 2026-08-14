import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  order: undefined as any,
  account: undefined as any,
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  insertValues: vi.fn(),
}));

const dbMock = vi.hoisted(() => ({
  update: vi.fn(() => ({ set: state.updateSet })),
  insert: vi.fn(() => ({ values: state.insertValues })),
  transaction: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => dbMock),
    getOrderById: vi.fn(async () => state.order),
    getPubgAccountById: vi.fn(async () => state.account),
    getUserByOpenId: vi.fn(async () => ({ id: 99 })),
    getOrderDispute: vi.fn(async () => undefined),
  };
});

import { appRouter } from "./routers";

const makeContext = (id: number, role: "user" | "admin" = "user") => ({
  user: { id, role } as any,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
});

describe("marketplace escrow flow", () => {
  beforeEach(() => {
    state.order = undefined;
    state.account = undefined;
    state.updateSet.mockReset();
    state.updateSet.mockReturnValue({ where: state.updateWhere });
    state.updateWhere.mockReset();
    state.updateWhere.mockResolvedValue({ affectedRows: 1 });
    state.insertValues.mockReset();
    state.insertValues.mockResolvedValue({ insertId: 77 });
    dbMock.transaction.mockReset();
    dbMock.transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
      update: vi.fn(() => ({
        set: state.updateSet,
      })),
      insert: vi.fn(() => ({ values: state.insertValues })),
    }));
  });

  it("creates a pending order with payment frozen as the first stage", async () => {
    state.account = { id: 9, sellerId: 3, playerName: "Inferno Warrior", price: "1499000", status: "available" };
    const caller = appRouter.createCaller(makeContext(2));

    const result = await caller.orders.create({ accountId: 9 });

    expect(result).toEqual({ orderId: 77 });
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 9,
      buyerId: 2,
      sellerId: 3,
      status: "pending",
      escrowStage: "payment_frozen",
    }));
  });

  it("restricts order details to the buyer, seller, or admin", async () => {
    state.order = { id: 10, buyerId: 2, sellerId: 3, status: "in_escrow", escrowStage: "account_verification" };

    await expect(appRouter.createCaller(makeContext(8)).orders.getById(10)).rejects.toThrow("kirish huquqi yo‘q");
    await expect(appRouter.createCaller(makeContext(99, "admin")).orders.getById(10)).resolves.toEqual(state.order);
  });

  it("allows only the next escrow stage and rejects skipped transitions", async () => {
    state.order = { id: 11, buyerId: 2, sellerId: 3, status: "pending", escrowStage: "payment_frozen" };
    const seller = appRouter.createCaller(makeContext(3));

    await expect(seller.orders.updateStatus({ orderId: 11, status: "in_escrow", escrowStage: "account_verification" })).resolves.toEqual({ success: true });
    await expect(seller.orders.updateStatus({ orderId: 11, status: "in_escrow", escrowStage: "buyer_confirmation" })).rejects.toThrow("bosqichi tartibi buzildi");
  });

  it("requires the buyer to confirm only after the buyer-confirmation stage", async () => {
    state.order = { id: 12, accountId: 9, buyerId: 2, sellerId: 3, price: "1499000", status: "in_escrow", escrowStage: "buyer_confirmation" };
    const buyer = appRouter.createCaller(makeContext(2));

    await expect(buyer.orders.confirmBuyer(12)).resolves.toEqual({ success: true });
    expect(state.updateSet).toHaveBeenCalledWith(expect.objectContaining({ buyerConfirmed: true, status: "completed" }));
  });
});

describe("owner notification events", () => {
  beforeEach(() => {
    state.order = undefined;
    state.account = undefined;
    state.insertValues.mockClear();
    state.updateSet.mockClear();
    state.updateWhere.mockClear();
    state.updateSet.mockReturnValue({ where: state.updateWhere });
    state.updateWhere.mockResolvedValue({ affectedRows: 1 });
  });

  it("persists an owner alert when a new listing is submitted", async () => {
    const caller = appRouter.createCaller(makeContext(2));

    await caller.accounts.create({
      accountId: "PUBG-NTF-01",
      playerName: "Inferno Seller",
      level: 72,
      region: "UZ",
      kdRatio: 4.2,
      winRate: 58.4,
      totalMatches: 620,
      headshotPercentage: 21.5,
      ucBalance: 2500,
      outfitCount: 54,
      gunSkinCount: 42,
      vehicleCount: 8,
      featuredSkins: ["M416 Glacier"],
      price: 850000,
      galleryUrls: [],
    });

    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 99,
      type: "new_listing",
      accountId: 77,
    }));
  });

  it("persists an owner alert when escrow payment is frozen", async () => {
    state.account = { id: 9, sellerId: 3, playerName: "Inferno Warrior", price: "1499000", status: "available" };
    const caller = appRouter.createCaller(makeContext(2));

    await caller.orders.create({ accountId: 9 });

    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 99,
      type: "order_status",
      orderId: 77,
      accountId: 9,
    }));
  });

  it("persists an owner alert when a dispute is raised", async () => {
    state.order = { id: 14, buyerId: 2, sellerId: 3, status: "in_escrow" };
    const caller = appRouter.createCaller(makeContext(2));

    await caller.disputes.create({ orderId: 14, reason: "Akkaunt ma'lumotlari mos emas" });

    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 99,
      type: "dispute_alert",
      orderId: 14,
    }));
  });
});

describe("persistence boundary order flow", () => {
  it("tracks a protected order from payment freeze through Completed settlement", async () => {
    state.account = { id: 21, sellerId: 3, playerName: "Inferno Warrior", price: "1499000", status: "available" };
    const buyer = appRouter.createCaller(makeContext(2));
    const { orderId } = await buyer.orders.create({ accountId: 21 });

    state.order = {
      id: orderId,
      accountId: 21,
      buyerId: 2,
      sellerId: 3,
      price: "1499000",
      status: "pending",
      escrowStage: "payment_frozen",
    };
    const seller = appRouter.createCaller(makeContext(3));
    await seller.orders.updateStatus({ orderId, status: "in_escrow", escrowStage: "account_verification" });

    state.order = { ...state.order, status: "in_escrow", escrowStage: "account_verification" };
    await seller.orders.updateStatus({ orderId, status: "in_escrow", escrowStage: "buyer_confirmation" });

    state.order = { ...state.order, escrowStage: "buyer_confirmation" };
    await buyer.orders.confirmBuyer(orderId);

    expect(state.updateSet).toHaveBeenCalledWith(expect.objectContaining({
      buyerConfirmed: true,
      status: "completed",
    }));
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 3,
      type: "seller_payout",
      orderId,
      status: "completed",
    }));
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 3,
      type: "order_status",
      title: "Akkauntingiz sotildi",
      orderId,
      accountId: 21,
    }));
  });
});
