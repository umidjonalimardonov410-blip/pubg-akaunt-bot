import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  account: { id: 77 },
  favoriteRows: [] as Array<{ id: number; userId: number; accountId: number }>,
  nextId: 1,
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => state.db),
    getPubgAccountById: vi.fn(async (id: number) => (id === state.account.id ? state.account : undefined)),
  };
});

import { appRouter } from "./routers";

const makeContext = (id: number) => ({
  user: { id, role: "user" } as any,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
});

beforeEach(() => {
  state.favoriteRows = [];
  state.nextId = 1;
  state.account = { id: 77 };
  state.db.select.mockReset();
  state.db.insert.mockReset();
  state.db.delete.mockReset();

  const limit = vi.fn(async () => state.favoriteRows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  state.db.select.mockReturnValue({ from });
  state.db.insert.mockReturnValue({
    values: vi.fn(async (row: { userId: number; accountId: number }) => {
      state.favoriteRows.push({ id: state.nextId++, ...row });
      return { affectedRows: 1 };
    }),
  });
  state.db.delete.mockReturnValue({
    where: vi.fn(async () => {
      state.favoriteRows = [];
      return { affectedRows: 1 };
    }),
  });
});

describe("favorites persistence", () => {
  it("saves a listing and removes it again for the same user", async () => {
    const caller = appRouter.createCaller(makeContext(12));

    await expect(caller.favorites.toggle({ accountId: 77 })).resolves.toEqual({ saved: true });
    expect(state.favoriteRows).toEqual([{ id: 1, userId: 12, accountId: 77 }]);

    await expect(caller.favorites.toggle({ accountId: 77 })).resolves.toEqual({ saved: false });
    expect(state.favoriteRows).toEqual([]);
  });

  it("rejects saving an account that does not exist", async () => {
    const caller = appRouter.createCaller(makeContext(12));

    await expect(caller.favorites.toggle({ accountId: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(state.favoriteRows).toEqual([]);
  });
});
