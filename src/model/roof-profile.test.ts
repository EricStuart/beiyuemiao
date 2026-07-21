import { describe, expect, it } from 'vitest';
import { sampleRaisedEaveProfile } from './roof-profile';

describe('raised eave roof profile', () => {
  it('rises monotonically from eave to ridge', () => {
    const points = sampleRaisedEaveProfile({ run: 10, rise: 5.2, eaveLift: 0.55 }, 12);
    expect(points[0]?.y).toBeCloseTo(0.55);
    expect(points.at(-1)?.y).toBeCloseTo(5.2);
    expect(points.every((point, index) => index === 0 || point.y >= (points[index - 1]?.y ?? 0))).toBe(true);
  });

  it('keeps the eave shallower than the upper slope', () => {
    const points = sampleRaisedEaveProfile({ run: 10, rise: 5.2, eaveLift: 0.55 }, 12);
    expect((points[1]?.y ?? 0) - (points[0]?.y ?? 0)).toBeLessThan(
      (points[11]?.y ?? 0) - (points[10]?.y ?? 0),
    );
  });

  it('rejects invalid roof runs', () => {
    expect(() => sampleRaisedEaveProfile({ run: 0, rise: 5, eaveLift: 0.4 }, 8)).toThrow(/run/i);
  });
});
