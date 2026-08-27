/**
 * Majburiy kanal obunasi + sotilgan akkaunt uchun avto-post.
 *
 * Bu modul telegramBot.ts ga bog'liq emas (circular import bo'lmasligi uchun),
 * shuning uchun kichik yordamchi funksiyalar shu yerda takrorlanadi.
 */

export const DEFAULT_CHANNEL_USERNAME = 'Pubg_akkaunt_sell';

/** @Kanal username (env orqali o'zgartirsa bo'ladi). */
export function getChannelUsername() {
  const raw = (process.env.TELEGRAM_CHANNEL_USERNAME || DEFAULT_CHANNEL_USERNAME).trim();
  return raw.replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '');
}

export function getChannelChatId() {
  const explicit = process.env.TELEGRAM_CHANNEL_ID?.trim();
  if (explicit) return explicit;
  return `@${getChannelUsername()}`;
}

export function getChannelUrl() {
  return `https://t.me/${getChannelUsername()}`;
}

/** Majburiy obuna yoqilganmi (default: yoqilgan). */
export function isForcedSubscriptionEnabled() {
  const flag = (process.env.TELEGRAM_FORCE_SUBSCRIBE ?? 'true').toLowerCase();
  return flag !== 'false' && flag !== '0' && flag !== 'off';
}

async function channelApiRequest<T = unknown>(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false as const, status: 'setup_required' as const };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
    if (!response.ok || payload.ok !== true) {
      return { ok: false as const, status: 'failed' as const, httpStatus: response.status, description: payload.description };
    }
    return { ok: true as const, status: 'active' as const, result: payload.result as T };
  } catch {
    return { ok: false as const, status: 'failed' as const };
  }
}

const MEMBER_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);

/**
 * Foydalanuvchi kanalga a'zomi?
 * Bot kanalda admin bo'lmasa Telegram xato qaytaradi — bunday holda savdo
 * to'xtab qolmasligi uchun `true` qaytariladi.
 */
export async function isChannelMember(userId?: number | string) {
  if (userId === undefined || userId === null) return true;
  if (!isForcedSubscriptionEnabled()) return true;
  const result = await channelApiRequest<{ status?: string }>('getChatMember', {
    chat_id: getChannelChatId(),
    user_id: userId,
  });
  if (!result.ok) {
    const description = 'description' in result ? String(result.description ?? '') : '';
    if (/user not found/i.test(description)) return false;
    // chat not found / bot is not a member => tekshirib bo'lmadi, bloklamaymiz
    return true;
  }
  const status = result.result?.status;
  // Status kelmasa (kutilmagan javob) — foydalanuvchini bloklamaymiz.
  if (!status) return true;
  return MEMBER_STATUSES.has(String(status));
}

const SUBSCRIBE_TEXTS = {
  uz: {
    title: '🔒 Avval kanalga obuna bo‘ling',
    body: 'Botdan foydalanish uchun rasmiy kanalimizga obuna bo‘lishingiz shart.\nU yerda sotilgan akkauntlar, narxlar va yangi e’lonlar chiqib turadi.',
    join: '📢 Kanalga obuna bo‘lish',
    check: '✅ Obunani tekshirish',
    stillNot: '❌ Obuna topilmadi. Iltimos, kanalga qo‘shiling va yana tekshiring.',
    done: '✅ Rahmat! Obuna tasdiqlandi.',
  },
  ru: {
    title: '🔒 Сначала подпишитесь на канал',
    body: 'Чтобы пользоваться ботом, подпишитесь на наш официальный канал.\nТам публикуются проданные аккаунты, цены и новые объявления.',
    join: '📢 Подписаться на канал',
    check: '✅ Проверить подписку',
    stillNot: '❌ Подписка не найдена. Подпишитесь и проверьте снова.',
    done: '✅ Спасибо! Подписка подтверждена.',
  },
  en: {
    title: '🔒 Join our channel first',
    body: 'You must join our official channel to use the bot.\nSold accounts, prices and new listings are posted there.',
    join: '📢 Join the channel',
    check: '✅ Check subscription',
    stillNot: '❌ Subscription not found. Please join and check again.',
    done: '✅ Thanks! Subscription confirmed.',
  },
} as const;

export type ChannelLang = keyof typeof SUBSCRIBE_TEXTS;

export function channelTexts(lang: string = 'uz') {
  return SUBSCRIBE_TEXTS[(lang as ChannelLang)] ?? SUBSCRIBE_TEXTS.uz;
}

/** Obuna bo'lmagan foydalanuvchiga majburiy obuna xabari. */
export async function sendSubscriptionGate(chatId: number | string, lang: string = 'uz') {
  const t = channelTexts(lang);
  return await channelApiRequest('sendMessage', {
    chat_id: chatId,
    text: `<b>${t.title}</b>\n\n${t.body}\n\n👉 ${getChannelUrl()}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: t.join, url: getChannelUrl() }],
        [{ text: t.check, callback_data: 'check_sub' }],
      ],
    },
  });
}

function publicBaseUrl() {
  const configured =
    process.env.TELEGRAM_MINI_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '') ||
    (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL.replace(/^https?:\/\//, '')}` : '');
  return configured ? configured.replace(/\/$/, '') : null;
}

function absoluteUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const base = publicBaseUrl();
  if (!base) return null;
  return `${base}${value.startsWith('/') ? '' : '/'}${value}`;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const uzNumber = (value: number) => Math.round(value).toLocaleString('uz-UZ');

export type SoldAccountPost = {
  accountId: number;
  orderId?: number;
  title?: string | null;
  level?: number | null;
  tier?: string | null; // region
  kdRatio?: number | string | null;
  winRate?: number | string | null;
  totalMatches?: number | null;
  ucBalance?: number | null;
  outfitCount?: number | null;
  gunSkinCount?: number | null;
  vehicleCount?: number | null;
  hasXSuit?: boolean | null;
  hasConquerorHistory?: boolean | null;
  accountCreatedYear?: number | null;
  featuredSkins?: string[] | null;
  price: number | string;
  thumbnailUrl?: string | null;
  galleryUrls?: string[] | null;
  videoUrl?: string | null;
  sellerName?: string | null;
  buyerName?: string | null;
};

/** Pro darajali "SOTILDI" posti matni. */
export function buildSoldPostCaption(account: SoldAccountPost) {
  const price = Number(account.price || 0);
  const lines: string[] = [];
  lines.push('🔥 <b>AKKAUNT SOTILDI</b> 🔥');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`🎮 <b>${escapeHtml(account.title || `PUBG akkaunt #${account.accountId}`)}</b>`);
  lines.push('');

  const stats: string[] = [];
  if (account.level) stats.push(`🏅 Level: <b>${account.level}</b>`);
  if (account.tier) stats.push(`🌍 Region: <b>${escapeHtml(String(account.tier))}</b>`);
  if (account.kdRatio) stats.push(`🎯 K/D: <b>${Number(account.kdRatio).toFixed(2)}</b>`);
  if (account.winRate) stats.push(`🏆 Win rate: <b>${Number(account.winRate).toFixed(1)}%</b>`);
  if (account.totalMatches) stats.push(`⚔️ Matchlar: <b>${uzNumber(Number(account.totalMatches))}</b>`);
  if (account.accountCreatedYear) stats.push(`📅 Yil: <b>${account.accountCreatedYear}</b>`);
  if (stats.length) {
    lines.push('<b>📊 Statistika</b>');
    lines.push(stats.join('\n'));
    lines.push('');
  }

  const inventory: string[] = [];
  if (account.ucBalance) inventory.push(`💎 UC: <b>${uzNumber(Number(account.ucBalance))}</b>`);
  if (account.outfitCount) inventory.push(`👕 Kostyum: <b>${account.outfitCount}</b>`);
  if (account.gunSkinCount) inventory.push(`🔫 Qurol skin: <b>${account.gunSkinCount}</b>`);
  if (account.vehicleCount) inventory.push(`🚗 Mashina skin: <b>${account.vehicleCount}</b>`);
  if (account.hasXSuit) inventory.push('✨ X-Suit: <b>bor</b>');
  if (account.hasConquerorHistory) inventory.push('🥇 Conqueror tarixi: <b>bor</b>');
  if (inventory.length) {
    lines.push('<b>🎒 Inventar</b>');
    lines.push(inventory.join('\n'));
    lines.push('');
  }

  const skins = (account.featuredSkins ?? []).filter(Boolean).slice(0, 6);
  if (skins.length) {
    lines.push('<b>⭐ Top skinlar</b>');
    lines.push(skins.map(skin => `• ${escapeHtml(skin)}`).join('\n'));
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`💰 Sotildi: <b>${uzNumber(price)} so‘m</b>`);
  if (account.sellerName) lines.push(`🧑‍💼 Sotuvchi: <b>${escapeHtml(account.sellerName)}</b>`);
  if (account.orderId) lines.push(`🧾 Buyurtma: <code>#${account.orderId}</code>`);
  lines.push('🛡 To‘lov escrow orqali xavfsiz amalga oshirildi');
  lines.push('');
  lines.push('👉 Siz ham akkaunt sotib oling yoki soting — botda!');

  return lines.join('\n');
}

/**
 * Sotilgan akkauntni kanalga avtomatik joylaydi:
 * video bo'lsa video, bir nechta rasm bo'lsa media group, aks holda rasm/matn.
 */
export async function postSoldAccountToChannel(account: SoldAccountPost) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return { ok: false as const, reason: 'no_token' as const };
  const chatId = getChannelChatId();
  const caption = buildSoldPostCaption(account);
  const video = absoluteUrl(account.videoUrl);
  const photos = [account.thumbnailUrl, ...(account.galleryUrls ?? [])]
    .map(absoluteUrl)
    .filter((value): value is string => Boolean(value));
  const uniquePhotos = Array.from(new Set(photos)).slice(0, 9);

  // Telegram caption limiti 1024 belgi — uzun matnni alohida xabar bilan yuboramiz.
  const shortCaption = caption.length > 1000 ? `${caption.slice(0, 990)}…` : caption;

  if (video) {
    const sent = await channelApiRequest('sendVideo', {
      chat_id: chatId,
      video,
      caption: shortCaption,
      parse_mode: 'HTML',
      supports_streaming: true,
    });
    if (sent.ok) {
      if (uniquePhotos.length >= 2) {
        await channelApiRequest('sendMediaGroup', {
          chat_id: chatId,
          media: uniquePhotos.slice(0, 9).map(photo => ({ type: 'photo', media: photo })),
        });
      }
      return { ok: true as const, mode: 'video' as const };
    }
  }

  if (uniquePhotos.length >= 2) {
    const sent = await channelApiRequest('sendMediaGroup', {
      chat_id: chatId,
      media: uniquePhotos.map((photo, index) => ({
        type: 'photo',
        media: photo,
        ...(index === 0 ? { caption: shortCaption, parse_mode: 'HTML' } : {}),
      })),
    });
    if (sent.ok) return { ok: true as const, mode: 'album' as const };
  }

  if (uniquePhotos.length === 1) {
    const sent = await channelApiRequest('sendPhoto', {
      chat_id: chatId,
      photo: uniquePhotos[0],
      caption: shortCaption,
      parse_mode: 'HTML',
    });
    if (sent.ok) return { ok: true as const, mode: 'photo' as const };
  }

  const sent = await channelApiRequest('sendMessage', {
    chat_id: chatId,
    text: caption,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
  return sent.ok ? { ok: true as const, mode: 'text' as const } : { ok: false as const, reason: 'failed' as const };
}
