import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  request: undefined as any,
  withdrawalRows: [] as any[],
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
  selectWhere: vi.fn(),
  txUpdateWhere: vi.fn(),
  txInsertValues: vi.fn(),
  notificationValues: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getDb: vi.fn(async () => state.db) };
});

import { appRouter } from "./routers";

const makeContext = (id: number, role: "user" | "admin" = "user") => ({
  user: { id, role } as any,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
});

beforeEach(() => {
  state.request = undefined;
  state.withdrawalRows = [];
  state.selectWhere.mockReset();
  state.txUpdateWhere.mockReset().mockResolvedValue({ affectedRows: 1 });
  state.txInsertValues.mockReset().mockResolvedValue({ insertId: 22 });
  state.notificationValues.mockReset().mockResolvedValue({ insertId: 23 });
  state.db.select.mockReset();
  state.db.update.mockReset();
  state.db.insert.mockReset();
  state.db.transaction.mockReset();

  state.db.select.mockReturnValue({
    from: vi.fn(() => ({
      orderBy: vi.fn(() => ({ limit: vi.fn(async () => state.withdrawalRows) })),
    })),
  });
  state.db.insert.mockReturnValue({ values: state.notificationValues });
  state.db.transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(async () => state.request ? [state.request] : []) })),
      })),
    })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: state.txUpdateWhere })) })),
    insert: vi.fn(() => ({ values: state.txInsertValues })),
  }));
});

describe("admin withdrawal procedures", () => {
  it("restricts the withdrawal queue to admins", async () => {
    await expect(appRouter.createCaller(makeContext(2)).admin.getWithdrawalRequests()).rejects.toThrow("FORBIDDEN");
  });

  it("exposes an Uzbek checklist and creates a staging-only test without a wallet mutation", async () => {
    const user = appRouter.createCaller(makeContext(2));
    await expect(user.admin.getWithdrawalChecklist()).rejects.toThrow("FORBIDDEN");
    await expect(user.admin.getAuditLogs()).rejects.toThrow("FORBIDDEN");
    await expect(user.admin.createTestWithdrawal({ amount: 25000 })).rejects.toThrow("FORBIDDEN");

    const admin = appRouter.createCaller(makeContext(1, "admin"));
    await expect(admin.admin.getWithdrawalChecklist()).resolves.toEqual(expect.objectContaining({
      stagingTestEnabled: true,
      items: expect.arrayContaining([expect.stringContaining("Telegram ID")]),
    }));
    await expect(admin.admin.createTestWithdrawal({ amount: 25000, useMockBalance: false })).rejects.toThrow("Mock balans");
    await expect(admin.admin.createTestWithdrawal({ amount: 25000, useMockBalance: true })).resolves.toEqual({
      success: true,
      requestId: 23,
      isTest: true,
      mockBalance: true,
    });
    expect(state.notificationValues).toHaveBeenCalledWith(expect.objectContaining({
      adminId: 1,
      action: "staging_withdrawal_created",
      targetType: "withdrawal",
      targetId: 23,
    }));
    expect(state.txInsertValues).not.toHaveBeenCalled();
  });

  it("marks staging review actions without refunding a real wallet balance", async () => {
    state.request = { id: 9, userId: 3, amount: "40000", cardNumber: "0000000000000000", cardHolderName: "STAGING TEST", status: "pending", isTest: true };
    const admin = appRouter.createCaller(makeContext(1, "admin"));
    await expect(admin.admin.reviewWithdrawal({ requestId: 9, approved: false, notes: "Mock test rad etildi." })).resolves.toEqual({
      success: true,
      requestId: 9,
      approved: false,
      amount: "40000",
    });
    expect(state.txInsertValues).toHaveBeenCalledWith(expect.objectContaining({
      action: "staging_withdrawal_reviewed",
      targetId: 9,
    }));
    expect(state.txInsertValues).not.toHaveBeenCalledWith(expect.objectContaining({ type: "topup" }));
  });

  it("approves a pending request and notifies the user", async () => {
    state.request = { id: 7, userId: 2, amount: "25000", cardNumber: "5614360036007758", cardHolderName: "Alimardonov U", status: "pending", isTest: false };
    state.withdrawalRows = [state.request];
    const admin = appRouter.createCaller(makeContext(1, "admin"));

    await expect(admin.admin.getWithdrawalRequests()).resolves.toEqual([state.request]);
    await expect(admin.admin.reviewWithdrawal({ requestId: 7, approved: true, notes: "Chek tekshirildi." })).resolves.toEqual({
      success: true,
      requestId: 7,
      approved: true,
      amount: "25000",
    });
    expect(state.notificationValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 2,
      title: "Pul yechish tasdiqlandi",
    }));
    expect(state.txInsertValues).toHaveBeenCalledWith(expect.objectContaining({
      adminId: 1,
      action: "withdrawal_reviewed",
      targetType: "withdrawal",
      targetId: 7,
    }));
  });

  it("rejects a pending request and refunds the wallet", async () => {
    state.request = { id: 8, userId: 3, amount: "40000", cardNumber: "8600123412345678", cardHolderName: "Seller U", status: "pending", isTest: false };
    const admin = appRouter.createCaller(makeContext(1, "admin"));

    await expect(admin.admin.reviewWithdrawal({ requestId: 8, approved: false, notes: "Karta egasi tasdig‘i kerak." })).resolves.toEqual({
      success: true,
      requestId: 8,
      approved: false,
      amount: "40000",
    });
    expect(state.txInsertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 3,
      type: "topup",
      amount: "40000",
      status: "completed",
    }));
    expect(state.notificationValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 3,
      title: "Pul yechish rad etildi",
    }));
  });
});

export {};
 
