import { describe, expect, it } from 'vitest';
import { ORBIT_CONTROL_LIMITS } from './orbit-config';

describe('orbit control limits', () => {
  it('allows a low camera to look up at the hall', () => {
    expect(ORBIT_CONTROL_LIMITS.minPolarAngle).toBeGreaterThanOrEqual(0);
    expect(ORBIT_CONTROL_LIMITS.maxPolarAngle).toBeGreaterThan(Math.PI / 2);
    expect(ORBIT_CONTROL_LIMITS.maxPolarAngle).toBeLessThanOrEqual(Math.PI * 0.56);
  });
});
