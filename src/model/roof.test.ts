import { describe, expect, it } from 'vitest';
import { createHipRidgePoints, type RoofDimensions } from './roof';
import { evaluateRaisedEaveHeight, evaluateWingLift } from './roof-profile';

describe('hip ridge alignment', () => {
  it('keeps every diagonal ridge sample seated on the roof tiles', () => {
    const dimensions: RoofDimensions = {
      width: 61.8,
      depth: 47.06,
      ridgeLength: 36.43,
      baseY: 8.72,
      ridgeY: 13.8,
      eaveLift: 0.58,
      name: 'test roof',
    };
    const points = createHipRidgePoints(dimensions, 1, 1, 0.16);

    points.forEach((point, index) => {
      const t = 1 - index / (points.length - 1);
      const surfaceY = dimensions.baseY + evaluateRaisedEaveHeight(
        {
          run: dimensions.depth / 2,
          rise: dimensions.ridgeY - dimensions.baseY,
          eaveLift: dimensions.eaveLift,
        },
        t,
      ) + evaluateWingLift(1, t);
      expect(point.y - surfaceY).toBeCloseTo(0.16, 5);
    });
  });
});
