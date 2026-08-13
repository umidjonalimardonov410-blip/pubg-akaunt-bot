import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  account: { id: 44, sellerId: 2, playerName: "Inferno Glacier", price: "900000.00", status: "available" },
  watchers: [{ userId: 7 }, { userId: 8 }],
  insertValues: vi.fn(),
  updateWhere: vi.fn(),
  db: { insert: vi.fn(), update: vi.fn(), select: vi.fn() },
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => state.db),
    getPubgAccountById: vi.fn(async () => state.account),
  };
});

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn(async () => undefined) }));

import { appRouter } from "./routers";

const context = (id: number, role: "user" | "admin" = "user") => ({
  user: { id, role } as any,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
});

describe("wishlist price-drop alerts", () => {
  beforeEach(() => {
    state.account = { id: 44, sellerId: 2, playerName: "Inferno Glacier", price: "900000.00", status: "available" };
    state.watchers = [{ userId: 7 }, { userId: 8 }];
    state.insertValues.mockReset().mockResolvedValue({ insertId: 1 });
    state.updateWhere.mockReset().mockResolvedValue({ affectedRows: 1 });
    state.db.insert.mockReset().mockReturnValue({ values: state.insertValues });
    state.db.update.mockReset().mockReturnValue({ set: vi.fn(() => ({ where: state.updateWhere })) });
    state.db.select.mockReset().mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(async () => state.watchers) })) });
  });

  it("notifies every opted-in watcher only when a seller lowers an available listing price", async () => {
    const result = await appRouter.createCaller(context(2)).accounts.updatePrice({ accountId: 44, price: 750000 });

    expect(result).toMatchObject({ success: true, oldPrice: 900000, newPrice: 750000, notifiedCount: 2 });
    expect(state.insertValues).toHaveBeenCalledTimes(2);
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, type: "price_drop", accountId: 44 }));
    expect(state.insertValues).toHaveBeenCalledWith(expect.objectContaining({ userId: 8, type: "price_drop", accountId: 44 }));
  });

  it("rejects a non-owner from changing a listing price", async () => {
    await expect(appRouter.createCaller(context(99)).accounts.updatePrice({ accountId: 44, price: 750000 }))
      .rejects.toThrow("Bu e’lon narxini o‘zgartirish huquqi yo‘q");
    expect(state.db.update).not.toHaveBeenCalled();
  });
});
