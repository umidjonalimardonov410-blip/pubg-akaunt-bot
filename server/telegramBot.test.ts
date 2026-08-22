import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMarketplaceSearchFilters, handleTelegramUpdate, parseMarketplacePageData, parseTelegramCommand, getTelegramCommandResponse } from './telegramBot';

describe('Telegram Bot Server Helper Tests', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_MINI_APP_URL = 'https://example.com';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_MINI_APP_URL;
  });

  it('parses commands correctly from messages', () => {
    expect(parseTelegramCommand('/start')).toBe('start');
    expect(parseTelegramCommand('/buy@PUBG_TradeBot')).toBe('buy');
    expect(parseTelegramCommand('   /wallet   ')).toBe('wallet');
    expect(parseTelegramCommand('hello')).toBe('hello');
  });

  it('returns valid command responses for registered commands', () => {
    const startRes = getTelegramCommandResponse('start');
    expect(startRes.title).toContain('Inferno Stealth');
    expect(startRes.path).toBe('/');

    const buyRes = getTelegramCommandResponse('buy');
    expect(buyRes.title).toContain('Akkauntlar bozori');
    expect(buyRes.path).toBe('/accounts');
    expect(buyRes.text.length).toBeGreaterThan(10);

    const listingsRes = getTelegramCommandResponse('mylistings');
    expect(listingsRes.title).toContain('Mening e’lonlarim');
    expect(listingsRes.path).toBe('/profile');

    const adminRes = getTelegramCommandResponse('admin', '999');
    expect(adminRes.title).toContain('Ruxsat cheklangan');

    const unknownRes = getTelegramCommandResponse('unknown');
    expect(unknownRes.title).toContain('Inferno Stealth yordam');
  });

  it('handles telegram update for /start command successfully', async () => {
    // Mock global fetch for Telegram sendMessage API call
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const update = {
      update_id: 1001,
      message: {
        message_id: 1,
        chat: { id: 12345, type: 'private' },
        from: { id: 12345, first_name: 'TestUser', username: 'testuser' },
        text: '/start',
      },
    };

    const result = await handleTelegramUpdate(update);
    expect(result.status).toBe('active');
    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/sendChatAction');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/sendMessage');
    const menuBody = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(menuBody.reply_markup.keyboard.length).toBeGreaterThan(1);
    expect(menuBody.reply_markup.keyboard[0][0].web_app.url).toContain('example.com');

  });

  it('opens the seller listing manager from the persistent Telegram button', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 125 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleTelegramUpdate({
      update_id: 1003,
      message: { chat: { id: 12345, type: 'private' }, from: { id: 12345 }, text: '🧾 E’lonlarim' },
    });

    expect(result.command).toBe('mylistings');
    const sendBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(sendBody.reply_markup.inline_keyboard[0][0].web_app.url).toBe('https://example.com/profile');
  });

  it('opens the inline marketplace search menu with quick price and category buttons', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 126 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleTelegramUpdate({
      update_id: 1004,
      message: { chat: { id: 12345, type: 'private' }, from: { id: 12345 }, text: '🛒 Bozor' },
    });

    expect(result.command).toBe('buy');
    const sendBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    const labels = sendBody.reply_markup.inline_keyboard.flat().map((button: { text: string }) => button.text);
    expect(labels).toContain('💰 0–500 ming');
    expect(labels).toContain('🏆 Pro / X-Suit');
    expect(labels).toContain('📱 Tanlangan bozorni ochish');
  });

  it('turns an inline price callback into a pre-filtered Mini App deep link', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 127 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleTelegramUpdate({
      update_id: 1005,
      callback_query: {
        id: 'callback-1005',
        data: 'market_filter:price:0:500000',
        message: { chat: { id: 12345, type: 'private' } },
      },
    });

    expect(result.command).toBe('market_filter');
    expect(result.path).toBe('/accounts?maxPrice=500000');
    const sendBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(sendBody.reply_markup.inline_keyboard[3][1].web_app.url).toBe('https://example.com/accounts?maxPrice=500000');
  });

  it('parses safe marketplace page callbacks and preserves only supported filters', () => {
    expect(parseMarketplacePageData('market_page:2:%2Faccounts%3FminPrice%3D500000%26maxPrice%3D2000000%26category%3Dpro')).toEqual({ page: 2, path: '/accounts?minPrice=500000&maxPrice=2000000&category=pro' });
    expect(parseMarketplacePageData('market_page:0:%2Fadmin')).toBeNull();
    expect(getMarketplaceSearchFilters('/accounts?minPrice=500000&maxPrice=2000000&category=pro&ignored=x')).toEqual({ minPrice: 500000, maxPrice: 2000000, category: 'pro' });
    expect(getMarketplaceSearchFilters('/accounts?category=unknown')).toEqual({});
  });

  it('accepts the user own shared phone contact and shows the persistent menu', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 124 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleTelegramUpdate({
      update_id: 1002,
      message: {
        chat: { id: 12345, type: 'private' },
        from: { id: 12345 },
        contact: { user_id: 12345, phone_number: '+998901234567' },
      },
    });

    expect(result.command).toBe('contact');
    const sendBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(sendBody.reply_markup.inline_keyboard[0][0].web_app.url).toContain('/profile');
    const menuBody = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(menuBody.reply_markup.keyboard.length).toBeGreaterThan(1);
    expect(menuBody.reply_markup.keyboard[0][0].web_app.url).toContain('example.com');

  });
});
