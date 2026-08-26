import { getTelegramWebApp } from './telegram';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' | 'select' | 'success' | 'error' | 'warning';

export function haptic(kind: HapticKind = 'light') {
  const hf = getTelegramWebApp()?.HapticFeedback;
  if (!hf) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(kind === 'error' ? 40 : 12); } catch { /* ignore */ }
    }
    return;
  }
  if (kind === 'success' || kind === 'error' || kind === 'warning') hf.notificationOccurred?.(kind);
  else if (kind === 'select') hf.selectionChanged?.();
  else hf.impactOccurred?.(kind);
}

let installed = false;

/** Har bosishda "premium" haptik javob — global delegatsiya orqali. */
export function installGlobalHaptics() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'pointerdown',
    event => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest) return;
      const hit = target.closest('button, a, [role="button"], [data-haptic], input[type="checkbox"], input[type="radio"], select');
      if (!hit) return;
      if ((hit as HTMLButtonElement).disabled) return;
      const custom = hit.getAttribute('data-haptic') as HapticKind | null;
      haptic(custom ?? 'light');
    },
    { passive: true, capture: true },
  );
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
