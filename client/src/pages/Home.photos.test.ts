import { describe, it, expect } from 'vitest';
import { normalizeAccount, validateSellerMediaFiles } from './Home';
describe('real listing photos', () => {
 it('keeps bot-named real uploads and parses stored galleries', () => {
  const row = normalizeAccount({id: 7, thumbnailUrl: 'https://cdn.test/bot-photo.jpg', galleryUrls: '["https://cdn.test/second.jpg","https://cdn.test/second.jpg"]'});
  expect(row.image).toBe('https://cdn.test/bot-photo.jpg');
  expect(row.galleryUrls).toEqual(['https://cdn.test/bot-photo.jpg', 'https://cdn.test/second.jpg']);
 });
 it('does not substitute an unrelated stock photo', () => { expect(normalizeAccount({id: 8}).image).toBe(''); });
 it('rejects undecodable HEIC instead of promising a successful upload', () => { expect(validateSellerMediaFiles([{ type: 'image/heic', size: 100 }])).not.toBeNull(); });
});
