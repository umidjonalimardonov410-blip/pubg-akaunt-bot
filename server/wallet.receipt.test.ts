import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selectRows: [] as any[],
  insertValues: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
}));

const makeSelect = () => {
  const chain: any = {
    from: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: async () => state.selectRows,
    limit: async () => state.selectRows,
    then: (resolve: any) => Promise.resolve(state.selectRows).then(resolve),
  };
  return chain;
};

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => dbMock),
    getUserByOpenId: vi.fn(async () => ({ id: 7, role: "user" })),
  };
});

vi.mock("./telegramBot", () => ({
  notifyTelegramUser: vi.fn(async () => undefined),
  notifyAdminsAboutDepositReceipt: vi.fn(async () => ({ sent: true })),
}));

import { appRouter } from "./routers";

const ctxFor = (id: number, role: "user" | "admin" = "user") => ({
  user: { id, role } as any,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
});

describe("deposit receipt submission and admin review", () => {
  beforeEach(() => {
    state.selectRows = [];
    state.insertValues.mockReset();
    state.insertValues.mockResolvedValue({ insertId: 55 });
    state.updateSet.mockReset();
    state.updateWhere.mockReset();
    state.updateWhere.mockResolvedValue({ affectedRows: 1 });
    state.updateSet.mockReturnValue({ where: state.updateWhere });
    dbMock.select.mockReset();
    dbMock.select.mockImplementation(() => makeSelect());
    dbMock.insert.mockReset();
    dbMock.insert.mockImplementation(() => ({ values: state.insertValues }));
    dbMock.update.mockReset();
    dbMock.update.mockImplementation(() => ({ set: state.updateSet }));
    dbMock.transaction.mockReset();
    dbMock.transaction.mockImplementation(async (cb: (tx: any) => unknown) => cb({
      select: () => makeSelect(),
      insert: () => ({ values: state.insertValues }),
      update: () => ({ set: state.updateSet }),
    }));
  });

  it("accepts any positive amount and stores a pending receipt", async () => {
    const caller = appRouter.createCaller(ctxFor(7));
    const result = await caller.wallet.submitReceipt({
      amount: 137000,
      receiptKey: "users/7/receipts/chek.jpg",
      receiptUrl: "https://storage.test/chek.jpg",
    });

    expect(result).toMatchObject({ success: true, receiptId: 55 });
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      amount: "137000",
      receiptKey: "users/7/receipts/chek.jpg",
      status: "pending",
    }));
  });

  it("derives a storage key when only the receipt url is provided", async () => {
    const caller = appRouter.createCaller(ctxFor(7));
    await caller.wallet.submitReceipt({ amount: 25000, receiptUrl: "https://storage.test/proof.png" });

    const receiptInsert = state.insertValues.mock.calls
      .map(([values]) => values as any)
      .find((values) => typeof values.receiptKey === "string");
    expect(receiptInsert.receiptKey.startsWith("users/7/receipts/")).toBe(true);
  });

  it("rejects a receipt key belonging to another user", async () => {
    const caller = appRouter.createCaller(ctxFor(7));
    await expect(caller.wallet.submitReceipt({
      amount: 10000,
      receiptKey: "users/8/receipts/chek.jpg",
      receiptUrl: "https://storage.test/chek.jpg",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("lists the caller's own receipts", async () => {
    state.selectRows = [{ id: 1, userId: 7, amount: "50000", status: "pending" }];
    const caller = appRouter.createCaller(ctxFor(7));
    await expect(caller.wallet.myReceipts()).resolves.toEqual(state.selectRows);
  });

  it("returns pending receipts to admins with user info", async () => {
    state.selectRows = [{ id: 3, amount: "80000", receiptUrl: "u", status: "pending", createdAt: new Date(), userId: 7, userName: "Inspector", userOpenId: "telegram:1" }];
    const caller = appRouter.createCaller(ctxFor(1, "admin"));
    const rows = await caller.admin.pendingReceipts();
    expect(rows[0]).toMatchObject({ id: 3, amount: 80000, userName: "Inspector" });
  });

  it("credits the wallet when an admin approves a receipt", async () => {
    state.selectRows = [{ id: 3, userId: 7, amount: "80000", status: "pending", transactionId: 12 }];
    const caller = appRouter.createCaller(ctxFor(1, "admin"));
    const result = await caller.admin.reviewReceipt({ id: 3, action: "approve" });

    expect(result).toMatchObject({ success: true, id: 3, status: "approved" });
    expect(state.updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", reviewedBy: 1 }));
    expect(state.updateSet).toHaveBeenCalledWith(expect.objectContaining({ walletBalance: expect.anything() }));
  });

  it("does not credit the wallet when rejected", async () => {
    state.selectRows = [{ id: 4, userId: 7, amount: "80000", status: "pending", transactionId: 13 }];
    const caller = appRouter.createCaller(ctxFor(1, "admin"));
    const result = await caller.admin.reviewReceipt({ id: 4, action: "reject", note: "Chek noaniq" });

    expect(result).toMatchObject({ status: "rejected" });
    expect(state.updateSet).not.toHaveBeenCalledWith(expect.objectContaining({ walletBalance: expect.anything() }));
  });

  it("blocks non-admins from the review endpoints", async () => {
    const caller = appRouter.createCaller(ctxFor(7));
    await expect(caller.admin.pendingReceipts()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.reviewReceipt({ id: 1, action: "approve" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
