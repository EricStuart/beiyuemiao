import { describe, expect, it } from 'vitest';
import { selectQuality } from './capabilities';

describe('quality selection', () => {
  it('uses low detail for narrow low-memory devices', () => {
    expect(selectQuality({ width: 390, pixelRatio: 3, deviceMemory: 2 })).toBe('low');
  });

  it('uses high detail for desktop devices', () => {
    expect(selectQuality({ width: 1440, pixelRatio: 1.5, deviceMemory: 8 })).toBe('high');
  });

  it('uses medium detail for ordinary tablets', () => {
    expect(selectQuality({ width: 820, pixelRatio: 2, deviceMemory: 4 })).toBe('medium');
  });
});
