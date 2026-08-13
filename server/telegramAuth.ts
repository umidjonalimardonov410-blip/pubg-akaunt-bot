import { createHmac, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { getUserByOpenId, upsertUser } from "./db";

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export function validateTelegramInitData(initData: string, botToken = process.env.TELEGRAM_BOT_TOKEN): TelegramUser | null {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) return null;

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const receivedBuffer = Buffer.from(receivedHash, "hex");
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) return null;

  const authDate = Number(params.get("auth_date"));
  const now = Date.now();
  if (!Number.isFinite(authDate) || authDate <= 0 || now - authDate * 1000 > 24 * 60 * 60 * 1000 || authDate * 1000 - now > 5 * 60 * 1000) return null;

  try {
    const user = JSON.parse(params.get("user") || "null") as TelegramUser | null;
    if (!user || !Number.isInteger(user.id) || user.id <= 0) return null;
    return user;
  } catch {
    return null;
  }
}

function telegramDisplayName(user: TelegramUser) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fullName || user.username || `Telegram ${user.id}`;
}

export function registerTelegramAuthRoute(app: Express) {
  app.post("/api/telegram/auth", async (req: Request, res: Response) => {
    const user = validateTelegramInitData(String(req.body?.initData || ""));
    if (!user) {
      res.status(401).json({ ok: false, message: "Telegram WebApp imzosi yaroqsiz yoki muddati tugagan." });
      return;
    }

    const openId = `telegram:${user.id}`;
    const name = telegramDisplayName(user);
    try {
      await upsertUser({ openId, name, loginMethod: "telegram", lastSignedIn: new Date() });
      const sessionToken = await sdk.createSessionToken(openId, { name, expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      const savedUser = await getUserByOpenId(openId);
      res.json({ ok: true, user: savedUser ? { id: savedUser.id, name: savedUser.name, loginMethod: savedUser.loginMethod } : { openId, name, loginMethod: "telegram" } });
    } catch (error) {
      console.error("[Telegram Auth] Failed to create session", error);
      res.status(500).json({ ok: false, message: "Telegram orqali login vaqtincha ishlamadi." });
    }
  });
}
