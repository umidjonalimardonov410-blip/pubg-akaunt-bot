import { describe, expect, it } from "vitest";

describe("Telegram bot configuration", () => {
  it("authenticates the bot and includes the configured administrator", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminIds = (process.env.TELEGRAM_ADMIN_IDS ?? "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);

    expect(token, "TELEGRAM_BOT_TOKEN must be configured").toBeTruthy();
    expect(adminIds).toContain("8787603995");

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as {
      ok?: boolean;
      result?: { is_bot?: boolean; username?: string };
    };
    expect(payload.ok).toBe(true);
    expect(payload.result?.is_bot).toBe(true);
    expect(payload.result?.username).toBeTruthy();
  }, 20_000);
});
