import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  account: undefined as any,
  order: undefined as any,
  existingReview: undefined as any,
  selectRows: [] as any[],
  transactionRows: [] as any[],
  owner: { id: 99 } as any,
  chatThread: undefined as any,
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
    getUserById: vi.fn(async (id: number) => ({ id, openId: `manual:${id}` })),
    getChatThreadById: vi.fn(async () => state.chatThread),
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
  state.selectRows = [{ id: 1 }, { id: 2 }];
  state.transactionRows = [];
  state.owner = { id: 99 };
  state.chatThread = undefined;
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
  state.db.select.mockReturnValue({
    from: vi.fn(() => {
      const query: any = {
        where: vi.fn(() => ({ limit: vi.fn(async () => state.selectRows) })),
        orderBy: vi.fn(async () => state.selectRows),
      };
      query.then = (resolve: (rows: any[]) => unknown) => Promise.resolve(resolve(state.selectRows));
      return query;
    }),
  });
  state.db.transaction.mockReset();
  state.db.transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(async () => state.transactionRows) })),
      })),
    })),
    update: vi.fn(() => ({ set: state.updateSet })),
    insert: vi.fn(() => ({ values: state.insertValues })),
  }));
});

describe("critical marketplace procedures", () => {
  it("creates new listings as public marketplace listings and persists an owner alert", async () => {
    const caller = appRouter.createCaller(makeContext(2));

    const result = await caller.accounts.create(accountInput);

    expect(result).toEqual({ id: 31, status: "pending_verification" });
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

  it("allows the seller to edit an available listing and blocks another seller", async () => {
    state.account = { id: 31, sellerId: 2, status: "available", playerName: "Inferno Seller" };
    const seller = appRouter.createCaller(makeContext(2));

    await expect(seller.accounts.update({
      id: 31,
      playerName: "Inferno Seller Updated",
      level: 80,
      region: "EU",
      price: 910000,
      description: "Yangilangan tavsif",
      featuredSkins: ["M416 Glacier", "X-Suit"],
    })).resolves.toEqual({ success: true });
    expect(state.updateSet).toHaveBeenCalledWith(expect.objectContaining({
      playerName: "Inferno Seller Updated",
      level: 80,
      region: "EU",
      price: "910000",
      featuredSkins: ["M416 Glacier", "X-Suit"],
    }));

    await expect(appRouter.createCaller(makeContext(8)).accounts.update({
      id: 31,
      price: 1000,
    })).rejects.toThrow("Faqat o‘z e’loningizni tahrirlashingiz mumkin");
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

  it("submits only supported receipt amounts, persists a pending transaction, and blocks duplicate receipt keys", async () => {
    const caller = appRouter.createCaller(makeContext(2));
    state.selectRows = [];

    const result = await caller.wallet.submitReceipt({
      amount: 20000,
      receiptKey: "users/2/receipts/proof-1.jpg",
      receiptUrl: "https://storage.test/proof-1.jpg",
    });

    expect(result).toMatchObject({ success: true, receiptId: 31, transactionId: 31 });
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 2,
      type: "topup",
      amount: "20000",
      status: "pending",
    }));
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 2,
      receiptKey: "users/2/receipts/proof-1.jpg",
      status: "pending",
      transactionId: 31,
    }));

    state.selectRows = [{ id: 31 }];
    await expect(caller.wallet.submitReceipt({
      amount: 20000,
      receiptKey: "users/2/receipts/proof-1.jpg",
      receiptUrl: "https://storage.test/proof-1.jpg",
    })).rejects.toThrow("allaqachon yuborilgan");
    await expect(caller.wallet.submitReceipt({
      amount: 15000 as 20000,
      receiptKey: "users/2/receipts/proof-2.jpg",
      receiptUrl: "https://storage.test/proof-2.jpg",
    })).rejects.toBeTruthy();
  });

  it("approves a pending receipt exactly once, credits the wallet, and writes approval notification/audit events", async () => {
    const admin = appRouter.createCaller(makeContext(1, "admin"));
    state.transactionRows = [{ id: 31, userId: 2, amount: "20000", status: "pending", transactionId: 31 }];

    await expect(admin.admin.reviewDepositReceipt({ receiptId: 31, approved: true })).resolves.toEqual({ success: true, status: "approved" });
    expect(state.updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", reviewedBy: 1 }));
    expect(state.updateSet).toHaveBeenCalledWith(expect.objectContaining({ walletBalance: expect.anything() }));
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "deposit_receipt_approved",
      userId: 2,
    }));
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      title: "Balans to‘ldirildi",
      userId: 2,
    }));

    state.transactionRows = [{ id: 31, userId: 2, amount: "20000", status: "approved", transactionId: 31 }];
    await expect(admin.admin.reviewDepositReceipt({ receiptId: 31, approved: true })).rejects.toThrow("allaqachon ko‘rib chiqilgan");
  });

  it("rejects a pending payout, records the audit trail, and notifies the account owner", async () => {
    const admin = appRouter.createCaller(makeContext(1, "admin"));
    state.transactionRows = [{ id: 77, userId: 2, amount: "15000", status: "pending", type: "withdrawal", description: "Yechib olish so‘rovi" }];

    await expect(admin.admin.processPayout({ transactionId: 77, approved: false, note: "Karta ma’lumoti mos emas" })).resolves.toEqual({ success: true, status: "failed" });
    expect(state.updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
    expect(state.updateSet).toHaveBeenCalledWith(expect.objectContaining({ walletBalance: expect.anything() }));
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "payout_rejected",
      userId: 2,
    }));
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      title: "Yechib olish rad etildi",
      userId: 2,
    }));

    state.transactionRows = [{ id: 77, userId: 2, amount: "15000", status: "failed", type: "withdrawal" }];
    await expect(admin.admin.processPayout({ transactionId: 77, approved: false })).rejects.toThrow("allaqachon ko‘rib chiqilgan");
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

  it("notifies the seller when a buyer sends a new chat message", async () => {
    state.chatThread = { id: 55, buyerId: 2, sellerId: 3, accountId: 31, orderId: 44 };
    const buyer = appRouter.createCaller(makeContext(2));

    await expect(buyer.chat.send({ threadId: 55, body: "Assalomu alaykum, akkaunt hali mavjudmi?" })).resolves.toEqual({ messageId: 31 });
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 3,
      type: "admin_message",
      title: "Xaridordan yangi xabar",
      message: "Assalomu alaykum, akkaunt hali mavjudmi?",
      accountId: 31,
      orderId: 44,
    }));
  });

  it("only lets the notification owner mark an alert as read", async () => {
    const caller = appRouter.createCaller(makeContext(2));

    state.updateWhere.mockResolvedValueOnce({ affectedRows: 0 });
    await expect(caller.notifications.markAsRead(88)).rejects.toThrow("o‘qilgan");

    state.updateWhere.mockResolvedValueOnce({ affectedRows: 1 });
    await expect(caller.notifications.markAsRead(88)).resolves.toEqual({ success: true });
  });
});
