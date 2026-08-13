import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  account: undefined as any,
  order: undefined as any,
  existingReview: undefined as any,
  owner: { id: 99 } as any,
  insertValues: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  selectFrom: vi.fn(),
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => state.db),
    getPubgAccountById: vi.fn(async () => state.account),
    getOrderById: vi.fn(async () => state.order),
    getOrderReview: vi.fn(async () => state.existingReview),
    getUserByOpenId: vi.fn(async () => state.owner),
    getPendingAccounts: vi.fn(async () => []),
    getAdminDisputes: vi.fn(async () => []),
  };
});

vi.mock("./storage", () => ({
  storagePut: vi.fn(async () => ({ key: "users/2/accounts/proof.png", url: "https://storage.test/proof.png" })),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => undefined),
}));

import { appRouter } from "./routers";

const makeContext = (id: number, role: "user" | "admin" = "user") => ({
  user: { id, role } as any,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
});

const accountInput = {
  accountId: "PUBG-CRITICAL-01",
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
};

beforeEach(() => {
  state.account = undefined;
  state.order = undefined;
  state.existingReview = undefined;
  state.owner = { id: 99 };
  state.insertValues.mockReset();
  state.insertValues.mockResolvedValue({ insertId: 31 });
  state.updateSet.mockReset();
  state.updateWhere.mockReset();
  state.updateSet.mockReturnValue({ where: state.updateWhere });
  state.updateWhere.mockResolvedValue({ affectedRows: 1 });
  state.selectFrom.mockReset();
  state.selectFrom.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  state.db.insert.mockReset();
  state.db.insert.mockReturnValue({ values: state.insertValues });
  state.db.update.mockReset();
  state.db.update.mockReturnValue({ set: state.updateSet });
  state.db.select.mockReset();
  state.db.select.mockReturnValue({ from: state.selectFrom });
  state.db.transaction.mockReset();
  state.db.transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
    update: vi.fn(() => ({ set: state.updateSet })),
    insert: vi.fn(() => ({ values: state.insertValues })),
  }));
});

describe("critical marketplace procedures", () => {
  it("creates new listings as pending verification and persists an owner alert", async () => {
    const caller = appRouter.createCaller(makeContext(2));

    const result = await caller.accounts.create(accountInput);

    expect(result).toEqual({ id: 31 });
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      sellerId: 2,
      status: "pending_verification",
      featuredSkins: ["M416 Glacier"],
    }));
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 99,
      type: "new_listing",
      accountId: 31,
    }));
  });

  it("rejects unsupported media types before storage upload", async () => {
    const caller = appRouter.createCaller(makeContext(2));

    await expect(caller.media.upload({
      fileName: "proof.pdf",
      contentType: "application/pdf" as any,
      dataBase64: "cHJvb2Y=",
    })).rejects.toBeTruthy();
  });

  it("enforces buyer ownership and one-review-per-order behavior", async () => {
    state.order = { id: 44, buyerId: 2, sellerId: 3, status: "completed" };

    await expect(appRouter.createCaller(makeContext(8)).reviews.create({
      orderId: 44,
      rating: 5,
      comment: "Tez va ishonchli",
    })).rejects.toThrow("FORBIDDEN");

    const buyer = appRouter.createCaller(makeContext(2));
    await expect(buyer.reviews.create({
      orderId: 44,
      rating: 5,
      comment: "Tez va ishonchli",
    })).resolves.toEqual({ reviewId: 31 });

    state.existingReview = { id: 31, orderId: 44 };
    await expect(buyer.reviews.create({
      orderId: 44,
      rating: 4,
      comment: "Takroriy sharh",
    })).rejects.toThrow("Sharh allaqachon qoldirilgan");
  });

  it("requires manual receipt upload for wallet top-ups and blocks withdrawals without sufficient balance", async () => {
    const caller = appRouter.createCaller(makeContext(2));

    await expect(caller.wallet.topup({ amount: 100000 })).rejects.toThrow("chek yuboring");

    state.updateWhere.mockResolvedValueOnce({ affectedRows: 0 });
    await expect(caller.wallet.withdraw({ amount: 10000, destination: "8600 1234" })).rejects.toThrow("balans yetarli emas");
  });

  it("restricts admin actions and broadcasts to every registered user", async () => {
    await expect(appRouter.createCaller(makeContext(2)).admin.getPendingAccounts()).rejects.toThrow("FORBIDDEN");

    const admin = appRouter.createCaller(makeContext(1, "admin"));
    await expect(admin.admin.broadcast({ title: "Muhim xabar", message: "Tekshiruv boshlandi" })).resolves.toEqual({
      success: true,
      recipients: 2,
    });
    expect(state.insertValues).toHaveBeenCalledWith([
      { userId: 1, type: "admin_message", title: "Muhim xabar", message: "Tekshiruv boshlandi" },
      { userId: 2, type: "admin_message", title: "Muhim xabar", message: "Tekshiruv boshlandi" },
    ]);
  });

  it("only lets the notification owner mark an alert as read", async () => {
    const caller = appRouter.createCaller(makeContext(2));

    state.updateWhere.mockResolvedValueOnce({ affectedRows: 0 });
    await expect(caller.notifications.markAsRead(88)).rejects.toThrow("o‘qilgan");

    state.updateWhere.mockResolvedValueOnce({ affectedRows: 1 });
    await expect(caller.notifications.markAsRead(88)).resolves.toEqual({ success: true });
  });
});
