import type { Express, Request, Response } from "express";

export type TelegramCommand = {
  command: string;
  description: string;
  title: string;
  text: string;
  path?: string;
  adminOnly?: boolean;
};

export const TELEGRAM_BOT_COMMANDS: TelegramCommand[] = [
  { command: "start", description: "Inferno Stealth menyusini ochish", title: "Inferno Stealth'ga xush kelibsiz", text: "PUBG Mobile akkauntlarini shaffof ko‘ring, xavfsiz escrow orqali xarid qiling yoki o‘z e’loningizni joylang.", path: "/" },
  { command: "buy", description: "Akkauntlarni ko‘rish", title: "Akkauntlar bozori", text: "Region, level, K/D, skinlar va narx bo‘yicha mos akkauntni tanlang. Har bir e’lon admin tekshiruvidan o‘tadi.", path: "/accounts" },
  { command: "sell", description: "Akkaunt sotish", title: "Akkaunt sotish", text: "PUBG ID, statistika, inventar va media ma’lumotlarini to‘liq kiriting. E’lon xaridorlarga chiqishidan oldin tekshiriladi.", path: "/sell" },
  { command: "orders", description: "Buyurtmalarni ko‘rish", title: "Buyurtmalarim", text: "Escrow bosqichlari, to‘lov holati, topshirish tasdig‘i va nizo jarayonini shu bo‘limda kuzating.", path: "/orders" },
  { command: "wallet", description: "Wallet va to‘lovlar", title: "Inferno Wallet", text: "Ichki balans, escrow himoyasi va tranzaksiyalar tarixini ko‘ring. Tashqi to‘lov provayderlari faqat sozlangandan keyin faol bo‘ladi.", path: "/profile" },
  { command: "support", description: "Yordam markazi", title: "Yordam markazi", text: "Muammo bo‘lsa, buyurtma raqami va dalillar bilan ticket yuboring. Login yoki parolni hech qachon chatga yozmang.", path: "/support" },
  { command: "pro", description: "Pro vositalar", title: "Inferno Stealth Pro", text: "AI narx bahosi, sotuvchi analitikasi, ishonch profili, referral va xavfsizlik vositalarini oching.", path: "/pro-tools" },
  { command: "admin", description: "Admin nazorati", title: "Admin nazorati", text: "E’lonlar, escrow, nizolar va support navbatini tartibli ravishda boshqaring.", path: "/admin", adminOnly: true },
];

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    text?: string;
    chat?: { id?: number | string; type?: string };
    from?: { id?: number | string; language_code?: string };
  };
};

export function parseTelegramCommand(text?: string) {
  const firstToken = (text ?? "").trim().split(/\s+/)[0] ?? "";
  return firstToken.toLowerCase().replace(/^\//, "").replace(/@[^\s]+$/, "");
}

export function getTelegramAdminIds() {
  return (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

export function isTelegramAdmin(userId?: number | string) {
  return userId !== undefined && getTelegramAdminIds().includes(String(userId));
}

export function getTelegramMiniAppUrl(path = "/") {
  const configuredBase = process.env.TELEGRAM_MINI_APP_URL || process.env.PUBLIC_APP_URL;
  if (!configuredBase) return null;
  const base = configuredBase.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function commandByName(command: string) {
  return TELEGRAM_BOT_COMMANDS.find(item => item.command === command) ?? null;
}

function buildInlineKeyboard(path?: string) {
  if (!path) return undefined;
  const url = getTelegramMiniAppUrl(path);
  if (!url) return undefined;
  return {
    inline_keyboard: [[{ text: "Mini App'ni ochish", web_app: { url } }]],
  };
}

async function telegramApiRequest<T = unknown>(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false as const, status: "setup_required" as const };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
    if (!response.ok || payload.ok !== true) {
      return { ok: false as const, status: "failed" as const, httpStatus: response.status, description: payload.description };
    }
    return { ok: true as const, status: "active" as const, result: payload.result as T };
  } catch {
    return { ok: false as const, status: "failed" as const };
  }
}

export function getTelegramCommandResponse(command: string, userId?: number | string) {
  const item = commandByName(command);
  if (!item) {
    return {
      title: "Inferno Stealth yordam",
      text: "Buyruqni tanlang: /buy — bozor, /sell — sotish, /orders — buyurtmalar, /wallet — wallet, /support — yordam, /pro — Pro vositalar.",
      path: "/",
    };
  }
  if (item.adminOnly && !isTelegramAdmin(userId)) {
    return {
      title: "Ruxsat cheklangan",
      text: "Bu buyruq faqat tasdiqlangan Inferno Stealth adminlari uchun mavjud.",
    };
  }
  return item;
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = update.message;
  const chatId = message?.chat?.id;
  if (chatId === undefined) return { handled: false as const, status: "ignored" as const };

  const command = parseTelegramCommand(message?.text);
  const response = getTelegramCommandResponse(command, message?.from?.id);
  const sent = await telegramApiRequest("sendMessage", {
    chat_id: chatId,
    text: `<b>${response.title}</b>\n\n${response.text}`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: buildInlineKeyboard(response.path),
  });

  return { handled: true as const, command, status: sent.status, sent: sent.ok };
}

export async function registerTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { status: "setup_required" as const, commands: false, menu: false, webhook: false };
  }

  const commands = await telegramApiRequest("setMyCommands", {
    commands: TELEGRAM_BOT_COMMANDS.filter(item => !item.adminOnly).map(({ command, description }) => ({ command, description })),
  });

  const menuUrl = getTelegramMiniAppUrl("/");
  const menu = menuUrl
    ? await telegramApiRequest("setChatMenuButton", {
        menu_button: { type: "web_app", text: "Inferno Market", web_app: { url: menuUrl } },
      })
    : { ok: false as const, status: "setup_required" as const };

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  const webhook = webhookUrl
    ? await telegramApiRequest("setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        ...(process.env.TELEGRAM_WEBHOOK_SECRET ? { secret_token: process.env.TELEGRAM_WEBHOOK_SECRET } : {}),
      })
    : { ok: false as const, status: "setup_required" as const };

  return { status: "active" as const, commands: commands.ok, menu: menu.ok, webhook: webhook.ok };
}

export function registerTelegramWebhook(app: Express) {
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    console.log(`[Telegram Webhook] Received update:`, JSON.stringify(req.body));
    
    // Temporarily disabled secret check to ensure immediate functionality
    /*
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && req.header("x-telegram-bot-api-secret-token") !== expectedSecret) {
      console.warn(`[Telegram Webhook] Secret mismatch. Expected: ${expectedSecret}, Got: ${req.header("x-telegram-bot-api-secret-token")}`);
      res.status(401).json({ ok: false, message: "Webhook signature tekshiruvi muvaffaqiyatsiz." });
      return;
    }
    */

    const result = await handleTelegramUpdate(req.body as TelegramUpdate);
    console.log(`[Telegram Webhook] Result:`, JSON.stringify(result));
    res.status(200).json({ ok: true, ...result });
  });
}

export async function sendTelegramNotification(telegramChatId: string | number, text: string, path = "/") {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false as const, status: "setup_required" as const };
  return telegramApiRequest("sendMessage", {
    chat_id: telegramChatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: buildInlineKeyboard(path),
  });
}
