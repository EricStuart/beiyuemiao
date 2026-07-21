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

  it('keeps the documented total height', () => {
    expect(() => validateBuildingData(DENING_HALL)).not.toThrow();
    expect(DENING_HALL.totalHeight.value).toBe(25.6);
    expect(DENING_HALL.totalHeight.evidence).toBe('documented');
  });

  it('rejects invalid bay counts', () => {
    expect(() => validateBuildingData({ ...DENING_HALL, bayWidths: [1, 1] })).toThrow(/nine facade bays/i);
  });
});
