import { describe, expect, it, vi } from 'vitest';
import { parseTelegramCommand, getTelegramCommandResponse, handleTelegramUpdate } from './telegramBot';

describe('Telegram Bot Server Helper Tests', () => {
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
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
