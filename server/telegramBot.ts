import type { Express, Request, Response } from "express";
import { createHash } from "node:crypto";

import { getDb, getUserByOpenId, getInsertId, searchPubgAccounts, upsertUser } from './db';
import { createTelegramLoginToken } from './telegramLoginTokens';
import { listFaq } from './faqData';
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
import { botText, matchMenuKey, normalizeBotLang, type BotLang } from './botTexts';
import { depositReceipts, transactions, securityAudits, users, notifications, pubgAccounts } from '../drizzle/schema';
import { storagePut } from './storage';
import { and, eq, sql } from 'drizzle-orm';
import { ADMIN_TELEGRAM_LABEL, ADMIN_TELEGRAM_URL, ADMIN_PANEL_TELEGRAM_ID, ADMIN_PANEL_TELEGRAM_LABEL, ADMIN_PANEL_TELEGRAM_URL } from '../shared/adminContact';
import { channelTexts, isChannelMember, isForcedSubscriptionEnabled, sendSubscriptionGate, deleteChannelGateMessage, postNewListingToChannel, shouldPostNewListing } from './telegramChannel';


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
  { command: "buy", description: "Akkauntlarni ko‘rish", title: "Akkauntlar bozori", text: "Narx, level va K/D bo‘yicha filtrlab akkaunt tanlang.\nBarcha savdo escrow orqali himoyalangan.", path: "/accounts" },
  { command: "sell", description: "Akkaunt sotish", title: "Akkaunt sotish", text: "Mini App’da rasm/video qo‘shing va narx belgilang.\nTasdiqdan so‘ng e’lon bozorda ko‘rinadi.", path: "/sell" },
  { command: "mylistings", description: "E’lonlarimni boshqarish", title: "Mening e’lonlarim", text: "Qo‘ygan akkauntlaringiz, narxlar, bozor holati va tahrirlash tugmalari Telegram Mini App profilida mavjud.", path: "/profile" },
  { command: "orders", description: "Buyurtmalarni ko‘rish", title: "Buyurtmalarim", text: "Escrow bosqichlari, to‘lov holati, topshirish tasdig‘i va nizo jarayonini shu bo‘limda kuzating.", path: "/orders" },
  { command: "wallet", description: "Wallet va to‘lovlar", title: "Inferno Wallet", text: "Summani tanlang, UZCARD yoki VISA’ga o‘tkazing.\nChek rasmini yuboring — admin tasdiqlagach balans qo‘shiladi.", path: "/profile" },
  { command: "support", description: "Yordam markazi", title: "Yordam markazi", text: "Muammo bo‘lsa, buyurtma raqami va dalillar bilan ticket yuboring. Login yoki parolni hech qachon chatga yozmang.", path: "/support" },
  { command: "contactadmin", description: "Admin bilan bog‘lanish", title: "Admin bilan aloqa", text: "Savdo, to‘lov yoki nizo bo‘yicha to‘g‘ridan-to‘g‘ri admin bilan bog‘laning.", path: "/support" },
  { command: "listings", description: "Tasdiqlash kutayotgan e’lonlar", title: "E’lon moderatsiyasi", text: "Yangi qo‘yilgan akkauntlarni shu yerda tasdiqlang, rad eting yoki o‘chiring.", path: "/admin", adminOnly: true },
  { command: "admin", description: "Admin nazorati", title: "Admin nazorati", text: "E’lonlar, escrow, nizolar va support navbatini tartibli ravishda boshqaring.", path: "/admin", adminOnly: true },
];

export type TelegramUpdate = {
  update_id?: number;
  inline_query?: {
    id: string;
    query?: string;
    from?: { id?: number | string; language_code?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id?: number | string };
    message?: { message_id?: number; chat?: { id?: number | string } };
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

/** Doimiy egasi/admin Telegram ID — env bo'lmasa ham admin ishlashi uchun. */
export const DEFAULT_ADMIN_TELEGRAM_IDS = [ADMIN_PANEL_TELEGRAM_ID] as const;

export function getTelegramAdminIds() {
  const fromEnv = (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMIN_TELEGRAM_IDS, ...fromEnv]));
}

/** Adminlarga Telegram orqali xabar yuboradi (e'lon, support, buyurtma va h.k.). */
export async function notifyTelegramAdmins(text: string, extra: Record<string, unknown> = {}) {
  const ids = getTelegramAdminIds();
  if (!ids.length) return { sent: 0 };
  const results = await Promise.allSettled(ids.map(chatId => telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  })));
  return { sent: results.filter(r => r.status === 'fulfilled').length };
}


/** ===== Spam himoyasi: chat bo'yicha oddiy rate limit ===== */

export const BOT_RATE_LIMIT_WINDOW_MS = 10_000;
export const BOT_RATE_LIMIT_MAX = 12;

const rateBuckets = new Map<string, { count: number; startedAt: number; warned: boolean }>();

/**
 * Bitta chatdan 10 soniyada 12 tadan ko'p so'rov kelsa bloklaymiz.
 * Birinchi bloklashda foydalanuvchi ogohlantiriladi, keyingilari jim tashlanadi.
 */
export function checkBotRateLimit(chatId: number | string, now = Date.now()) {
  const key = String(chatId);
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt > BOT_RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, startedAt: now, warned: false });
    return { allowed: true as const, warn: false as const };
  }
  bucket.count += 1;
  if (bucket.count <= BOT_RATE_LIMIT_MAX) return { allowed: true as const, warn: false as const };
  const warn = !bucket.warned;
  bucket.warned = true;
  return { allowed: false as const, warn };
}

export function resetBotRateLimit() {
  rateBuckets.clear();
}

const MANUAL_TOPUP_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000] as const;
const pendingWalletSelections = new Map<string, number>();

type PaymentMethodId = 'uzcard' | 'visa';

const PAYMENT_CARDS: Record<PaymentMethodId, { label: string; number: string; holder: string; asset: string; logoEnv?: string }> = {
  uzcard: {
    label: 'UZCARD',
    number: process.env.ADMIN_UZCARD_NUMBER || '5614 6805 7716 7758',
    holder: process.env.ADMIN_CARD_HOLDER || 'ALIMARDONOV UMIDJON',
    asset: '/assets/pay-uzcard.jpg',
    logoEnv: process.env.UZCARD_LOGO_URL,
  },
  visa: {
    label: 'VISA',
    number: process.env.ADMIN_VISA_NUMBER || '4067 0700 0330 3687',
    holder: process.env.ADMIN_CARD_HOLDER || 'ALIMARDONOV UMIDJON',
    asset: '/assets/pay-visa.jpg',
    logoEnv: process.env.VISA_LOGO_URL,
  },
};

/** Karta/usul rasmi: avval ENV, keyin sayt ichidagi statik rasm. */
function paymentImageUrl(assetPath: string, override?: string) {
  if (override) return override;
  const base = getPublicBaseUrl();
  return base ? `${base}${assetPath}` : null;
}

function formatUzAmount(amount: number) {
  return amount.toLocaleString('uz-UZ');
}

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

function walletMenuKeyboard(lang: BotLang = 'uz') {
  const texts = botText(lang);
  const appUrl = getTelegramMiniAppUrl('/profile');
  return {
    inline_keyboard: [
      ...chunk(
        MANUAL_TOPUP_AMOUNTS.map(amount => ({ text: `\u{1F4B0} ${formatUzAmount(amount)}`, callback_data: `wallet_amount:${amount}` })),
        3,
      ),
      [
        { text: texts.walletMethodTon, callback_data: 'wallet_soon:ton' },
        { text: texts.walletMethodStars, callback_data: 'wallet_soon:stars' },
      ],
      ...(appUrl ? [[{ text: texts.openApp, web_app: { url: appUrl } }]] : []),
    ],
  };
}

function walletMethodKeyboard(amount: number, lang: BotLang = 'uz') {
  const texts = botText(lang);
  return {
    inline_keyboard: [
      [
        { text: texts.walletMethodUzcard, callback_data: `wallet_method:uzcard:${amount}` },
        { text: texts.walletMethodVisa, callback_data: `wallet_method:visa:${amount}` },
      ],
      [
        { text: texts.walletMethodTon, callback_data: 'wallet_soon:ton' },
        { text: texts.walletMethodStars, callback_data: 'wallet_soon:stars' },
      ],
      [{ text: texts.walletBack, callback_data: 'wallet_menu' }],
    ],
  };
}

function manualWalletText(lang: BotLang = 'uz') {
  const texts = botText(lang);
  return `<b>${texts.walletTitle}</b>\n\n${texts.walletIntro}\n\n${texts.walletChooseAmount}`;
}

export function isTelegramAdmin(userId?: number | string) {
  return userId !== undefined && getTelegramAdminIds().includes(String(userId));
}

export function getPublicBaseUrl() {
  const configured =
    process.env.TELEGRAM_MINI_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "") ||
    (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL.replace(/^https?:\/\//, "")}` : "");
  if (!configured) return null;
  return configured.replace(/\/$/, "");
}

function deriveTelegramWebhookSecret() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  // Stable, derivable secret so setWebhook and the handler always agree.
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

export function getTelegramWebhookSecret() {
  const configured = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (configured) return configured;
  return deriveTelegramWebhookSecret();
}

/**
 * Telegram keeps the secret_token that was registered with setWebhook. If the
 * environment changes (TELEGRAM_WEBHOOK_SECRET added/removed) the previously
 * registered secret stays in place and every update fails with 401 until the
 * webhook is registered again. Accept both the configured and the derived
 * secret so a redeploy never locks the bot out.
 */
export function getAcceptedTelegramWebhookSecrets() {
  const secrets = new Set<string>();
  const configured = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (configured) secrets.add(configured);
  const derived = deriveTelegramWebhookSecret();
  if (derived) secrets.add(derived);
  return Array.from(secrets);
}

export function getTelegramWebhookUrl() {
  const configured = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  if (configured) return configured;
  const base = getPublicBaseUrl();
  return base ? `${base}/api/telegram/webhook` : null;
}

export function getTelegramMiniAppUrl(path = "/") {
  const configuredBase = getPublicBaseUrl();
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

function adminContactButton(lang: BotLang = 'uz') {
  return { text: botText(lang).menuAdmin, url: ADMIN_TELEGRAM_URL };
}

function adminPanelKeyboard(lang: BotLang = 'uz') {
  const texts = botText(lang);
  const rows: Array<Array<Record<string, unknown>>> = [];
  const control = getTelegramMiniAppUrl('/admin');
  const listings = getTelegramMiniAppUrl('/admin?tab=listings');
  const receipts = getTelegramMiniAppUrl('/admin?tab=receipts');
  if (control) rows.push([{ text: texts.panelBotControl, web_app: { url: control } }]);
  if (listings && receipts) {
    rows.push([
      { text: texts.panelListings, web_app: { url: listings } },
      { text: texts.panelReceipts, web_app: { url: receipts } },
    ]);
  }
  rows.push([{ text: texts.panelAdminChat, url: ADMIN_PANEL_TELEGRAM_URL }]);
  return { inline_keyboard: rows };
}

async function sendAdminPanel(chatId: number | string, lang: BotLang = 'uz') {
  const texts = botText(lang);
  return await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: `<b>${texts.panelTitle}</b>\n\n${texts.panelBody.replace('{panelAdmin}', ADMIN_PANEL_TELEGRAM_LABEL)}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: adminPanelKeyboard(lang),
  });
}

const chatLanguages = new Map<string, BotLang>();

export function getChatLanguage(chatId: number | string, fallback?: string) {
  return chatLanguages.get(String(chatId)) ?? normalizeBotLang(fallback);
}

export function setChatLanguage(chatId: number | string, lang: BotLang) {
  chatLanguages.set(String(chatId), lang);
}

/**
 * Tilni aniqlaydi: 1) shu sessiyada tanlangan til, 2) bazadagi saqlangan til,
 * 3) Telegram profil tili. Server qayta ishga tushsa ham tanlov yo'qolmaydi.
 */
export async function resolveChatLanguage(
  chatId: number | string,
  telegramUserId?: number | string,
  fallback?: string,
): Promise<BotLang> {
  const cached = chatLanguages.get(String(chatId));
  if (cached) return cached;
  if (telegramUserId !== undefined) {
    try {
      const user = await getUserByOpenId(`telegram:${telegramUserId}`);
      const stored = (user as { languageCode?: string | null } | null)?.languageCode;
      if (stored) {
        const lang = normalizeBotLang(stored);
        chatLanguages.set(String(chatId), lang);
        return lang;
      }
    } catch (error) {
      console.warn('[Telegram Bot] language lookup failed', error);
    }
  }
  return normalizeBotLang(fallback);
}

/** Aim Trainer mini-o'yin tugmasi matni (bir martalik chegirma). */
function aimButtonText(lang: BotLang) {
  if (lang === 'ru') return '🎯 Aim Trainer — скидка до 5%';
  if (lang === 'en') return '🎯 Aim Trainer — up to 5% off';
  return '🎯 Aim Trainer — 5% gacha chegirma';
}

function buildMainKeyboard(lang: BotLang = 'uz', isAdmin = false) {
  const texts = botText(lang);
  const appButton = webAppButton(texts.openApp, '/');
  // Pastdagi doimiy menyu: barcha bo‘limlar ixcham 2 ustunli tugmalarda.
  return {
    keyboard: [
      [appButton],
      [webAppButton(aimButtonText(lang), '/')],
      [{ text: texts.menuMarket }, { text: texts.menuSell }],
      [{ text: texts.menuWallet }, { text: texts.menuListings }],
      [{ text: texts.menuRules }, { text: texts.menuReferral }],
      [{ text: texts.menuSupport }, { text: texts.menuLanguage }],
      [{ text: texts.menuAdmin }],
      ...(isAdmin ? [[{ text: texts.menuPanel }]] : []),
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: texts.placeholder,
  };
}

function languageKeyboard() {
  return {
    inline_keyboard: [[
      { text: '🇺🇿 O‘zbekcha', callback_data: 'set_lang:uz' },
      { text: '🇷🇺 Русский', callback_data: 'set_lang:ru' },
      { text: '🇬🇧 English', callback_data: 'set_lang:en' },
    ]],
  };
}

async function sendWelcome(chatId: number | string, lang: BotLang, name: string) {
  const texts = botText(lang);
  const appUrl = getTelegramMiniAppUrl('/');
  const rowsExtra = appUrl ? [[{ text: texts.openApp, web_app: { url: appUrl } }]] : [];
  return await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: `<b>${texts.welcomeTitle}</b>\n\n${texts.welcomeBody.replace('{name}', escapeTelegramHtml(name))}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        ...rowsExtra,
        [
          { text: texts.menuWallet, callback_data: 'wallet_menu' },
          { text: texts.menuLanguage, callback_data: 'show_language' },
        ],
      ],
    },
  });
}

async function sendRules(chatId: number | string, lang: BotLang) {
  const texts = botText(lang);
  return await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: `<b>${texts.rulesTitle}</b>\n\n${texts.rulesBody}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        ...(getTelegramMiniAppUrl('/rules') ? [[{ text: texts.openApp, web_app: { url: getTelegramMiniAppUrl('/rules') as string } }]] : []),
        [adminContactButton(lang)],
      ],
    },
  });
}

let cachedBotUsername: string | null = null;
/** Bot username: avval ENV, bo'lmasa Telegram getMe (natija keshlanadi). */
async function resolveBotUsername(): Promise<string | null> {
  const fromEnv = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '');
  if (fromEnv) return fromEnv;
  if (cachedBotUsername) return cachedBotUsername;
  try {
    const response = await telegramApiRequest('getMe', {});
    const username = (response as any)?.result?.username ?? (response as any)?.data?.result?.username;
    if (typeof username === 'string' && username) {
      cachedBotUsername = username;
      return username;
    }
  } catch {}
  return null;
}

async function sendReferral(chatId: number | string, lang: BotLang, telegramUserId?: number | string) {
  const texts = botText(lang);
  const botUsername = await resolveBotUsername();
  const code = telegramUserId ? `IS${telegramUserId}` : 'IS';
  // Referral havolasi doim bot orqali ochilsin; Railway domeni faqat oxirgi zaxira.
  const link = botUsername ? `https://t.me/${botUsername}?start=ref_${code}` : `${getPublicBaseUrl() ?? ''}/referral?ref=${code}`;
  return await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: `<b>${texts.referralTitle}</b>\n\n${texts.referralBody.replace('{link}', `<code>${escapeTelegramHtml(link)}</code>`)}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: getTelegramMiniAppUrl('/referral')
      ? { inline_keyboard: [[{ text: texts.openApp, web_app: { url: getTelegramMiniAppUrl('/referral') as string } }]] }
      : undefined,
  });
}

async function sendSupport(chatId: number | string, lang: BotLang) {
  const texts = botText(lang);
  return await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: `<b>${texts.supportTitle}</b>\n\n${texts.supportBody}\n\n👨‍💼 Admin: ${ADMIN_TELEGRAM_LABEL}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        ...(buildInlineKeyboard('/support')?.inline_keyboard ?? []),
        [adminContactButton(lang)],
      ],
    },
  });
}

function buildInlineKeyboard(path?: string) {
  if (!path) return undefined;
  const url = getTelegramMiniAppUrl(path);
  if (!url) return undefined;
  return {
    inline_keyboard: [[{ text: "Mini App'ni ochish", web_app: { url } }]],
  };
}

function marketplaceFilterKeyboard(lang: BotLang = 'uz') {
  const marketUrl = getTelegramMiniAppUrl('/accounts') || process.env.PUBLIC_APP_URL || '/accounts';
  const t = botText(lang);
  return {
    inline_keyboard: [
      [
        { text: t.marketPriceLow, callback_data: 'market_filter:price:0:500000' },
        { text: t.marketPriceMid, callback_data: 'market_filter:price:500000:2000000' },
      ],
      [
        { text: t.marketPriceHigh, callback_data: 'market_filter:price:2000000:' },
        { text: t.marketPro, callback_data: 'market_filter:category:pro' },
      ],
      [
        { text: t.marketConqueror, callback_data: 'market_filter:category:conqueror' },
        { text: t.marketClassic, callback_data: 'market_filter:category:classic' },
      ],
      [
        { text: t.marketReset, callback_data: 'market_filter:reset' },
        { text: t.marketOpenFull, web_app: { url: marketUrl } },
      ],
    ],
  };
}

const TELEGRAM_MARKET_PAGE_SIZE = 5;

function escapeTelegramHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

export function parseMarketplacePageData(data: string) {
  const match = /^market_page:(\d+):(.+)$/.exec(data);
  if (!match) return null;
  let path = '/accounts';
  try {
    path = decodeURIComponent(match[2] || '/accounts');
  } catch {
    return null;
  }
  if (!path.startsWith('/accounts')) return null;
  return { page: Number(match[1]), path };
}

export function getMarketplaceSearchFilters(path: string) {
  const query = path.includes('?') ? path.slice(path.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  const minPrice = params.get('minPrice');
  const maxPrice = params.get('maxPrice');
  const category = params.get('category');
  return {
    ...(minPrice && Number.isFinite(Number(minPrice)) ? { minPrice: Number(minPrice) } : {}),
    ...(maxPrice && Number.isFinite(Number(maxPrice)) ? { maxPrice: Number(maxPrice) } : {}),
    ...(category === 'pro' || category === 'conqueror' || category === 'classic' ? { category } : {}),
  } as { minPrice?: number; maxPrice?: number; category?: 'pro' | 'conqueror' | 'classic' };
}

function marketplacePageCallback(page: number, path: string) {
  return `market_page:${Math.max(0, page)}:${encodeURIComponent(path)}`;
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

async function sendMarketplaceMenu(chatId: number | string, selectedPath = '/accounts', lang: BotLang = getChatLanguage(chatId)) {
  const selectedUrl = getTelegramMiniAppUrl(selectedPath) || process.env.PUBLIC_APP_URL || '/accounts';
  const t = botText(lang);
  return await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: `${t.marketTitle}\n\n${t.marketBody}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        ...marketplaceFilterKeyboard(lang).inline_keyboard.slice(0, 3),
        [
          { text: t.marketReset, callback_data: 'market_filter:reset' },
          { text: t.marketOpenSelected, web_app: { url: selectedUrl } },
        ],
        [{ text: t.marketShowResults, callback_data: marketplacePageCallback(0, selectedPath) }],
      ],
    },
  });
}

function marketplaceResultKeyboard(page: number, hasNext: boolean, selectedPath: string, lang: BotLang = 'uz') {
  const t = botText(lang);
  const navigation = [] as Array<{ text: string; callback_data: string }>;
  if (page > 0) navigation.push({ text: t.marketPrev, callback_data: marketplacePageCallback(page - 1, selectedPath) });
  if (hasNext) navigation.push({ text: t.marketNext, callback_data: marketplacePageCallback(page + 1, selectedPath) });
  const marketUrl = getTelegramMiniAppUrl(selectedPath) || process.env.PUBLIC_APP_URL || '/accounts';
  return {
    inline_keyboard: [
      ...(navigation.length ? [navigation] : []),
      [{ text: t.marketChangeFilters, callback_data: `market_filter_menu:${encodeURIComponent(selectedPath)}` }],
      [{ text: t.marketOpenFull, web_app: { url: marketUrl } }],
    ],
  };
}

async function sendMarketplaceResults(chatId: number | string, page: number, selectedPath: string, lang: BotLang = getChatLanguage(chatId)) {
  const t = botText(lang);
  const safePage = Math.max(0, Math.floor(page));
  const rows = await searchPubgAccounts({ ...getMarketplaceSearchFilters(selectedPath), limit: TELEGRAM_MARKET_PAGE_SIZE + 1, offset: safePage * TELEGRAM_MARKET_PAGE_SIZE });
  const hasNext = rows.length > TELEGRAM_MARKET_PAGE_SIZE;
  const visibleRows = rows.slice(0, TELEGRAM_MARKET_PAGE_SIZE);
  const resultText = visibleRows.length === 0
    ? t.marketEmpty
    : visibleRows.map((account, index) => `${safePage * TELEGRAM_MARKET_PAGE_SIZE + index + 1}. <b>${escapeTelegramHtml(account.playerName)}</b>\n   🎮 LVL ${account.level} · K/D ${escapeTelegramHtml(account.kdRatio)} · ${escapeTelegramHtml(formatUzAmount(Number(account.price)))} ${t.marketCurrency}\n   🏆 ${account.hasXSuit ? 'Pro / X-Suit' : account.hasConquerorHistory ? 'Conqueror' : 'Classic'} · #${account.id}`).join('\n\n');
  const sent = await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: `<b>${t.marketResultsTitle}</b>\n\n${resultText}\n\n${t.marketPage}: <b>${safePage + 1}</b>`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: marketplaceResultKeyboard(safePage, hasNext, selectedPath, lang),
  });
  return { sent, count: visibleRows.length, hasNext, page: safePage };
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

async function answerTelegramCallback(callbackQueryId: string, text: string, showAlert = false) {
  return await telegramApiRequest('answerCallbackQuery', { callback_query_id: callbackQueryId, text, show_alert: showAlert });
}

async function sendWalletMenu(chatId: number | string, lang: BotLang = getChatLanguage(chatId)) {
  return await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: manualWalletText(lang),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: walletMenuKeyboard(lang),
  });
}

async function sendPaymentCard(chatId: number | string, method: PaymentMethodId, amount: number, lang: BotLang) {
  const texts = botText(lang);
  const card = PAYMENT_CARDS[method];
  const caption = texts.walletCardMessage
    .replace('{method}', card.label)
    .replace('{card}', card.number)
    .replace('{holder}', card.holder)
    .replace('{amount}', formatUzAmount(amount));
  const image = paymentImageUrl(card.asset, card.logoEnv);
  const photo = image
    ? await telegramApiRequest('sendPhoto', { chat_id: chatId, photo: image, caption, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: texts.walletBack, callback_data: 'wallet_menu' }]] } })
    : { ok: false as const, status: 'setup_required' as const };
  if (photo.ok) return photo;
  // Logotip yuklanmasa ham to‘lov ma’lumoti albatta yetib borishi kerak.
  return await telegramApiRequest('sendMessage', { chat_id: chatId, text: caption, parse_mode: 'HTML' });
}

/** Mini App orqali kelgan chek haqida adminlarga xabar (tasdiqlash tugmalari bilan). */
export async function notifyAdminsAboutDepositReceipt(input: { receiptId: number; userId: number; amount: number; receiptUrl: string }) {
  const admins = getTelegramAdminIds();
  if (admins.length === 0) return { sent: false as const, reason: 'no_admins' as const };
  const base = getPublicBaseUrl();
  const url = input.receiptUrl.startsWith('http') ? input.receiptUrl : `${base}${input.receiptUrl.startsWith('/') ? '' : '/'}${input.receiptUrl}`;
  const text = botText('uz').adminNewReceipt
    .replace('{user}', String(input.userId))
    .replace('{amount}', formatUzAmount(input.amount))
    .replace('{url}', url);
  const reply_markup = {
    inline_keyboard: [[
      { text: botText('uz').adminApprove, callback_data: `deposit_ok:${input.receiptId}` },
      { text: botText('uz').adminReject, callback_data: `deposit_no:${input.receiptId}` },
    ]],
  };
  const results = await Promise.all(admins.map(async adminId => {
    const photo = await telegramApiRequest('sendPhoto', { chat_id: adminId, photo: url, caption: text, parse_mode: 'HTML', reply_markup });
    if (photo.ok) return true;
    const message = await telegramApiRequest('sendMessage', { chat_id: adminId, text, parse_mode: 'HTML', reply_markup });
    return message.ok;
  }));
  return { sent: results.some(Boolean) };
}



/** Shikoyat (report) kelganda adminlarga darhol signal. */
export async function notifyAdminsAboutReport(input: {
  kind: 'review' | 'dispute' | 'support';
  refId: number;
  reporterId?: number;
  reason: string;
  extra?: string;
}) {
  const label = input.kind === 'review' ? "Sharh shikoyati" : input.kind === 'dispute' ? 'Nizo ochildi' : 'Support murojaati';
  const text = [
    `\u{1F6A8} <b>${label}</b>`,
    ``,
    `\u{1F194} Raqam: <b>#${input.refId}</b>`,
    ...(input.reporterId ? [`\u{1F464} Foydalanuvchi ID: <code>${input.reporterId}</code>`] : []),
    ``,
    `\u{1F4DD} Sabab: ${escapeHtml(input.reason).slice(0, 600)}`,
    ...(input.extra ? [``, escapeHtml(input.extra).slice(0, 400)] : []),
  ].join('\n');
  const adminUrl = getTelegramMiniAppUrl('/admin');
  return await notifyTelegramAdmins(text, adminUrl ? { reply_markup: { inline_keyboard: [[{ text: '\u{1F6E0} Admin panel', web_app: { url: adminUrl } }]] } } : {});
}

/** /broadcast — barcha Telegram foydalanuvchilariga xabar. */
export async function broadcastToAllUsers(text: string, limit = 2000) {
  const db = await getDb();
  if (!db) return { sent: 0, total: 0, failed: 0 };
  const rows = await db
    .select({ openId: users.openId })
    .from(users)
    .where(sql`${users.openId} like 'telegram:%'`)
    .limit(limit);
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const chatId = row.openId.slice('telegram:'.length);
    const result = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    if (result.ok) sent += 1; else failed += 1;
    // Telegram limiti: sekundiga ~30 xabar.
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  return { sent, total: rows.length, failed };
}

/** ===== E'lon (akkaunt) moderatsiyasi — to'g'ridan-to'g'ri bot ichida ===== */

function listingAdminKeyboard(accountId: number) {
  return {
    inline_keyboard: [[
      { text: '\u2705 Tasdiqlash', callback_data: `listing_ok:${accountId}` },
      { text: '\u274C Rad etish', callback_data: `listing_no:${accountId}` },
    ], [
      { text: '\u{1F5D1} O\u2018chirish', callback_data: `listing_del:${accountId}` },
    ]],
  };
}

/** Mini App'da yangi akkaunt qo'yilganda adminlarga tasdiqlash tugmalari bilan xabar. */
export async function notifyAdminsAboutNewListing(input: {
  accountId: number;
  sellerId: number;
  playerName: string;
  region: string;
  price: number;
  level?: number;
  thumbnailUrl?: string | null;
}) {
  const admins = getTelegramAdminIds();
  if (admins.length === 0) return { sent: false as const, reason: 'no_admins' as const };
  const text = [
    `\u{1F195} <b>Yangi akkaunt e'loni</b>`,
    ``,
    `\u{1F194} E'lon: <b>#${input.accountId}</b>`,
    `\u{1F464} O\u2018yinchi: <b>${escapeHtml(input.playerName)}</b>`,
    `\u{1F30D} Mintaqa: ${escapeHtml(input.region)}${input.level ? ` \u00B7 LVL ${input.level}` : ''}`,
    `\u{1F4B0} Narx: <b>${formatUzAmount(input.price)}</b> so\u2018m`,
    `\u{1F9D1} Sotuvchi ID: <code>${input.sellerId}</code>`,
    ``,
    `Quyidagi tugmalar orqali shu yerda tasdiqlang yoki o\u2018chiring.`,
  ].join('\n');
  const reply_markup = listingAdminKeyboard(input.accountId);
  const base = getPublicBaseUrl();
  const photo = input.thumbnailUrl
    ? (input.thumbnailUrl.startsWith('http') ? input.thumbnailUrl : `${base}${input.thumbnailUrl.startsWith('/') ? '' : '/'}${input.thumbnailUrl}`)
    : '';
  const results = await Promise.all(admins.map(async adminId => {
    if (photo) {
      const sentPhoto = await telegramApiRequest('sendPhoto', { chat_id: adminId, photo, caption: text, parse_mode: 'HTML', reply_markup });
      if (sentPhoto.ok) return true;
    }
    const sent = await telegramApiRequest('sendMessage', { chat_id: adminId, text, parse_mode: 'HTML', reply_markup });
    return sent.ok;
  }));
  return { sent: results.some(Boolean) };
}

/** Admin bot tugmasi orqali e'lonni tasdiqlaydi, rad etadi yoki o'chiradi. */
export async function reviewListing(accountId: number, action: 'approve' | 'reject' | 'delete', adminTelegramId?: number | string, reason?: string) {
  const db = await getDb();
  if (!db) return { ok: false as const, reason: 'database_unavailable' as const };
  const rows = await db.select().from(pubgAccounts).where(eq(pubgAccounts.id, accountId)).limit(1);
  const account = rows[0];
  if (!account) return { ok: false as const, reason: 'not_found' as const };
  if (account.status === 'sold') return { ok: false as const, reason: 'already_sold' as const };

  const note = `telegram:${adminTelegramId ?? 'admin'}`;
  if (action === 'approve') {
    await db.update(pubgAccounts)
      .set({ status: 'available', isVerified: true, verificationNotes: `Admin tasdiqladi (${note})` })
      .where(eq(pubgAccounts.id, accountId));
  } else if (action === 'reject') {
    await db.update(pubgAccounts)
      .set({ status: 'delisted', isVerified: false, verificationNotes: `Admin rad etdi (${note})` })
      .where(eq(pubgAccounts.id, accountId));
  } else {
    await db.delete(pubgAccounts).where(eq(pubgAccounts.id, accountId));
  }

  await db.insert(securityAudits).values({
    userId: account.sellerId,
    eventType: `listing_${action}_telegram`,
    riskScore: 0,
    details: JSON.stringify({ accountId, reviewedBy: note }),
  }).catch(() => undefined);

  const title = action === 'approve' ? "E'lon tasdiqlandi" : action === 'reject' ? "E'lon rad etildi" : "E'lon o‘chirildi";
  const reasonText = reason?.trim();
  const message = action === 'approve'
    ? `${account.playerName} akkaunti bozorda ko‘rinmoqda.`
    : action === 'reject'
      ? `${account.playerName} akkaunti admin tomonidan rad etildi.${reasonText ? `\nSabab: ${reasonText}` : '\nSabab: qoidalarga mos kelmadi (ma’lumot yoki media yetarli emas).'}`
      : `${account.playerName} akkaunti admin tomonidan o‘chirildi.${reasonText ? `\nSabab: ${reasonText}` : ''}`;

  // Tasdiqlangan e'lonni (sozlamaga qarab) kanalga avtomatik joylaymiz.
  if (action === 'approve' && shouldPostNewListing(account.price)) {
    await postNewListingToChannel({
      accountId: account.id,
      title: account.playerName,
      level: account.level,
      tier: account.region,
      kdRatio: account.kdRatio,
      winRate: account.winRate,
      ucBalance: account.ucBalance,
      hasXSuit: account.hasXSuit,
      hasConquerorHistory: account.hasConquerorHistory,
      price: account.price,
      thumbnailUrl: account.thumbnailUrl,
    }).catch(() => undefined);
  }

  if (action !== 'delete') {
    await db.insert(notifications).values({
      userId: account.sellerId,
      type: 'new_listing',
      title,
      message,
      accountId,
    }).catch(() => undefined);
  } else {
    await db.insert(notifications).values({ userId: account.sellerId, type: 'admin_message', title, message }).catch(() => undefined);
  }

  const owner = await db.select({ openId: users.openId }).from(users).where(eq(users.id, account.sellerId)).limit(1);
  const openId = owner[0]?.openId ?? '';
  if (openId.startsWith('telegram:')) {
    const sellerChatId = openId.slice('telegram:'.length);
    await telegramApiRequest('sendMessage', {
      chat_id: sellerChatId,
      text: `${action === 'approve' ? '\u2705' : action === 'reject' ? '\u274C' : '\u{1F5D1}'} <b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`,
      parse_mode: 'HTML',
    }).catch(() => undefined);
  }
  return { ok: true as const, playerName: account.playerName, action };
}

/** Adminlar uchun: tasdiqlash kutayotgan e'lonlar ro'yxati. */
async function sendPendingListings(chatId: number | string) {
  const db = await getDb();
  if (!db) return await telegramApiRequest('sendMessage', { chat_id: chatId, text: 'Baza hozir mavjud emas.' });
  const rows = await db.select().from(pubgAccounts).where(eq(pubgAccounts.status, 'pending_verification')).limit(10);
  if (rows.length === 0) {
    return await telegramApiRequest('sendMessage', { chat_id: chatId, text: '\u2705 Tasdiqlash kutayotgan e\u2018lon yo\u2018q.' });
  }
  let last: Awaited<ReturnType<typeof telegramApiRequest>> = { ok: false as const, status: 'setup_required' as const } as any;
  for (const account of rows) {
    last = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: `\u{1F4E6} <b>#${account.id} ${escapeHtml(account.playerName)}</b>\n\u{1F30D} ${escapeHtml(account.region)} \u00B7 LVL ${account.level}\n\u{1F4B0} ${formatUzAmount(Number(account.price))} so\u2018m`,
      parse_mode: 'HTML',
      reply_markup: listingAdminKeyboard(account.id),
    });
  }
  return last;
}

/** Admin tugmasi bosilganda chekni tasdiqlaydi yoki rad etadi. */
async function reviewDepositReceipt(receiptId: number, approved: boolean, adminTelegramId?: number | string) {
  const db = await getDb();
  if (!db) return { ok: false as const, reason: 'database_unavailable' as const };
  const rows = await db.select().from(depositReceipts).where(eq(depositReceipts.id, receiptId)).limit(1);
  const receipt = rows[0];
  if (!receipt) return { ok: false as const, reason: 'not_found' as const };
  if (receipt.status !== 'pending') return { ok: false as const, reason: 'already_reviewed' as const };

  await db.transaction(async (tx: any) => {
    await tx.update(depositReceipts).set({
      status: approved ? 'approved' : 'rejected',
      reviewedAt: new Date(),
      reviewNote: `telegram:${adminTelegramId ?? 'admin'}`,
    }).where(and(eq(depositReceipts.id, receiptId), eq(depositReceipts.status, 'pending')));

    if (receipt.transactionId) {
      await tx.update(transactions)
        .set({ status: approved ? 'completed' : 'failed' })
        .where(and(eq(transactions.id, receipt.transactionId), eq(transactions.status, 'pending')));
    }
    if (approved) {
      await tx.update(users).set({ walletBalance: sql`walletBalance + ${receipt.amount}` }).where(eq(users.id, receipt.userId));
    }
    await tx.insert(notifications).values({
      userId: receipt.userId,
      type: 'admin_message',
      title: approved ? 'Balans to‘ldirildi' : 'Chek rad etildi',
      message: `${formatUzAmount(Number(receipt.amount))} so‘m — ${approved ? 'tasdiqlandi' : 'rad etildi'}`,
    });
    await tx.insert(securityAudits).values({
      userId: receipt.userId,
      eventType: approved ? 'deposit_receipt_approved_telegram' : 'deposit_receipt_rejected_telegram',
      riskScore: 0,
      details: JSON.stringify({ receiptId, reviewedBy: `telegram:${adminTelegramId ?? ''}` }),
    });
  });

  const owner = await db.select({ openId: users.openId }).from(users).where(eq(users.id, receipt.userId)).limit(1);
  const openId = owner[0]?.openId ?? '';
  if (openId.startsWith('telegram:')) {
    const userChatId = openId.slice('telegram:'.length);
    const lang = getChatLanguage(userChatId);
    const texts = botText(lang);
    await telegramApiRequest('sendMessage', {
      chat_id: userChatId,
      text: (approved ? texts.walletApproved : texts.walletRejected).replace('{amount}', formatUzAmount(Number(receipt.amount))),
      parse_mode: 'HTML',
      reply_markup: buildMainKeyboard(lang),
    });
  }
  return { ok: true as const, amount: Number(receipt.amount) };
}

async function handleTelegramReceiptPhoto(message: NonNullable<TelegramUpdate['message']>) {
  const chatId = message.chat?.id;
  const telegramUserId = message.from?.id;
  const photo = message.photo?.[message.photo.length - 1];
  if (chatId === undefined || telegramUserId === undefined || !photo) return { handled: false as const, status: 'ignored' as const };

  const selectedFromCaption = Number((message.caption || '').replace(/[^0-9]/g, ''));
  const amount = pendingWalletSelections.get(String(chatId)) ?? (MANUAL_TOPUP_AMOUNTS.includes(selectedFromCaption as typeof MANUAL_TOPUP_AMOUNTS[number]) ? selectedFromCaption : undefined);
  if (!amount) {
    await telegramApiRequest('sendMessage', { chat_id: chatId, text: botText(getChatLanguage(chatId)).receiptNoAmount });
    await sendWalletMenu(chatId);
    return { handled: true as const, command: 'wallet_receipt_missing_amount', status: 'active' as const, sent: true };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const user = await getUserByOpenId(`telegram:${telegramUserId}`);
  if (!token || !user) {
    return { handled: true as const, command: 'wallet_receipt', status: 'setup_required' as const, sent: false };
  }
  if (photo.file_size && photo.file_size > 8 * 1024 * 1024) {
    const sent = await telegramApiRequest('sendMessage', { chat_id: chatId, text: botText(getChatLanguage(chatId)).receiptTooLarge });
    return { handled: true as const, command: 'wallet_receipt', status: sent.status, sent: sent.ok };
  }

  const fileResult = await telegramApiRequest<{ file_path?: string }>('getFile', { file_id: photo.file_id });
  const filePath = fileResult.ok ? fileResult.result?.file_path : undefined;
  if (!filePath) {
    const sent = await telegramApiRequest('sendMessage', { chat_id: chatId, text: botText(getChatLanguage(chatId)).receiptFailed });
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
      text: botText('uz').adminNewReceipt
        .replace('{user}', String(user.id))
        .replace('{amount}', formatUzAmount(amount))
        .replace('{url}', uploaded.url),
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      reply_markup: {
        inline_keyboard: [[
          { text: botText('uz').adminApprove, callback_data: `deposit_ok:${result.receiptId}` },
          { text: botText('uz').adminReject, callback_data: `deposit_no:${result.receiptId}` },
        ]],
      },
    })));
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: botText(getChatLanguage(chatId)).walletReceiptReceived
        .replace('{amount}', formatUzAmount(amount))
        .replace('{id}', String(result.receiptId)),
      parse_mode: 'HTML',
      reply_markup: buildInlineKeyboard('/profile'),
    });
    return { handled: true as const, command: 'wallet_receipt', status: sent.status, sent: sent.ok, receiptId: result.receiptId };
  } catch (error) {
    const sent = await telegramApiRequest('sendMessage', { chat_id: chatId, text: error instanceof Error && error.message === 'receipt_too_large' ? botText(getChatLanguage(chatId)).receiptTooLarge : botText(getChatLanguage(chatId)).receiptFailed });
    return { handled: true as const, command: 'wallet_receipt', status: sent.status, sent: sent.ok };
  }
}

/** ===== Inline search: @bot <so'z> orqali akkaunt izlash ===== */
export async function handleInlineQuery(query: NonNullable<TelegramUpdate['inline_query']>) {
  const term = (query.query ?? '').trim();
  let rows: Array<Record<string, any>> = [];
  try {
    rows = await searchPubgAccounts({ ...(term ? { search: term } : {}), limit: 20 }) as Array<Record<string, any>>;
  } catch (error) {
    console.warn('[Telegram Bot] inline search failed', error);
  }
  const botUsername = await resolveBotUsername();
  const results = rows.slice(0, 20).map(account => {
    const price = formatUzAmount(Number(account.price ?? 0));
    const badge = account.hasXSuit ? 'Pro / X-Suit' : account.hasConquerorHistory ? 'Conqueror' : 'Classic';
    const openUrl = botUsername ? `https://t.me/${botUsername}?start=acc_${account.id}` : null;
    return {
      type: 'article',
      id: `acc_${account.id}`,
      title: `${account.playerName} — ${price} so'm`,
      description: `LVL ${account.level} · K/D ${account.kdRatio} · ${badge}`,
      ...(account.thumbnailUrl ? { thumbnail_url: account.thumbnailUrl } : {}),
      input_message_content: {
        message_text: [
          `\u{1F3AE} <b>${escapeTelegramHtml(account.playerName)}</b>`,
          `\u{1F3C5} LVL ${account.level} \u00B7 \u{1F3AF} K/D ${escapeTelegramHtml(account.kdRatio)}`,
          `\u{1F3C6} ${badge}`,
          `\u{1F4B0} <b>${price} so\u2018m</b>`,
          '',
          '\u{1F6E1} Escrow bilan xavfsiz savdo',
        ].join('\n'),
        parse_mode: 'HTML',
      },
      ...(openUrl ? { reply_markup: { inline_keyboard: [[{ text: '\u{1F6D2} Botda ochish', url: openUrl }]] } } : {}),
    };
  });

  const answered = await telegramApiRequest('answerInlineQuery', {
    inline_query_id: query.id,
    results,
    cache_time: 30,
    is_personal: true,
    button: botUsername ? { text: '\u{1F525} Barcha akkauntlar', start_parameter: 'inline' } : undefined,
  });
  return { handled: true as const, command: 'inline_query', status: answered.status, sent: answered.ok, count: results.length };
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.inline_query) {
    return await handleInlineQuery(update.inline_query);
  }
  const callback = update.callback_query;
  if (callback) {
    const callbackChatId = callback.message?.chat?.id;
    if (callbackChatId === undefined) return { handled: false as const, status: 'ignored' as const };
    const data = callback.data || '';
    await resolveChatLanguage(callbackChatId, callback.from?.id);

    if (data === 'check_sub') {
      const cbLang = getChatLanguage(callbackChatId);
      const t = channelTexts(cbLang);
      const subscribed = await isChannelMember(callback.from?.id);
      await answerTelegramCallback(callback.id, subscribed ? t.done : t.stillNot, !subscribed);
      if (!subscribed) {
        // Yangi xabar yubormaymiz — eski gate xabari joyida qoladi (spam bo'lmasin).
        return { handled: true as const, command: 'check_sub', status: 'active' as const, sent: false, subscribed: false };
      }
      // Obuna tasdiqlandi — gate xabarini o'chiramiz va menyuni ochamiz.
      await deleteChannelGateMessage(callbackChatId, callback.message?.message_id);
      const welcome = await sendWelcome(callbackChatId, cbLang, callback.from?.id ? `#${callback.from.id}` : 'do‘stim');
      await telegramApiRequest('sendMessage', {
        chat_id: callbackChatId,
        text: botText(cbLang).chooseSection,
        reply_markup: buildMainKeyboard(cbLang, isTelegramAdmin(callback.from?.id)),
      });
      return { handled: true as const, command: 'check_sub', status: welcome.status, sent: welcome.ok, subscribed: true };
    }

    const marketPage = parseMarketplacePageData(data);

    if (marketPage) {
      await answerTelegramCallback(callback.id, botText(getChatLanguage(callbackChatId)).cbLoading);
      const result = await sendMarketplaceResults(callbackChatId, marketPage.page, marketPage.path);
      return { handled: true as const, command: 'market_page', status: result.sent.status, sent: result.sent.ok, page: result.page, count: result.count, hasNext: result.hasNext };
    }
    const filterMenuMatch = /^market_filter_menu:(.+)$/.exec(data);
    if (filterMenuMatch) {
      let selectedPath = '/accounts';
      try { selectedPath = decodeURIComponent(filterMenuMatch[1]); } catch { selectedPath = '/accounts'; }
      await answerTelegramCallback(callback.id, botText(getChatLanguage(callbackChatId)).cbFilters);
      const sent = await sendMarketplaceMenu(callbackChatId, selectedPath.startsWith('/accounts') ? selectedPath : '/accounts');
      return { handled: true as const, command: 'market_filter_menu', status: sent.status, sent: sent.ok };
    }
    const langMatch = /^set_lang:(uz|ru|en)$/.exec(data);
    if (langMatch) {
      const lang = langMatch[1] as BotLang;
      setChatLanguage(callbackChatId, lang);
      const telegramId = callback.from?.id;
      if (telegramId !== undefined) {
        try { await upsertUser({ openId: `telegram:${telegramId}`, languageCode: lang }); } catch (error) { console.warn('[Telegram Bot] language save failed', error); }
      }
      await answerTelegramCallback(callback.id, botText(lang).languageSaved);
      const sent = await telegramApiRequest('sendMessage', { chat_id: callbackChatId, text: `${botText(lang).languageSaved}\n\n${botText(lang).chooseSection}`, reply_markup: buildMainKeyboard(lang) });
      return { handled: true as const, command: 'set_lang', status: sent.status, sent: sent.ok, lang };
    }
    if (data === 'show_rules') {
      const lang = getChatLanguage(callbackChatId);
      await answerTelegramCallback(callback.id, botText(lang).menuRules);
      const sent = await sendRules(callbackChatId, lang);
      return { handled: true as const, command: 'rules', status: sent.status, sent: sent.ok };
    }
    if (data === 'show_referral') {
      const lang = getChatLanguage(callbackChatId);
      await answerTelegramCallback(callback.id, botText(lang).menuReferral);
      const sent = await sendReferral(callbackChatId, lang, callback.from?.id);
      return { handled: true as const, command: 'referral', status: sent.status, sent: sent.ok };
    }
    if (data === 'show_language') {
      await answerTelegramCallback(callback.id, '🌐');
      const sent = await telegramApiRequest('sendMessage', { chat_id: callbackChatId, text: botText(getChatLanguage(callbackChatId)).languageTitle, reply_markup: languageKeyboard() });
      return { handled: true as const, command: 'language', status: sent.status, sent: sent.ok };
    }
    if (data === 'wallet_menu') {
      await answerTelegramCallback(callback.id, botText(getChatLanguage(callbackChatId)).walletTitle);
      const sent = await sendWalletMenu(callbackChatId, getChatLanguage(callbackChatId));
      return { handled: true as const, command: 'wallet_menu', status: sent.status, sent: sent.ok };
    }
    const marketPath = marketplaceFilterPath(data);
    if (marketPath) {
      await answerTelegramCallback(callback.id, botText(getChatLanguage(callbackChatId)).cbFilters);
      const sent = await sendMarketplaceMenu(callbackChatId, marketPath);
      return { handled: true as const, command: 'market_filter', status: sent.status, sent: sent.ok, path: marketPath };
    }
    const cbLang = getChatLanguage(callbackChatId);
    const cbTexts = botText(cbLang);
    const amountMatch = /^wallet_amount:(\d+)$/.exec(data);
    if (amountMatch) {
      const amount = Number(amountMatch[1]);
      pendingWalletSelections.set(String(callbackChatId), amount);
      await answerTelegramCallback(callback.id, cbTexts.walletAmountChosen.replace('{amount}', formatUzAmount(amount)));
      const sent = await telegramApiRequest('sendMessage', {
        chat_id: callbackChatId,
        text: `${cbTexts.walletAmountChosen.replace('{amount}', formatUzAmount(amount))}\n\n${cbTexts.walletChooseMethod}`,
        parse_mode: 'HTML',
        reply_markup: walletMethodKeyboard(amount, cbLang),
      });
      return { handled: true as const, command: 'wallet_amount', status: sent.status, sent: sent.ok, amount };
    }
    const methodMatch = /^wallet_method:(uzcard|visa):(\d+)$/.exec(data);
    if (methodMatch) {
      const method = methodMatch[1] as PaymentMethodId;
      const amount = Number(methodMatch[2]);
      pendingWalletSelections.set(String(callbackChatId), amount);
      await answerTelegramCallback(callback.id, PAYMENT_CARDS[method].label);
      const sent = await sendPaymentCard(callbackChatId, method, amount, cbLang);
      return { handled: true as const, command: 'wallet_method', status: sent.status, sent: sent.ok, method, amount };
    }
    const soonMatch = /^wallet_soon:(ton|stars)$/.exec(data);
    if (soonMatch) {
      await answerTelegramCallback(callback.id, cbTexts.walletSoon);
      const soonImage = paymentImageUrl(soonMatch[1] === 'ton' ? '/assets/pay-ton.jpg' : '/assets/pay-stars.jpg');
      const sent = soonImage
        ? await telegramApiRequest('sendPhoto', { chat_id: callbackChatId, photo: soonImage, caption: cbTexts.walletSoon, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: cbTexts.walletBack, callback_data: 'wallet_menu' }]] } })
        : await telegramApiRequest('sendMessage', { chat_id: callbackChatId, text: cbTexts.walletSoon });
      return { handled: true as const, command: 'wallet_soon', status: sent.status, sent: sent.ok };
    }
    const listingMatch = /^listing_(ok|no|del):(\d+)$/.exec(data);
    if (listingMatch) {
      if (!isTelegramAdmin(callback.from?.id)) {
        await answerTelegramCallback(callback.id, '\u26D4');
        return { handled: true as const, command: 'listing_review', status: 'active' as const, sent: false };
      }
      const action = listingMatch[1] === 'ok' ? 'approve' as const : listingMatch[1] === 'no' ? 'reject' as const : 'delete' as const;
      const accountId = Number(listingMatch[2]);
      const review = await reviewListing(accountId, action, callback.from?.id);
      await answerTelegramCallback(callback.id, review.ok ? (action === 'approve' ? '\u2705' : action === 'reject' ? '\u274C' : '\u{1F5D1}') : '\u26A0\uFE0F');
      const label = action === 'approve' ? 'tasdiqlandi' : action === 'reject' ? 'rad etildi' : 'o\u2018chirildi';
      const sent = await telegramApiRequest('sendMessage', {
        chat_id: callbackChatId,
        text: review.ok
          ? `${action === 'approve' ? '\u2705' : action === 'reject' ? '\u274C' : '\u{1F5D1}'} #${accountId} e'lon ${label}.`
          : `\u26A0\uFE0F #${accountId} e'lon ustida amal bajarilmadi (${String((review as { reason?: string }).reason ?? 'xatolik')}).`,
      });
      return { handled: true as const, command: 'listing_review', status: sent.status, sent: sent.ok };
    }
    const depositMatch = /^deposit_(ok|no):(\d+)$/.exec(data);
    if (depositMatch) {
      if (!isTelegramAdmin(callback.from?.id)) {
        await answerTelegramCallback(callback.id, '\u26D4');
        return { handled: true as const, command: 'deposit_review', status: 'active' as const, sent: false };
      }
      const approved = depositMatch[1] === 'ok';
      const receiptId = Number(depositMatch[2]);
      const review = await reviewDepositReceipt(receiptId, approved, callback.from?.id);
      await answerTelegramCallback(callback.id, review.ok ? (approved ? '\u2705' : '\u274C') : '\u26A0\uFE0F');
      const sent = await telegramApiRequest('sendMessage', {
        chat_id: callbackChatId,
        text: review.ok
          ? cbTexts.adminReviewDone
              .replace('{icon}', approved ? '\u2705' : '\u274C')
              .replace('{id}', String(receiptId))
              .replace('{state}', approved ? cbTexts.adminApprove.replace(/^\S+\s/, '') : cbTexts.adminReject.replace(/^\S+\s/, ''))
          : cbTexts.adminReviewSkipped.replace('{id}', String(receiptId)).replace('{reason}', String(review.reason)),
      });
      return { handled: true as const, command: 'deposit_review', status: sent.status, sent: sent.ok };
    }
    await answerTelegramCallback(callback.id, botText(getChatLanguage(callbackChatId)).callbackExpired);
    return { handled: true as const, command: 'callback', status: 'active' as const, sent: true };
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  if (!message || chatId === undefined) return { handled: false as const, status: 'ignored' as const };

  // Spam himoyasi: juda tez yozilgan xabarlar e'tiborsiz qoldiriladi.
  const rate = checkBotRateLimit(chatId);
  if (!rate.allowed) {
    if (rate.warn) {
      await telegramApiRequest('sendMessage', {
        chat_id: chatId,
        text: '\u23F3 Juda tez yozyapsiz. Iltimos, bir necha soniya kutib turing.',
      });
    }
    return { handled: true as const, command: 'rate_limited', status: 'active' as const, sent: false };
  }

  await telegramApiRequest('sendChatAction', { chat_id: chatId, action: 'typing' });

  if (message.photo?.length) {
    return await handleTelegramReceiptPhoto(message);
  }

  const contact = message.contact;
  if (contact) {
    const ownsContact = contact.user_id !== undefined && String(contact.user_id) === String(message.from?.id);
    if (!ownsContact) {
      const sent = await telegramApiRequest('sendMessage', {
        chat_id: chatId,
        text: botText(getChatLanguage(chatId, message.from?.language_code)).contactOtherUser,
        parse_mode: 'HTML',
        reply_markup: buildMainKeyboard(),
      });
      return { handled: true as const, command: 'contact', status: sent.status, sent: sent.ok };
    }

    const telegramId = String(contact.user_id);
    const displayName = contact.first_name || `Telegram ${telegramId}`;
    try {
      await upsertUser({ openId: `telegram:${telegramId}`, name: displayName, loginMethod: 'telegram_phone', phone: contact.phone_number ?? null, languageCode: getChatLanguage(chatId, message.from?.language_code), lastSignedIn: new Date() });
    } catch (error) {
      console.warn('[Telegram Bot] contact upsert failed', error);
    }

    const loginToken = createTelegramLoginToken({ telegramId, name: displayName, phone: contact.phone_number });
    const loginUrl = loginToken ? getTelegramMiniAppUrl(`/profile?tglogin=${encodeURIComponent(loginToken)}`) : getTelegramMiniAppUrl('/profile');
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: `${botText(getChatLanguage(chatId)).contactVerified}\n\n📱 ${escapeTelegramHtml(contact.phone_number || '')}\n\n${botText(getChatLanguage(chatId)).contactVerifiedBody}`,
      parse_mode: 'HTML',
      reply_markup: loginUrl
        ? { inline_keyboard: [[{ text: botText(getChatLanguage(chatId)).contactLogin, web_app: { url: loginUrl } }]] }
        : buildMainKeyboard(),
    });
    if (loginUrl) {
      const contactLang = getChatLanguage(chatId, message.from?.language_code);
      await telegramApiRequest('sendMessage', { chat_id: chatId, text: botText(contactLang).mainMenu, reply_markup: buildMainKeyboard(contactLang) });
    }
    return { handled: true as const, command: 'contact', status: sent.status, sent: sent.ok, login: Boolean(loginToken) };
  }

  const command = parseTelegramCommand(message.text);
  const lang = await resolveChatLanguage(chatId, message.from?.id, message.from?.language_code);
  const texts = botText(lang);
  const menuKey = matchMenuKey(message.text ?? '');
  const rawText = (message.text ?? '').trim();
  const isAdminUser = isTelegramAdmin(message.from?.id);

  // Majburiy kanal obunasi: admin bo'lmaganlar avval kanalga qo'shilishi kerak.
  if (!isAdminUser && isForcedSubscriptionEnabled() && (message.chat?.type ?? 'private') === 'private') {
    const subscribed = await isChannelMember(message.from?.id);
    if (!subscribed) {
      const gate = await sendSubscriptionGate(chatId, lang);
      return { handled: true as const, command: 'force_subscribe', status: gate.status, sent: gate.ok };
    }
  }

  if (command === 'start' || command === '') {
    const sent = await sendWelcome(chatId, lang, message.from?.id ? `#${message.from.id}` : 'do‘stim');
    await telegramApiRequest('sendMessage', { chat_id: chatId, text: texts.chooseSection, reply_markup: buildMainKeyboard(lang, isAdminUser) });
    return { handled: true as const, command: 'start', status: sent.status, sent: sent.ok };
  }

  if (command === 'buy' || menuKey === 'menuMarket') {
    const sent = await sendMarketplaceMenu(chatId);
    return { handled: true as const, command: 'buy', status: sent.status, sent: sent.ok };
  }
  if (command === 'wallet' || menuKey === 'menuWallet') {
    const sent = await sendWalletMenu(chatId, lang);
    return { handled: true as const, command: 'wallet', status: sent.status, sent: sent.ok };
  }
  if (command === 'rules' || menuKey === 'menuRules') {
    const sent = await sendRules(chatId, lang);
    return { handled: true as const, command: 'rules', status: sent.status, sent: sent.ok };
  }
  if (command === 'referral' || menuKey === 'menuReferral') {
    const sent = await sendReferral(chatId, lang, message.from?.id);
    return { handled: true as const, command: 'referral', status: sent.status, sent: sent.ok };
  }
  if (command === 'support' || menuKey === 'menuSupport') {
    const sent = await sendSupport(chatId, lang);
    return { handled: true as const, command: 'support', status: sent.status, sent: sent.ok };
  }
  if (command === 'faq') {
    const items = await listFaq();
    const body = items
      .slice(0, 10)
      .map((item: any, index: number) => `<b>${index + 1}. ${escapeHtml(item.question)}</b>\n${escapeHtml(item.answer)}`)
      .join('\n\n');
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: `<b>${texts.faqTitle}</b>\n\n${body}`,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: buildInlineKeyboard('/support'),
    });
    return { handled: true as const, command: 'faq', status: sent.status, sent: sent.ok };
  }
  if (command === 'listings' || command === 'elonlar' || command === 'akkauntlar') {
    if (!isAdminUser) {
      const denied = await telegramApiRequest('sendMessage', { chat_id: chatId, text: 'Bu bo\u2018lim faqat admin uchun.' });
      return { handled: true as const, command: 'listings', status: denied.status, sent: denied.ok };
    }
    const sent = await sendPendingListings(chatId);
    return { handled: true as const, command: 'listings', status: sent.status, sent: sent.ok };
  }
  if (command === 'admin' || command === 'panel' || rawText === botText('uz').menuPanel || rawText === botText('ru').menuPanel || rawText === botText('en').menuPanel) {
    if (!isAdminUser) {
      const sent = await telegramApiRequest('sendMessage', {
        chat_id: chatId,
        text: 'Bu bo‘lim faqat admin uchun.',
        reply_markup: { inline_keyboard: [[adminContactButton(lang)]] },
      });
      return { handled: true as const, command: 'admin', status: sent.status, sent: sent.ok };
    }
    const sent = await sendAdminPanel(chatId, lang);
    return { handled: true as const, command: 'admin', status: sent.status, sent: sent.ok };
  }
  if (command === 'broadcast') {
    if (!isAdminUser) {
      const denied = await telegramApiRequest('sendMessage', { chat_id: chatId, text: 'Bu buyruq faqat admin uchun.' });
      return { handled: true as const, command: 'broadcast', status: denied.status, sent: denied.ok };
    }
    const payload = rawText.replace(/^\/broadcast(@\S+)?\s*/i, '').trim();
    if (!payload) {
      const hint = await telegramApiRequest('sendMessage', {
        chat_id: chatId,
        text: '\u{1F4E3} <b>Broadcast</b>\n\nFoydalanish: <code>/broadcast Xabar matni</code>',
        parse_mode: 'HTML',
      });
      return { handled: true as const, command: 'broadcast', status: hint.status, sent: hint.ok };
    }
    await telegramApiRequest('sendMessage', { chat_id: chatId, text: '\u{1F4E4} Yuborilmoqda...' });
    const result = await broadcastToAllUsers(`\u{1F4E3} <b>Inferno Stealth</b>\n\n${escapeTelegramHtml(payload)}`);
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: `\u2705 Broadcast yakunlandi.\n\nYuborildi: <b>${result.sent}</b> / ${result.total}\nXato: ${result.failed}`,
      parse_mode: 'HTML',
    });
    return { handled: true as const, command: 'broadcast', status: sent.status, sent: sent.ok, delivered: result.sent };
  }
  if (command === 'digest') {
    if (!isAdminUser) {
      const denied = await telegramApiRequest('sendMessage', { chat_id: chatId, text: 'Bu buyruq faqat admin uchun.' });
      return { handled: true as const, command: 'digest', status: denied.status, sent: denied.ok };
    }
    const { postDailyDigestNow } = await import('./telegramDigest');
    const digest = await postDailyDigestNow();
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: digest.ok ? '\u2705 Kunlik digest kanalga joylandi.' : '\u26A0\uFE0F Digest joylanmadi.',
    });
    return { handled: true as const, command: 'digest', status: sent.status, sent: sent.ok };
  }
  if (command === 'contactadmin' || menuKey === 'menuAdmin') {
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: `<b>${texts.adminTitle}</b>\n\n${texts.adminBody.replace('{admin}', ADMIN_TELEGRAM_LABEL)}`,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[adminContactButton(lang)]] },
    });
    return { handled: true as const, command: 'contactadmin', status: sent.status, sent: sent.ok };
  }
  if (command === 'language' || menuKey === 'menuLanguage') {
    const sent = await telegramApiRequest('sendMessage', { chat_id: chatId, text: texts.languageTitle, reply_markup: languageKeyboard() });
    return { handled: true as const, command: 'language', status: sent.status, sent: sent.ok };
  }
  if (command === 'sell' || menuKey === 'menuSell') {
    const sellUrl = getTelegramMiniAppUrl('/sell');
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: `<b>${texts.sellTitle}</b>\n\n${texts.sellBody}`,
      parse_mode: 'HTML',
      reply_markup: sellUrl ? { inline_keyboard: [[{ text: texts.openApp, web_app: { url: sellUrl } }]] } : buildMainKeyboard(lang),
    });
    return { handled: true as const, command: 'sell', status: sent.status, sent: sent.ok };
  }
  if (command === 'orders' || menuKey === 'menuOrders') {
    const ordersUrl = getTelegramMiniAppUrl('/orders');
    const sent = await telegramApiRequest('sendMessage', {
      chat_id: chatId,
      text: `<b>${texts.ordersTitle}</b>\n\n${texts.ordersBody}`,
      parse_mode: 'HTML',
      reply_markup: ordersUrl ? { inline_keyboard: [[{ text: texts.openApp, web_app: { url: ordersUrl } }]] } : buildMainKeyboard(lang),
    });
    return { handled: true as const, command: 'orders', status: sent.status, sent: sent.ok };
  }
  if (command === 'mylistings' || menuKey === 'menuListings') {
    const sent = await telegramApiRequest('sendMessage', { chat_id: chatId, text: `<b>${texts.listingsTitle}</b>\n\n${texts.listingsBody}`, parse_mode: 'HTML', reply_markup: buildInlineKeyboard('/profile') });
    return { handled: true as const, command: 'mylistings', status: sent.status, sent: sent.ok };
  }

  const response = getTelegramCommandResponse(command, message.from?.id);
  const unknown = !TELEGRAM_BOT_COMMANDS.some(item => item.command === command);
  const sent = await telegramApiRequest('sendMessage', {
    chat_id: chatId,
    text: unknown ? `<b>${texts.helpTitle}</b>\n\n${texts.helpBody}` : `<b>${response.title}</b>\n\n${response.text}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    // The persistent menu keyboard must always be visible, so it is attached to
    // every reply instead of only /start.
    reply_markup: buildMainKeyboard(lang, isAdminUser),
  });

  return { handled: true as const, command, status: sent.status, sent: sent.ok };
}

export async function registerTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { status: "setup_required" as const, commands: false, menu: false, webhook: false };
  }

  // Only /start should remain in the Telegram command list, so every stale
  // command scope is wiped before registering it again.
  for (const scope of [undefined, { type: "all_private_chats" }, { type: "all_group_chats" }, { type: "default" }]) {
    await telegramApiRequest("deleteMyCommands", scope ? { scope } : {});
  }
  const publicCommands = TELEGRAM_BOT_COMMANDS.filter(item => !item.adminOnly)
    .map(item => ({ command: item.command, description: item.description }));
  const commands = await telegramApiRequest("setMyCommands", {
    commands: publicCommands,
    scope: { type: "all_private_chats" },
  });

  // Adminlar uchun qo'shimcha buyruqlar (faqat admin chatlarida ko'rinadi).
  const adminCommands = [
    ...publicCommands,
    { command: "listings", description: "Tasdiqlash kutayotgan e'lonlar" },
    { command: "admin", description: "Admin nazorati" },
    { command: "broadcast", description: "Hammaga xabar yuborish" },
    { command: "digest", description: "Kunlik digestni kanalga joylash" },
  ];
  for (const adminId of getTelegramAdminIds()) {
    await telegramApiRequest("setMyCommands", {
      commands: adminCommands,
      scope: { type: "chat", chat_id: adminId },
    });
  }

  const menuUrl = getTelegramMiniAppUrl("/");
  const menu = menuUrl
    ? await telegramApiRequest("setChatMenuButton", {
        menu_button: { type: "web_app", text: "Inferno Market", web_app: { url: menuUrl } },
      })
    : { ok: false as const, status: "setup_required" as const };

  const webhookUrl = getTelegramWebhookUrl();
  const webhookSecret = getTelegramWebhookSecret();
  const webhook = webhookUrl
    ? await telegramApiRequest("setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query", "inline_query"],
        drop_pending_updates: false,
        ...(webhookSecret ? { secret_token: webhookSecret } : {}),
      })
    : { ok: false as const, status: "setup_required" as const };

  if (webhookUrl && !webhook.ok) {
    console.error(`[Telegram] setWebhook failed for ${webhookUrl}:`, JSON.stringify(webhook));
  } else if (webhookUrl) {
    console.log(`[Telegram] webhook registered at ${webhookUrl}`);
  } else {
    console.warn("[Telegram] webhook URL could not be resolved (set RAILWAY_PUBLIC_DOMAIN or TELEGRAM_WEBHOOK_URL)");
  }

  return { status: "active" as const, commands: commands.ok, menu: menu.ok, webhook: webhook.ok };
}

let lastWebhookResync = 0;

/**
 * Re-register the webhook (throttled) so a stale secret_token on Telegram's
 * side self-heals instead of dropping every update with 401.
 */
async function resyncTelegramWebhook() {
  const now = Date.now();
  if (now - lastWebhookResync < 60_000) return;
  lastWebhookResync = now;

  const webhookUrl = getTelegramWebhookUrl();
  const webhookSecret = getTelegramWebhookSecret();
  if (!webhookUrl || !process.env.TELEGRAM_BOT_TOKEN) return;

  const result = await telegramApiRequest("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query", "inline_query"],
    drop_pending_updates: false,
    ...(webhookSecret ? { secret_token: webhookSecret } : {}),
  });
  console.log(`[Telegram] webhook resync ok=${result.ok} url=${webhookUrl}`);
}

export function registerTelegramWebhook(app: Express) {
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    console.log(`[Telegram Webhook] Received update:`, JSON.stringify(req.body));
    
    const acceptedSecrets = getAcceptedTelegramWebhookSecrets();
    const providedSecret = req.header("x-telegram-bot-api-secret-token") ?? "";
    if (acceptedSecrets.length > 0 && !acceptedSecrets.includes(providedSecret)) {
      console.warn("[Telegram Webhook] Secret mismatch — re-registering webhook");
      void resyncTelegramWebhook();
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
