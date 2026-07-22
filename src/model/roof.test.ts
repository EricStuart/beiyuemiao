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
      const t = index / (points.length - 1);
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

  it('uses a truncated lower roof with four closed hip ridges and no main ridge', () => {
    const roofs = createRoofs(
      DENING_HALL,
      createBuildingMaterials(DENING_HALL),
      'high',
    );
    const lower = roofs.children.find((child) => child.name === '下檐庑殿顶')!;
    const mainRidges: Object3D[] = [];
    const hipRidges: Object3D[] = [];
    lower.traverse((child) => {
      if (child.userData.kind === 'main-ridge') mainRidges.push(child);
      if (child.userData.kind === 'hip-ridge') hipRidges.push(child);
    });

    expect(mainRidges).toHaveLength(0);
    expect(hipRidges).toHaveLength(4);
    expect(lower.userData.roofForm).toBe('truncated-hip');
  });

  it('keeps one main ridge on the upper roof only', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;
    const directCylinders = upper.children.filter(
      (child) => child instanceof Mesh && child.geometry instanceof CylinderGeometry,
    );
    expect(directCylinders).toHaveLength(1);
    expect(directCylinders[0]!.userData.kind).toBe('main-ridge');
  });

  it('ends truncated hip ridges at the rectangular upper boundary', () => {
    const dimensions: RoofDimensions = {
      width: 53.03,
      depth: 34.98,
      ridgeLength: 32.94,
      topWidth: 32.94,
      topDepth: 17.1,
      baseY: 8.72,
      ridgeY: 13.05,
      eaveLift: 0.58,
      ridgeStyle: 'truncated',
      name: 'test truncated roof',
    };
    const points = createHipRidgePoints(dimensions, 1, 1, 0.16);
    const last = points.at(-1)!;
    expect(last.x).toBeCloseTo(dimensions.topWidth! / 2, 5);
    expect(last.z).toBeCloseTo(dimensions.topDepth! / 2, 5);
    expect(last.y).toBeGreaterThan(dimensions.baseY);
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
