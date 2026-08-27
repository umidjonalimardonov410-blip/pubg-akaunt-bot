import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleTelegramUpdate } from './telegramBot';
import { buildSoldPostCaption, getChannelUrl, postSoldAccountToChannel } from './telegramChannel';

describe('Majburiy kanal obunasi', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_MINI_APP_URL = 'https://example.com';
    process.env.TELEGRAM_FORCE_SUBSCRIBE = 'true';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_MINI_APP_URL;
    delete process.env.TELEGRAM_FORCE_SUBSCRIBE;
  });

  it('obuna bo‘lmagan foydalanuvchiga kanal havolasini yuboradi', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/getChatMember')) {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, result: { status: 'left' } }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ ok: true, result: { message_id: 1 } }) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result: any = await handleTelegramUpdate({
      update_id: 1,
      message: { chat: { id: 555, type: 'private' }, from: { id: 555 }, text: '/start' },
    } as any);

    expect(result.command).toBe('force_subscribe');
    const gateCall = fetchMock.mock.calls.find(call => String(call[0]).includes('/sendMessage'));
    const body = JSON.parse(String(gateCall?.[1]?.body));
    expect(body.text).toContain('KANALGA OBUNA BO‘LING');
    expect(body.text).toContain('sotilgan PUBG akkauntlar');
    expect(body.reply_markup.inline_keyboard[0][0].url).toBe(getChannelUrl());
    expect(JSON.stringify(body.reply_markup)).toContain('check_sub');
  });

  it('obuna bo‘lgan foydalanuvchini o‘tkazadi', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/getChatMember')) {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, result: { status: 'member' } }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ ok: true, result: { message_id: 1 } }) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result: any = await handleTelegramUpdate({
      update_id: 2,
      message: { chat: { id: 556, type: 'private' }, from: { id: 556 }, text: '/start' },
    } as any);

    expect(result.command).toBe('start');
  });
});

describe('Sotildi posti', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it('pro darajali matn tuzadi', () => {
    const caption = buildSoldPostCaption({
      accountId: 7,
      orderId: 42,
      title: 'InfernoKing',
      level: 72,
      kdRatio: 4.21,
      winRate: 31.5,
      ucBalance: 12000,
      hasXSuit: true,
      featuredSkins: ['M416 Glacier'],
      price: 1500000,
    });
    expect(caption).toContain('AKKAUNT SOTILDI');
    expect(caption).toContain('InfernoKing');
    expect(caption).toContain('M416 Glacier');
    expect(caption).toContain('#42');
  });

  it('video bo‘lsa sendVideo ishlatadi', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, result: {} }) });
    vi.stubGlobal('fetch', fetchMock);
    const result = await postSoldAccountToChannel({
      accountId: 1,
      price: 100000,
      videoUrl: 'https://cdn.example.com/a.mp4',
      thumbnailUrl: 'https://cdn.example.com/a.jpg',
    });
    expect(result.ok).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/sendVideo');
  });
});
