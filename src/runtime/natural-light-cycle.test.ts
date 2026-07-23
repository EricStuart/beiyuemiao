import { describe, expect, it } from 'vitest';
import { evaluateNaturalLightCycle, NATURAL_LIGHT_CYCLE_MS } from './natural-light-cycle';

describe('natural light cycle', () => {
  it('closes cleanly after one complete cycle', () => {
    const start = evaluateNaturalLightCycle(0);
    const end = evaluateNaturalLightCycle(NATURAL_LIGHT_CYCLE_MS);

    expect(end.phase).toBeCloseTo(start.phase, 8);
    expect(end.position.x).toBeCloseTo(start.position.x, 8);
    expect(end.position.y).toBeCloseTo(start.position.y, 8);
    expect(end.position.z).toBeCloseTo(start.position.z, 8);
    expect(end.intensity).toBeCloseTo(start.intensity, 8);
    expect(end.color).toBe(start.color);
  });

  it('keeps the moving sun above the horizon throughout the cycle', () => {
    const samples = Array.from({ length: 16 }, (_, index) => (
      evaluateNaturalLightCycle((NATURAL_LIGHT_CYCLE_MS * index) / 16)
    ));

    expect(samples.every((sample) => sample.position.y >= 42)).toBe(true);
  });

  it('changes sun direction, intensity, fill light, and color over time', () => {
    const start = evaluateNaturalLightCycle(0);
    const quarter = evaluateNaturalLightCycle(NATURAL_LIGHT_CYCLE_MS / 4);

    expect(quarter.position.x).not.toBeCloseTo(start.position.x, 3);
    expect(quarter.position.z).not.toBeCloseTo(start.position.z, 3);
    expect(quarter.intensity).toBeGreaterThan(start.intensity);
    expect(quarter.fillIntensity).toBeGreaterThan(start.fillIntensity);
    expect(quarter.color).not.toBe(start.color);
  });
});
