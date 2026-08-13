import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTelegramCommandResponse,
  handleTelegramUpdate,
  isTelegramAdmin,
  parseTelegramCommand,
  registerTelegramWebhook,
} from "./telegramBot";

describe("Telegram bot command layer", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_ADMIN_IDS = "8787603995";
    process.env.TELEGRAM_MINI_APP_URL = "https://inferno-stealth-production.up.railway.app";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true, result: true }), { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });

  it("normalizes commands with bot usernames", () => {
    expect(parseTelegramCommand("/buy@InfernoStealthBot")).toBe("buy");
    expect(parseTelegramCommand("  /START  ")).toBe("start");
  });

  it("allows only the configured Telegram administrator", () => {
    expect(isTelegramAdmin("8787603995")).toBe(true);
    expect(isTelegramAdmin("123456789")).toBe(false);
    expect(getTelegramCommandResponse("admin", "123456789").title).toBe("Ruxsat cheklangan");
    expect(getTelegramCommandResponse("admin", "8787603995").path).toBe("/admin");
  });

  it("returns credible Uzbek menu copy and sends a Mini App button", async () => {
    const result = await handleTelegramUpdate({
      update_id: 1,
      message: { chat: { id: 42 }, from: { id: 8787603995 }, text: "/buy" },
    });
    expect(result).toMatchObject({ handled: true, command: "buy", status: "active", sent: true });
    const fetchMock = vi.mocked(fetch);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.text).toContain("admin tekshiruvidan o‘tadi");
    expect(body.reply_markup.inline_keyboard[0][0].web_app.url).toBe(
      "https://inferno-stealth-production.up.railway.app/accounts"
    );
  });

  it("accepts the configured webhook secret on the authenticated endpoint path", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "configured-secret";
    let routeHandler: ((req: any, res: any) => Promise<void>) | undefined;
    registerTelegramWebhook({ post: (_path: string, handler: any) => { routeHandler = handler; } } as any);
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await routeHandler?.({ header: () => "configured-secret", body: { message: { chat: { id: 42 }, from: { id: 8787603995 }, text: "/start" } } }, response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, command: "start" }));
  });

  it("rejects webhook requests with the wrong secret", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "expected-secret";
    let routeHandler: ((req: any, res: any) => Promise<void>) | undefined;
    registerTelegramWebhook({ post: (_path: string, handler: any) => { routeHandler = handler; } } as any);
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await routeHandler?.({ header: () => "wrong-secret", body: {} }, response);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});
