import { describe, expect, it, vi } from 'vitest';
import { accountShareUrl, autoClaimTelegramReferral, getTelegramReferralCode, initTelegramWebApp, referralShareUrl, telegramHaptic } from './telegram';

describe('Telegram Mini App helpers', () => {
  it('creates account share URLs on the current marketplace origin', () => {
    window.history.pushState({}, '', '/accounts');
    expect(accountShareUrl(42)).toBe(`${window.location.origin}/account/42`);
  });

  it('creates bot deep links with a referral startapp payload', () => {
    const url = referralShareUrl('IS42DEMO');
    expect(url).toContain('startapp=ref_IS42DEMO');
    expect(url).toContain('https://t.me/');
  });

  it('extracts a referral code from Telegram start_param and ignores unrelated payloads', () => {
    window.Telegram = { WebApp: { initDataUnsafe: { start_param: 'ref_is42demo' } } };
    expect(getTelegramReferralCode()).toBe('IS42DEMO');
    window.Telegram = { WebApp: { initDataUnsafe: { start_param: 'account_42' } } };
    expect(getTelegramReferralCode()).toBeNull();
  });

  it('auto-claims an authenticated referral once and deduplicates the session marker', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const claim = vi.fn((_input: { code: string }, callbacks: { onSuccess: (result: { reward: number }) => void; onError: (error: { message: string }) => void }) => callbacks.onSuccess({ reward: 2500 }));
    const onSuccess = vi.fn();
    expect(autoClaimTelegramReferral({ isAuthenticated: true, code: 'IS42DEMO', storage, claim, onSuccess })).toBe(true);
    expect(claim).toHaveBeenCalledOnce();
    expect(claim).toHaveBeenCalledWith({ code: 'IS42DEMO' }, expect.any(Object));
    expect(onSuccess).toHaveBeenCalledWith({ reward: 2500 });
    expect(autoClaimTelegramReferral({ isAuthenticated: true, code: 'IS42DEMO', storage, claim })).toBe(false);
    expect(claim).toHaveBeenCalledOnce();
  });

  it('marks invalid or duplicate referral responses so failed claims are not retried in a loop', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const claim = vi.fn((_input: { code: string }, callbacks: { onSuccess: (result: { reward: number }) => void; onError: (error: { message: string }) => void }) => callbacks.onError({ message: 'Referral already claimed' }));
    const onError = vi.fn();
    expect(autoClaimTelegramReferral({ isAuthenticated: true, code: 'IS42DEMO', storage, claim, onError })).toBe(true);
    expect(onError).toHaveBeenCalledWith({ message: 'Referral already claimed' });
    expect(autoClaimTelegramReferral({ isAuthenticated: true, code: 'IS42DEMO', storage, claim })).toBe(false);
  });

  it('deduplicates self-referral errors through session storage', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const claim = vi.fn((_input: { code: string }, callbacks: { onSuccess: (result: { reward: number }) => void; onError: (error: { message: string }) => void }) => callbacks.onError({ message: 'O‘zingizning referral kodingizdan foydalana olmaysiz' }));
    const onError = vi.fn();
    expect(autoClaimTelegramReferral({ isAuthenticated: true, code: 'SELF42', storage, claim, onError })).toBe(true);
    expect(onError).toHaveBeenCalledOnce();
    expect(autoClaimTelegramReferral({ isAuthenticated: true, code: 'SELF42', storage, claim, onError })).toBe(false);
    expect(claim).toHaveBeenCalledOnce();
  });

  it('initializes Telegram navigation colors and haptic feedback safely', () => {
    const ready = vi.fn();
    const expand = vi.fn();
    const setHeaderColor = vi.fn();
    const setBackgroundColor = vi.fn();
    const impactOccurred = vi.fn();
    window.Telegram = { WebApp: { ready, expand, setHeaderColor, setBackgroundColor, HapticFeedback: { impactOccurred } } };

    expect(initTelegramWebApp()).toBe(window.Telegram.WebApp);
    expect(ready).toHaveBeenCalledOnce();
    expect(expand).toHaveBeenCalledOnce();
    expect(setHeaderColor).toHaveBeenCalledWith('#08090b');
    expect(setBackgroundColor).toHaveBeenCalledWith('#08090b');
    telegramHaptic('light');
    expect(impactOccurred).toHaveBeenCalledWith('light');
  });
});
