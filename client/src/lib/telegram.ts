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
