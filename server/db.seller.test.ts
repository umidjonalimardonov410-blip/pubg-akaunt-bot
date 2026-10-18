import { describe, it, expect } from 'vitest';
import { withPublicSeller } from './db';
describe('listing seller identity', () => {
 it('uses the listing owner name and verified state', () => { expect(withPublicSeller({sellerId: 7}, {id: 7, name: 'Umidjon', isVerifiedSeller: true})).toEqual({sellerId: 7, sellerName: 'Umidjon', sellerVerified: true}); });
 it('never attributes another person to the listing', () => { expect(withPublicSeller({sellerId: 7}, {id: 8, name: 'Other', isVerifiedSeller: true})).toEqual({sellerId: 7, sellerName: null, sellerVerified: false}); });
});
