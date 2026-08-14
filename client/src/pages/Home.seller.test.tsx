import { describe, expect, it } from 'vitest';
import { buildSellerAccountPayload, createEmptySellerForm, validateSellerForm } from './Home';

describe('seller account creation helpers', () => {
  it('rejects incomplete account details before any media upload begins', () => {
    const form = createEmptySellerForm();

    expect(validateSellerForm(form)).toBe('PUBG akkaunt ID sini kiriting.');
  });

  it('builds the complete account payload with image gallery and optional video', () => {
    const form = createEmptySellerForm();
    Object.assign(form, {
      accountId: '5123456789',
      playerName: 'Inferno Test',
      level: '72',
      region: 'KRJP',
      kdRatio: '4.20',
      winRate: '58',
      totalMatches: '1400',
      headshotPercentage: '31',
      ucBalance: '5200',
      outfitCount: '120',
      gunSkinCount: '88',
      vehicleCount: '14',
      accountCreatedYear: '2021',
      price: '1250000',
      description: 'To‘liq inventar va xavfsiz topshirish.',
      skins: 'M416 Glacier, X-Suit',
      hasConquerorHistory: true,
      hasXSuit: true,
    });

    expect(validateSellerForm(form)).toBeNull();
    expect(buildSellerAccountPayload(form, [
      { url: 'https://cdn.example.com/one.jpg', type: 'image/jpeg' },
      { url: 'https://cdn.example.com/two.webp', type: 'image/webp' },
      { url: 'https://cdn.example.com/proof.mp4', type: 'video/mp4' },
    ])).toEqual({
      accountId: '5123456789',
      playerName: 'Inferno Test',
      level: 72,
      region: 'KRJP',
      kdRatio: 4.2,
      winRate: 58,
      totalMatches: 1400,
      headshotPercentage: 31,
      ucBalance: 5200,
      outfitCount: 120,
      gunSkinCount: 88,
      vehicleCount: 14,
      hasConquerorHistory: true,
      hasXSuit: true,
      accountCreatedYear: 2021,
      featuredSkins: ['M416 Glacier', 'X-Suit'],
      price: 1250000,
      description: 'To‘liq inventar va xavfsiz topshirish.',
      thumbnailUrl: 'https://cdn.example.com/one.jpg',
      galleryUrls: ['https://cdn.example.com/one.jpg', 'https://cdn.example.com/two.webp'],
      videoUrl: 'https://cdn.example.com/proof.mp4',
    });
  });
});
