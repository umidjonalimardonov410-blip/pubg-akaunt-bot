import type { Express, Request, Response } from "express";

import { getDb, getUserByOpenId, getInsertId } from './db';
import { depositReceipts, transactions, securityAudits } from '../drizzle/schema';
import { storagePut } from './storage';
import { eq } from 'drizzle-orm';

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
  { command: "buy", description: "Akkauntlarni ko‘rish", title: "Akkauntlar bozori", text: "Region, level, K/D, skinlar va narx bo‘yicha mos akkauntni tanlang. Foydalanuvchilar qo‘ygan e’lonlar ommaviy bozorda darhol ko‘rinadi.", path: "/accounts" },
  { command: "sell", description: "Akkaunt sotish", title: "Akkaunt sotish", text: "PUBG ID, statistika, inventar va media ma’lumotlarini to‘liq kiriting. E’lon yuborilgach ommaviy bozorga joylanadi; profil orqali tahrirlashingiz mumkin.", path: "/sell" },
  { command: "mylistings", description: "E’lonlarimni boshqarish", title: "Mening e’lonlarim", text: "Qo‘ygan akkauntlaringiz, narxlar, bozor holati va tahrirlash tugmalari Telegram Mini App profilida mavjud.", path: "/profile" },
  { command: "orders", description: "Buyurtmalarni ko‘rish", title: "Buyurtmalarim", text: "Escrow bosqichlari, to‘lov holati, topshirish tasdig‘i va nizo jarayonini shu bo‘limda kuzating.", path: "/orders" },
  { command: "wallet", description: "Wallet va to‘lovlar", title: "Inferno Wallet", text: "10 000 / 20 000 / 50 000 so‘mdan birini tanlang, kartaga o‘tkazing va chek rasmini yuboring. Admin tasdiqlagach balansingizga qo‘shiladi.", path: "/profile" },
  { command: "support", description: "Yordam markazi", title: "Yordam markazi", text: "Muammo bo‘lsa, buyurtma raqami va dalillar bilan ticket yuboring. Login yoki parolni hech qachon chatga yozmang.", path: "/support" },
  { command: "admin", description: "Admin nazorati", title: "Admin nazorati", text: "E’lonlar, escrow, nizolar va support navbatini tartibli ravishda boshqaring.", path: "/admin", adminOnly: true },
];

export type TelegramUpdate = {
  update_id?: number;
  callback_query?: {
    id: string;
    data?: string;
    from?: { id?: number | string };
    message?: { chat?: { id?: number | string } };
  };
  message?: {
    text?: string;
    chat?: { id?: number | string; type?: string };
    from?: { id?: number | string; language_code?: string };
    contact?: { phone_number?: string; user_id?: number | string; first_name?: string };
    photo?: Array<{ file_id: string; file_size?: number; width?: number; height?: number }>;
    caption?: string;
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

const MANUAL_TOPUP_AMOUNTS = [10000, 20000, 50000] as const;
const pendingWalletSelections = new Map<string, number>();

function formatUzAmount(amount: number) {
  return amount.toLocaleString('uz-UZ');
}

function walletMenuKeyboard() {
  return {
    inline_keyboard: [
      MANUAL_TOPUP_AMOUNTS.map(amount => ({ text: `💳 ${formatUzAmount(amount)} so‘m`, callback_data: `wallet_amount:${amount}` })),
      [{ text: '📱 Mini App profilini ochish', web_app: { url: getTelegramMiniAppUrl('/profile') || process.env.PUBLIC_APP_URL || '/' } }],
    ],
  };
}

function manualWalletText() {
  const cardNumber = process.env.ADMIN_PAYOUT_CARD_NUMBER || 'Admin kartasi sozlanmagan';
  const cardHolder = process.env.ADMIN_PAYOUT_CARD_HOLDER || 'Admin karta egasi sozlanmagan';
  return `<b>Inferno Wallet — manual to‘ldirish</b>\n\n1) Summani tanlang: 10 000 / 20 000 / 50 000 so‘m.\n2) Quyidagi karta ma’lumotiga o‘tkazing:\n💳 Karta: <code>${cardNumber}</code>\n👤 Karta egasi: <b>${cardHolder}</b>\n3) To‘lov chekini shu chatga rasm qilib yuboring.\n\nChek admin tekshiruviga tushadi; tasdiqlangach balans avtomatik qo‘shiladi.`;
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

function webAppButton(text: string, path: string) {
  const url = getTelegramMiniAppUrl(path);
  return url ? { text, web_app: { url } } : { text };
}

function buildMainKeyboard() {
  return {
    keyboard: [
      [webAppButton("🛒 Akkaunt olish", "/accounts"), webAppButton("➕ Akkaunt sotish", "/sell")],
      [webAppButton("📦 Buyurtmalarim", "/orders"), webAppButton("👤 Profilim", "/profile")],
      [webAppButton("🧾 E’lonlarim", "/profile"), { text: "💳 Balans to‘ldirish" }],
      [webAppButton("🆘 Yordam", "/support")],
      [{ text: "📱 Telefon raqam orqali kirish", request_contact: true }],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: "Kerakli bo‘limni tanlang",
  };
}

function buildInlineKeyboard(path?: string) {
  if (!path) return undefined;
  const url = getTelegramMiniAppUrl(path);
  if (!url) return undefined;
  return {
    inline_keyboard: [[{ text: "Mini App'ni ochish", web_app: { url } }]],
  };
}

function marketplaceFilterKeyboard() {
  const marketUrl = getTelegramMiniAppUrl('/accounts') || process.env.PUBLIC_APP_URL || '/accounts';
  return {
    inline_keyboard: [
      [
        { text: '💰 0–500 ming', callback_data: 'market_filter:price:0:500000' },
        { text: '💰 500 ming–2 mln', callback_data: 'market_filter:price:500000:2000000' },
      ],
      [
        { text: '💰 2 mln+', callback_data: 'market_filter:price:2000000:' },
        { text: '🏆 Pro / X-Suit', callback_data: 'market_filter:category:pro' },
      ],
      [
        { text: '👑 Conqueror', callback_data: 'market_filter:category:conqueror' },
        { text: '🎮 Classic', callback_data: 'market_filter:category:classic' },
      ],
      [
        { text: '🔄 Filtrlarni tozalash', callback_data: 'market_filter:reset' },
        { text: '📱 To‘liq bozor', web_app: { url: marketUrl } },
      ],
    ],
  };
}

function marketplaceFilterPath(data: string) {
  const match = /^market_filter:price:(\d*):(\d*)$/.exec(data);
  if (match) {
    const params = new URLSearchParams();
    if (match[1] && Number(match[1]) > 0) params.set('minPrice', match[1]);
    if (match[2]) params.set('maxPrice', match[2]);
    const query = params.toString();
    return `/accounts${query ? `?${query}` : ''}`;
  }
  const category = /^market_filter:category:(pro|conqueror|classic)$/.exec(data)?.[1];
  if (category) return `/accounts?category=${category}`;
  if (data === 'market_filter:reset') return '/accounts';
  return null;
}

async function sendMarketplaceMenu(chatId: number | string, selectedPath = '/accounts') {
  const selectedUrl = getTelegramMiniAppUrl(selectedPath) || process.env.PUBLIC_APP_URL || '/accounts';
  return await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: '<b>🛒 Inferno Market — tezkor qidiruv</b>\n\nNarx yoki toifani tanlang. Tugma sizni shu filtr qo‘llangan Mini App bozoriga olib kiradi. Barcha foydalanuvchi e’lonlari shu yerda ko‘rinadi.',
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      ...marketplaceFilterKeyboard(),
      inline_keyboard: [
        ...marketplaceFilterKeyboard().inline_keyboard.slice(0, 3),
        [
          { text: '🔄 Filtrlarni tozalash', callback_data: 'market_filter:reset' },
          { text: '📱 Tanlangan bozorni ochish', web_app: { url: selectedUrl } },
        ],
      ],
    },
  });
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
      text: "Buyruqni tanlang: /buy — ommaviy bozor, /sell — sotish, /mylistings — e’lonlarim, /orders — buyurtmalar, /wallet — wallet yoki /support — yordam.",
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

async function answerTelegramCallback(callbackQueryId: string, text: string) {
  return await telegramApiRequest('answerCallbackQuery', { callback_query_id: callbackQueryId, text, show_alert: false });
}

async function sendWalletMenu(chatId: number | string) {
  return await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: manualWalletText(),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: walletMenuKeyboard(),
  });
}

async function handleTelegramReceiptPhoto(message: NonNullable<TelegramUpdate['message']>) {
  const chatId = message.chat?.id;
  const telegramUserId = message.from?.id;
  const photo = message.photo?.[message.photo.length - 1];
  if (chatId === undefined || telegramUserId === undefined || !photo) return { handled: false as const, status: 'ignored' as const };

  const selectedFromCaption = Number((message.caption || '').replace(/[^0-9]/g, ''));
  const amount = pendingWalletSelections.get(String(chatId)) ?? (MANUAL_TOPUP_AMOUNTS.includes(selectedFromCaption as typeof MANUAL_TOPUP_AMOUNTS[number]) ? selectedFromCaption : undefined);
  if (!amount) {
    await sendWalletMenu(chatId);
    return { handled: true as const, command: 'wallet_receipt_missing_amount', status: 'active' as const, sent: true };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const user = await getUserByOpenId(`telegram:${telegramUserId}`);
  if (!token || !user) {
    return { handled: true as const, command: 'wallet_receipt', status: 'setup_required' as const, sent: false };
  }
  if (photo.file_size && photo.file_size > 8 * 1024 * 1024) {
    const sent = await telegramApiRequest('sendMessage', { chat_id: chatId, text: '❌ Chek hajmi 8 MB dan oshmasin. Kichikroq rasm yuboring.' });
    return { handled: true as const, command: 'wallet_receipt', status: sent.status, sent: sent.ok };
  }

  const fileResult = await telegramApiRequest<{ file_path?: string }>('getFile', { file_id: photo.file_id });
  const filePath = fileResult.ok ? fileResult.result?.file_path : undefined;
  if (!filePath) {
    const sent = await telegramApiRequest('sendMessage', { chat_id: chatId, text: '❌ Chekni yuklab bo‘lmadi. Iltimos, qayta urinib ko‘ring.' });
    return { handled: true as const, command: 'wallet_receipt', status: sent.status, sent: sent.ok };
  }

  try {
    const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!fileResponse.ok) throw new Error(`Telegram file download failed: ${fileResponse.status}`);
    const bytes = Buffer.from(await fileResponse.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw new Error('receipt_too_large');
    const uploaded = await storagePut(`users/${user.id}/receipts/telegram-${Date.now()}.jpg`, bytes, 'image/jpeg');
    const db = await getDb();
    if (!db) throw new Error('database_unavailable');

    const result = await db.transaction(async (tx: any) => {
      const transactionResult = await tx.insert(transactions).values({
        userId: user.id,
        type: 'topup',
        amount: amount.toString(),
        description: 'Telegram orqali manual chek tekshiruvi kutilmoqda',
        status: 'pending',
      });
      const transactionId = getInsertId(transactionResult);
      const receiptResult = await tx.insert(depositReceipts).values({
        userId: user.id,
        amount: amount.toString(),
        receiptKey: uploaded.key,
        receiptUrl: uploaded.url,
        status: 'pending',
        transactionId,
      });
      const receiptId = getInsertId(receiptResult);
      await tx.insert(securityAudits).values({
        userId: user.id,
        eventType: 'deposit_receipt_submitted_telegram',
        riskScore: 0,
        details: JSON.stringify({ receiptId, amount, chatId }),
      });
      return { receiptId };
    });

    pendingWalletSelections.delete(String(chatId));
    await Promise.all(getTelegramAdminIds().map(adminId => telegramApiRequest('sendMessage', {
      chat_id: adminId,
      text: `📥 <b>Yangi balans cheki</b>\n\nFoydalanuvchi: #${user.id}\nSumma: <b>${formatUzAmount(amount)} so‘m</b>\nChek: ${uploaded.url}`,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      reply_markup: buildInlineKeyboard('/admin'),
    })));
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: `✅ <b>Chek qabul qilindi</b>\n\n${formatUzAmount(amount)} so‘m uchun so‘rovingiz #${result.receiptId} admin tekshiruviga yuborildi. Tasdiqlangach balansingizga qo‘shiladi.`,
      parse_mode: 'HTML',
      reply_markup: buildInlineKeyboard('/profile'),
    });
    return { handled: true as const, command: 'wallet_receipt', status: sent.status, sent: sent.ok, receiptId: result.receiptId };
  } catch (error) {
    const sent = await telegramApiRequest('sendMessage', { chat_id: chatId, text: error instanceof Error && error.message === 'receipt_too_large' ? '❌ Chek hajmi 8 MB dan oshmasin.' : '❌ Chekni qabul qilishda xatolik yuz berdi. Qayta urinib ko‘ring.' });
    return { handled: true as const, command: 'wallet_receipt', status: sent.status, sent: sent.ok };
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const callback = update.callback_query;
  if (callback) {
    const callbackChatId = callback.message?.chat?.id;
    if (callbackChatId === undefined) return { handled: false as const, status: 'ignored' as const };
    const data = callback.data || '';
    if (data === 'wallet_menu') {
      await answerTelegramCallback(callback.id, 'Wallet menyusi ochildi');
      const sent = await sendWalletMenu(callbackChatId);
      return { handled: true as const, command: 'wallet_menu', status: sent.status, sent: sent.ok };
    }
    const marketPath = marketplaceFilterPath(data);
    if (marketPath) {
      await answerTelegramCallback(callback.id, 'Bozor filtri tayyorlandi');
      const sent = await sendMarketplaceMenu(callbackChatId, marketPath);
      return { handled: true as const, command: 'market_filter', status: sent.status, sent: sent.ok, path: marketPath };
    }
    const amountMatch = /^wallet_amount:(10000|20000|50000)$/.exec(data);
    if (amountMatch) {
      const amount = Number(amountMatch[1]);
      pendingWalletSelections.set(String(callbackChatId), amount);
      await answerTelegramCallback(callback.id, `${formatUzAmount(amount)} so‘m tanlandi`);
      const sent = await telegramApiRequest('sendMessage', {
        chat_id: callbackChatId,
        text: `✅ <b>${formatUzAmount(amount)} so‘m tanlandi</b>\n\nKartaga o‘tkazmani amalga oshiring, so‘ng to‘lov chekini shu chatga rasm qilib yuboring. Rasm ostiga summa yozsangiz ham bo‘ladi.`,
        parse_mode: 'HTML',
      });
      return { handled: true as const, command: 'wallet_amount', status: sent.status, sent: sent.ok, amount };
    }
    await answerTelegramCallback(callback.id, 'Bu tugma eskirgan. Wallet menyusini qayta oching.');
    return { handled: true as const, command: 'callback', status: 'active' as const, sent: true };
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  if (!message || chatId === undefined) return { handled: false as const, status: 'ignored' as const };

  await telegramApiRequest('sendChatAction', { chat_id: chatId, action: 'typing' });

  if (message.photo?.length) {
    return await handleTelegramReceiptPhoto(message);
  }

  const contact = message.contact;
  if (contact) {
    const ownsContact = contact.user_id !== undefined && String(contact.user_id) === String(message.from?.id);
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: ownsContact
        ? '<b>Telefon raqamingiz tasdiqlandi</b>\n\nQuyidagi menyudan kerakli bo‘limni bosing. Mini App sizni Telegram profilingiz orqali xavfsiz kiritadi.'
        : '<b>Bu boshqa foydalanuvchining raqami</b>\n\nKirish uchun pastdagi tugma orqali o‘zingizning telefon raqamingizni yuboring.',
      parse_mode: 'HTML',
      reply_markup: buildMainKeyboard(),
    });
    return { handled: true as const, command: 'contact', status: sent.status, sent: sent.ok };
  }

  const command = parseTelegramCommand(message.text);
  if (command === 'buy' || message.text?.trim() === '🛒 Akkaunt olish') {
    const sent = await sendMarketplaceMenu(chatId);
    return { handled: true as const, command: 'buy', status: sent.status, sent: sent.ok };
  }
  if (command === 'wallet' || message.text?.trim() === '💳 Balans to‘ldirish') {
    const sent = await sendWalletMenu(chatId);
    return { handled: true as const, command: 'wallet', status: sent.status, sent: sent.ok };
  }
  if (command === 'mylistings' || message.text?.trim() === '🧾 E’lonlarim') {
    const sent = await telegramApiRequest('sendMessage', { chat_id: chatId, text: '<b>Mening e’lonlarim</b>\n\nOmmaviy bozorga qo‘ygan akkauntlaringizni ko‘rish va tahrirlash uchun quyidagi tugmani bosing.', parse_mode: 'HTML', reply_markup: buildInlineKeyboard('/profile') });
    return { handled: true as const, command: 'mylistings', status: sent.status, sent: sent.ok };
  }

  const response = getTelegramCommandResponse(command, message.from?.id);
  const sent = await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: `<b>${response.title}</b>\n\n${response.text}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: command === 'start' || !command ? buildMainKeyboard() : buildInlineKeyboard(response.path),
  });

  return { handled: true as const, command, status: sent.status, sent: sent.ok };
}

export async function registerTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { status: "setup_required" as const, commands: false, menu: false, webhook: false };
  }

  const commands = await telegramApiRequest("setMyCommands", {
    commands: TELEGRAM_BOT_COMMANDS.filter(item => item.command === "start").map(({ command, description }) => ({ command, description })),
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
    
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && req.header("x-telegram-bot-api-secret-token") !== expectedSecret) {
      console.warn("[Telegram Webhook] Secret mismatch");
      res.status(401).json({ ok: false, message: "Webhook signature tekshiruvi muvaffaqiyatsiz." });
      return;
    }

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
