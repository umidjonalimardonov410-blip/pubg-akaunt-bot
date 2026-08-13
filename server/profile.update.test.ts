import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getUserById: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  db: { update: vi.fn() },
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getDb: vi.fn(async () => state.db), getUserById: state.getUserById };
});

import { appRouter } from "./routers";

const context = (id: number) => ({
  user: { id, role: "user" } as any,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
});

describe("profile update", () => {
  it("persists the authenticated user's editable identity and avatar fields", async () => {
    state.updateSet.mockReturnValue({ where: state.updateWhere });
    state.updateWhere.mockResolvedValue({ affectedRows: 1 });
    state.db.update.mockReturnValue({ set: state.updateSet });
    const updatedUser = { id: 7, name: "Inferno Seller", profileBio: "Ishonchli sotuvchi", telegramUsername: "@inferno_seller", avatarUrl: "https://storage.test/avatar.png" };
    state.getUserById.mockResolvedValue(updatedUser);

    await expect(appRouter.createCaller(context(7)).profile.update({
      name: "  Inferno Seller  ",
      profileBio: "  Ishonchli sotuvchi  ",
      telegramUsername: "  @inferno_seller  ",
      avatarUrl: "  https://storage.test/avatar.png  ",
    })).resolves.toEqual(updatedUser);

    expect(state.updateSet).toHaveBeenCalledWith({
      name: "Inferno Seller",
      profileBio: "Ishonchli sotuvchi",
      telegramUsername: "@inferno_seller",
      avatarUrl: "https://storage.test/avatar.png",
    });
    expect(state.updateWhere).toHaveBeenCalled();
  });

  it("does not allow an unauthenticated profile edit", async () => {
    await expect(appRouter.createCaller({ user: null, req: {} as any, res: {} as any }).profile.update({ name: "No Session" })).rejects.toThrow();
  });
});

export {};

