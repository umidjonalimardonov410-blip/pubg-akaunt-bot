import { createHmac, timingSafeEqual } from "node:crypto";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;

function loginSecret() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  return createHmac("sha256", "InfernoLoginToken").update(token).digest();
}

export type TelegramLoginPayload = {
  telegramId: string;
  name: string;
  phone?: string;
  issuedAt: number;
};

/** Create a short-lived signed token so a phone-verified Telegram user can open the Mini App logged in. */
export function createTelegramLoginToken(payload: Omit<TelegramLoginPayload, "issuedAt">) {
  const secret = loginSecret();
  if (!secret) return null;
  const body: TelegramLoginPayload = { ...payload, issuedAt: Date.now() };
  const encoded = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyTelegramLoginToken(token: string): TelegramLoginPayload | null {
  const secret = loginSecret();
  if (!secret || !token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TelegramLoginPayload;
    if (!payload?.telegramId) return null;
    if (!Number.isFinite(payload.issuedAt) || Date.now() - payload.issuedAt > LOGIN_TOKEN_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
