import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getSellerAccounts: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getSellerAccounts: state.getSellerAccounts };
});

import { appRouter } from "./routers";

const context = (id: number, role: "user" | "admin" = "user") => ({
  user: { id, role } as any,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
});

describe("seller profile account history", () => {
  beforeEach(() => state.getSellerAccounts.mockReset());

  it("returns active, pending, and sold listings for the authenticated seller without changing statuses", async () => {
    const rows = [
      { id: 11, sellerId: 7, status: "pending_verification", playerName: "Pending Inferno" },
      { id: 12, sellerId: 7, status: "available", playerName: "Active Inferno" },
      { id: 13, sellerId: 7, status: "sold", playerName: "Sold Inferno" },
    ];
    state.getSellerAccounts.mockResolvedValue(rows);

    const result = await appRouter.createCaller(context(7)).accounts.getSellerAccounts();

    expect(state.getSellerAccounts).toHaveBeenCalledWith(7);
    expect(result.map(account => account.status)).toEqual(["pending_verification", "available", "sold"]);
    expect(result.find(account => account.status === "sold")?.playerName).toBe("Sold Inferno");
  });

  it("blocks a regular user from reading another seller's profile history but allows admins", async () => {
    await expect(appRouter.createCaller(context(7)).accounts.getSellerAccounts(8)).rejects.toThrow("kirish huquqi yo‘q");

    state.getSellerAccounts.mockResolvedValue([{ id: 21, sellerId: 8, status: "sold" }]);
    await expect(appRouter.createCaller(context(1, "admin")).accounts.getSellerAccounts(8)).resolves.toEqual([
      { id: 21, sellerId: 8, status: "sold" },
    ]);
  });
});

export {};
