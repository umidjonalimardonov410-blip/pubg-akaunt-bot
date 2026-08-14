import { describe, expect, it } from 'vitest';
import { derivedPubgAccountCategory } from './db';

describe('public marketplace category derivation', () => {
  it('classifies X-Suit accounts as Pro first', () => {
    expect(derivedPubgAccountCategory({ hasXSuit: true, hasConquerorHistory: true })).toBe('pro');
  });

  it('classifies Conqueror-history accounts when they do not have X-Suit', () => {
    expect(derivedPubgAccountCategory({ hasXSuit: false, hasConquerorHistory: true })).toBe('conqueror');
  });

  it('keeps ordinary available accounts in the Classic category', () => {
    expect(derivedPubgAccountCategory({ hasXSuit: false, hasConquerorHistory: false })).toBe('classic');
    expect(derivedPubgAccountCategory({})).toBe('classic');
  });
});
