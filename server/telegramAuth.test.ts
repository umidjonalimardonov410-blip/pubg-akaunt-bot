import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateTelegramInitData } from "./telegramAuth";

const BOT_TOKEN = "123456:telegram-test-token";

function signedInitData(authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "AAEAAAE",
    user: JSON.stringify({ id: 8801986213, first_name: "Test", username: "test_user" }),
  });
  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("Telegram WebApp authentication", () => {
  it("accepts a correctly signed initData payload", () => {
    expect(validateTelegramInitData(signedInitData(), BOT_TOKEN)).toEqual(expect.objectContaining({ id: 8801986213, username: "test_user" }));
  });

  it("rejects tampered payloads", () => {
    const tampered = signedInitData().replace("test_user", "attacker");
    expect(validateTelegramInitData(tampered, BOT_TOKEN)).toBeNull();
  });

  it("rejects payloads older than 24 hours", () => {
    const old = signedInitData(Math.floor(Date.now() / 1000) - 24 * 60 * 60 - 1);
    expect(validateTelegramInitData(old, BOT_TOKEN)).toBeNull();
  });
});
