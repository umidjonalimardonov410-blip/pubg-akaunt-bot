import { COOKIE_NAME } from '@shared/const';

export type TelegramThemeParams = {
  bg_color?: string;
  secondary_bg_color?: string;
  text_color?: string;
  hint_color?: string;
  button_color?: string;
  button_text_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
};

export type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { start_param?: string; user?: { id?: number; first_name?: string; username?: string } };
  colorScheme?: 'light' | 'dark';
  themeParams?: TelegramThemeParams;
  isVersionAtLeast?: (version: string) => boolean;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton?: { isVisible?: boolean; show?: () => void; hide?: () => void; onClick?: (callback: () => void) => void; offClick?: (callback: () => void) => void };
  MainButton?: { text?: string; color?: string; textColor?: string; isVisible?: boolean; show?: () => void; hide?: () => void; setText?: (text: string) => void; onClick?: (callback: () => void) => void; offClick?: (callback: () => void) => void; enable?: () => void; disable?: () => void };
  HapticFeedback?: { impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void; notificationOccurred?: (type: 'error' | 'success' | 'warning') => void; selectionChanged?: () => void };
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;
  webApp.ready?.();
  webApp.expand?.();
  webApp.setHeaderColor?.('#08090b');
  webApp.setBackgroundColor?.('#08090b');
  // Telegram mini-app'da pastki menyu sakrab ketmasligi uchun:
  // vertikal swipe bilan yopilishni o'chiramiz va viewport balandligini CSS o'zgaruvchiga yozamiz.
  (webApp as any).disableVerticalSwipes?.();
  const syncViewport = () => {
    const height = (webApp as any).viewportStableHeight ?? (webApp as any).viewportHeight;
    if (typeof height === 'number' && height > 0) {
      document.documentElement.style.setProperty('--tg-viewport-height', `${height}px`);
    }
  };
  syncViewport();
  (webApp as any).onEvent?.('viewportChanged', syncViewport);
  return webApp;
}

export function telegramHaptic(kind: 'light' | 'success' | 'error' = 'light') {
  const haptic = getTelegramWebApp()?.HapticFeedback;
  if (!haptic) return;
  if (kind === 'success' || kind === 'error') haptic.notificationOccurred?.(kind);
  else haptic.impactOccurred?.('light');
}

export function shareTelegramText(text: string, url = window.location.href) {
  const webApp = getTelegramWebApp();
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  if (webApp?.openTelegramLink) webApp.openTelegramLink(shareUrl);
  else if (typeof window !== 'undefined') window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

export function accountShareUrl(accountId: number) {
  return `${window.location.origin}/account/${accountId}`;
}

export function referralShareUrl(code: string) {
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'InfernoStealthBot';
  return `https://t.me/${botUsername}?startapp=ref_${encodeURIComponent(code)}`;
}

export function getTelegramReferralCode() {
  const webApp = getTelegramWebApp();
  const query = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('startapp');
  const raw = webApp?.initDataUnsafe?.start_param || query || '';
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { return null; }
  if (!decoded.toLowerCase().startsWith('ref_')) return null;
  const code = decoded.slice(4).trim().toUpperCase();
  return /^[A-Z0-9_-]{4,64}$/.test(code) ? code : null;
}

export function autoClaimTelegramReferral({
  isAuthenticated,
  code,
  storage,
  claim,
  onSuccess,
  onError,
}: {
  isAuthenticated: boolean;
  code: string | null;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  claim: (input: { code: string }, callbacks: { onSuccess: (result: { reward: number }) => void; onError: (error: { message: string }) => void }) => void;
  onSuccess?: (result: { reward: number }) => void;
  onError?: (error: { message: string }) => void;
}) {
  if (!isAuthenticated || !code) return false;
  const marker = `inferno-referral-claimed:${code}`;
  if (storage.getItem(marker)) return false;
  claim({ code }, {
    onSuccess: result => { storage.setItem(marker, '1'); onSuccess?.(result); },
    onError: error => { storage.setItem(marker, '1'); onError?.(error); },
  });
  return true;
}


export const TELEGRAM_SESSION_STORAGE_KEY = 'manus-cookie';

/** Telegram WebView blocks third-party cookies, so mirror the session token for the Bearer fallback. */
export function storeTelegramSessionToken(sessionToken?: string | null) {
  if (!sessionToken) return false;
  try {
    sessionStorage.setItem(TELEGRAM_SESSION_STORAGE_KEY, `${COOKIE_NAME}=${sessionToken}`);
    return true;
  } catch {
    return false;
  }
}

export async function authenticateTelegramWebApp(webApp = getTelegramWebApp()) {
  const initData = webApp?.initData;
  const userId = webApp?.initDataUnsafe?.user?.id;
  if (!initData || !userId) return { ok: false as const, status: 'not_available' as const };
  try {
    const response = await fetch('/api/telegram/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ initData }),
    });
    if (!response.ok) return { ok: false as const, status: 'failed' as const };
    const payload = (await response.json().catch(() => null)) as { sessionToken?: string } | null;
    storeTelegramSessionToken(payload?.sessionToken);
    return { ok: true as const, status: 'active' as const };
  } catch {
    return { ok: false as const, status: 'failed' as const };
  }
}

/** One-time login token issued by the bot after the user shares their phone number. */
export function readTelegramLoginToken() {
  if (typeof window === 'undefined') return null;
  const fromQuery = new URLSearchParams(window.location.search).get('tglogin');
  if (fromQuery) return fromQuery;
  const startParam = getTelegramWebApp()?.initDataUnsafe?.start_param || '';
  return startParam.startsWith('tglogin_') ? startParam.slice('tglogin_'.length) : null;
}

export async function exchangeTelegramLoginToken(token: string) {
  try {
    const response = await fetch('/api/telegram/token-auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    if (!response.ok) return { ok: false as const, status: 'failed' as const };
    const payload = (await response.json().catch(() => null)) as { sessionToken?: string } | null;
    storeTelegramSessionToken(payload?.sessionToken);
    return { ok: true as const, status: 'active' as const };
  } catch {
    return { ok: false as const, status: 'failed' as const };
  }
}

/** Opens the bot chat where the persistent keyboard offers the phone-number login button. */
export function getTelegramPhoneLoginUrl() {
  const username = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
  return username ? `https://t.me/${username}?start=login` : 'https://t.me/';
}

export function getTelegramMiniAppLaunchUrl() {
  const username = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
  return username ? `https://t.me/${username}?startapp=market` : 'https://t.me/';
}
