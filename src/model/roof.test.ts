import { Box3, CylinderGeometry, Mesh, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createBuildingMaterials } from './materials';
import { createHipRidgePoints, createRoofs, type RoofDimensions } from './roof';
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

  it('keeps only the main ridge cylinder on each roof level', () => {
    const roofs = createRoofs(
      DENING_HALL,
      createBuildingMaterials(DENING_HALL),
      'high',
    );

    roofs.children.forEach((roofLevel) => {
      const directCylinders = roofLevel.children.filter(
        (child) => child instanceof Mesh && child.geometry instanceof CylinderGeometry,
      );
      expect(directCylinders).toHaveLength(1);
    });
  });

  it('seats two mirrored chiwen ornaments on the upper main ridge', () => {
    const roofs = createRoofs(
      DENING_HALL,
      createBuildingMaterials(DENING_HALL),
      'high',
    );
    const lowerRoof = roofs.children[0]!;
    const upperRoof = roofs.children[1]!;
    const findChiwen = (root: Object3D): Object3D[] => {
      const matches: Object3D[] = [];
      root.traverse((child) => {
        if (child.userData.kind === 'chiwen') matches.push(child);
      });
      return matches;
    };
    const lowerChiwen = findChiwen(lowerRoof);
    const upperChiwen = findChiwen(upperRoof);
    const mainRidge = upperRoof.children.find(
      (child) => child instanceof Mesh && child.geometry instanceof CylinderGeometry,
    );

    expect(lowerChiwen).toHaveLength(0);
    expect(upperChiwen).toHaveLength(2);
    expect(mainRidge).toBeDefined();
    const [left, right] = upperChiwen.sort((a, b) => a.position.x - b.position.x);
    expect(left!.position.x).toBeCloseTo(-right!.position.x, 5);
    const ridgeBounds = new Box3().setFromObject(mainRidge!);
    upperChiwen.forEach((chiwen) => {
      const bounds = new Box3().setFromObject(chiwen);
      expect(bounds.min.y).toBeLessThanOrEqual(ridgeBounds.max.y + 0.1);
      expect(bounds.min.x).toBeLessThan(ridgeBounds.max.x);
      expect(bounds.max.x).toBeGreaterThan(ridgeBounds.min.x);
    });
  });
});
