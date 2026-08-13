import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: 7, openId: "telegram:12345" },
  storagePut: vi.fn(),
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock("./db", () => ({
  getUserByOpenId: vi.fn(async () => state.user),
  getDb: vi.fn(async () => state.db),
  getInsertId: vi.fn((result: { insertId?: number }) => result.insertId ?? 1),
}));

vi.mock("./storage", () => ({
  storagePut: state.storagePut,
}));

import { handleTelegramUpdate } from "./telegramBot";

describe("Telegram manual wallet receipt capture", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_MINI_APP_URL = "https://example.com";
    process.env.ADMIN_PAYOUT_CARD_NUMBER = "5614680577167758";
    process.env.ADMIN_PAYOUT_CARD_HOLDER = "Alimardonov U";
    process.env.TELEGRAM_ADMIN_IDS = "999";
    state.storagePut.mockReset();
    state.storagePut.mockResolvedValue({ key: "users/7/receipts/telegram-proof.jpg", url: "https://storage.test/telegram-proof.jpg" });
    state.db.transaction.mockReset();
    state.db.transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
      insert: vi.fn().mockImplementation((table: unknown) => ({
        values: vi.fn(async (values: { type?: string }) => ({ insertId: values.type === "topup" ? 501 : 601 })),
      })),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_MINI_APP_URL;
    delete process.env.ADMIN_PAYOUT_CARD_NUMBER;
    delete process.env.ADMIN_PAYOUT_CARD_HOLDER;
    delete process.env.TELEGRAM_ADMIN_IDS;
  });

  it("persists a selected amount and uploaded Telegram photo as a pending deposit receipt", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("getFile")) {
        return { ok: true, json: async () => ({ ok: true, result: { file_path: "photos/proof.jpg" } }) };
      }
      if (url.includes("/file/bot")) {
        return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer };
      }
      return { ok: true, json: async () => ({ ok: true, result: { message_id: 700 } }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const selected = await handleTelegramUpdate({
      callback_query: {
        id: "callback-1",
        data: "wallet_amount:20000",
        message: { chat: { id: 12345 } },
      },
    });
    expect(selected).toMatchObject({ handled: true, command: "wallet_amount", amount: 20000, sent: true });

    const result = await handleTelegramUpdate({
      message: {
        chat: { id: 12345, type: "private" },
        from: { id: 12345 },
        photo: [{ file_id: "telegram-file-1", file_size: 1200, width: 600, height: 800 }],
      },
    });

    expect(result).toMatchObject({ handled: true, command: "wallet_receipt", sent: true, receiptId: 601 });
    expect(state.storagePut).toHaveBeenCalledWith(expect.stringContaining("users/7/receipts/telegram-"), expect.any(Buffer), "image/jpeg");
    expect(state.db.transaction).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("chat_id=999") || String(url).includes("sendMessage"))).toBe(true);
  });
});
