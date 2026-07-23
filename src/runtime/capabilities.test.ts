import { describe, expect, it } from 'vitest';
import { selectQuality } from './capabilities';

describe('quality selection', () => {
  it.each([
    ['narrow low-memory phone', { width: 390, pixelRatio: 3, deviceMemory: 2 }],
    ['ordinary tablet', { width: 820, pixelRatio: 2, deviceMemory: 4 }],
    ['desktop', { width: 1440, pixelRatio: 1.5, deviceMemory: 8 }],
  ])('uses high detail for %s', (_label, profile) => {
    expect(selectQuality(profile)).toBe('high');
  });
});
