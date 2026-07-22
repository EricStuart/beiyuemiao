import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createAxisCoordinates, validateBuildingData } from './grid';

describe('Dening Hall grid', () => {
  it('creates ten column lines across nine facade bays', () => {
    expect(createAxisCoordinates(DENING_HALL.bayWidths)).toHaveLength(10);
  });

  it('creates seven column lines across six depth bays', () => {
    expect(createAxisCoordinates(DENING_HALL.depthWidths)).toHaveLength(7);
  });

  it('uses the mirrored pixel-traced spacing from the standard plan', () => {
    expect(DENING_HALL.bayWidths).toEqual([
      24.95, 33.05, 34.9, 33.85, 33.5, 33.85, 34.9, 33.05, 24.95,
    ]);
    expect(DENING_HALL.depthWidths).toEqual([
      24.4, 31.55, 32, 32, 31.55, 24.4,
    ]);

    DENING_HALL.bayWidths.forEach((width, index, widths) => {
      expect(width).toBeCloseTo(widths[widths.length - 1 - index]!, 6);
    });
    DENING_HALL.depthWidths.forEach((width, index, widths) => {
      expect(width).toBeCloseTo(widths[widths.length - 1 - index]!, 6);
    });
  });

  it('keeps the documented total height', () => {
    expect(() => validateBuildingData(DENING_HALL)).not.toThrow();
    expect(DENING_HALL.totalHeight.value).toBe(25.6);
    expect(DENING_HALL.totalHeight.evidence).toBe('documented');
  });

  it('uses the measured column grid and platform dimensions', () => {
    expect(DENING_HALL.planWidth.value).toBeCloseTo(44.03, 5);
    expect(DENING_HALL.planDepth.value).toBeCloseTo(25.98, 5);
    expect(DENING_HALL.platformWidth.value).toBeCloseTo(48.03, 5);
    expect(DENING_HALL.platformDepth.value).toBeCloseTo(31.77, 5);
    expect(DENING_HALL.terraceWidth.value).toBeCloseTo(25.10, 5);
    expect(DENING_HALL.terraceDepth.value).toBeCloseTo(19.86, 5);

    const x = createAxisCoordinates(DENING_HALL.bayWidths, DENING_HALL.planWidth.value);
    const z = createAxisCoordinates(DENING_HALL.depthWidths, DENING_HALL.planDepth.value);
    expect(x.at(-1)! - x[0]!).toBeCloseTo(44.03, 5);
    expect(z.at(-1)! - z[0]!).toBeCloseTo(25.98, 5);
    expect(x[1]! - x[0]!).toBeCloseTo(x.at(-1)! - x.at(-2)!, 5);
    expect(z[1]! - z[0]!).toBeCloseTo(z.at(-1)! - z.at(-2)!, 5);
  });

  it('rejects invalid bay counts', () => {
    expect(() => validateBuildingData({ ...DENING_HALL, bayWidths: [1, 1] })).toThrow(/nine facade bays/i);
  });
});
