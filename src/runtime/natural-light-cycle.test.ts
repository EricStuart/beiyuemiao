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

  it('keeps every sample inside the bright frontal arc', () => {
    const samples = Array.from({ length: 32 }, (_, index) => (
      evaluateNaturalLightCycle((NATURAL_LIGHT_CYCLE_MS * index) / 32)
    ));

    samples.forEach((sample) => {
      const frontalAngle = Math.abs(Math.atan2(sample.position.x, sample.position.z));
      expect(sample.position.z).toBeGreaterThan(50);
      expect(frontalAngle).toBeLessThanOrEqual((Math.PI * 25) / 180 + 1e-6);
      expect(sample.position.y).toBeGreaterThanOrEqual(60);
      expect(sample.intensity).toBeGreaterThanOrEqual(3.65);
      expect(sample.intensity).toBeLessThanOrEqual(3.9);
      expect(sample.fillIntensity).toBeGreaterThanOrEqual(2.35);
    });
  });

  it('moves from the bright center to both frontal sides and back', () => {
    const center = evaluateNaturalLightCycle(0);
    const quarter = evaluateNaturalLightCycle(NATURAL_LIGHT_CYCLE_MS / 4);
    const half = evaluateNaturalLightCycle(NATURAL_LIGHT_CYCLE_MS / 2);
    const threeQuarter = evaluateNaturalLightCycle((NATURAL_LIGHT_CYCLE_MS * 3) / 4);

    expect(center.position.x).toBeCloseTo(0, 5);
    expect(quarter.position.x).toBeLessThan(0);
    expect(threeQuarter.position.x).toBeGreaterThan(0);
    expect(half.position.x).toBeCloseTo(center.position.x, 5);
    expect(half.position.z).toBeCloseTo(center.position.z, 5);
    expect(center.intensity).toBeGreaterThan(quarter.intensity);
    expect(center.fillIntensity).toBeGreaterThan(quarter.fillIntensity);
    expect(center.color).not.toBe(quarter.color);
  });
});
