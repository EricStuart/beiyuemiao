import { Box3, CylinderGeometry, Mesh, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createBuildingMaterials } from './materials';
import {
  createHipRidgePoints,
  createRoofs,
  UPPER_ROOF_BASE_Y,
  type RoofDimensions,
} from './roof';
import { evaluateRaisedEaveHeight, evaluateWingLift } from './roof-profile';

describe('hip ridge alignment', () => {
  it('uses faded yellow tiles and aged green diamond tiles', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    expect(materials.tile.color.getHex()).toBe(0xa89163);
    expect(materials.tileRib.color.getHex()).toBe(0x8d7955);
    expect(materials.diamondTile.color.getHex()).toBe(0x55745a);
    expect(materials.tile.roughness).toBeGreaterThan(0.85);
  });

  it('covers both roof levels with instanced faded tiles', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const coverings = roofs.children.map((roof) => roof.getObjectByName('坡面筒瓦覆盖'));
    expect(coverings.every(Boolean)).toBe(true);
    coverings.forEach((covering) => {
      expect(covering!.userData.kind).toBe('roof-tile-covering');
      expect(covering!.userData.instanceCount).toBeGreaterThan(400);
      expect(covering!.userData.surfaceOffset).toBeGreaterThanOrEqual(0.07);
    });
  });

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
      (child) => child instanceof Mesh
        && child.geometry instanceof CylinderGeometry
        && child.userData.kind === 'main-ridge',
    );
    expect(directCylinders).toHaveLength(1);
    expect(directCylinders[0]!.userData.kind).toBe('main-ridge');
  });

  it('lowers the complete upper roof while preserving its profile', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;

    expect(UPPER_ROOF_BASE_Y).toBeCloseTo(13.5, 5);
    expect(upper.userData.baseY).toBeCloseTo(13.5, 5);
    expect(upper.userData.ridgeY).toBeCloseTo(DENING_HALL.upperRidgeHeight - 2.5, 5);
  });

  it('exposes the upper front eave boundary for mounted facade ornaments', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;
    const expectedFrontEaveZ = (DENING_HALL.planDepth.value * 0.68 + 7) / 2;

    expect(upper.userData.frontEaveZ).toBeCloseTo(expectedFrontEaveZ, 5);
  });

  it('adds four seated ornaments at the middle of the upper hip ridges', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;
    const ornaments = upper.children.filter(
      (child) => child.userData.kind === 'mid-ridge-ornament',
    );
    const hipRidges = upper.children.filter((child) => child.userData.kind === 'hip-ridge');

    expect(ornaments).toHaveLength(4);
    ornaments.forEach((ornament) => {
      const hip = hipRidges.find(
        (ridge) => ridge.userData.xSide === ornament.userData.xSide
          && ridge.userData.zSide === ornament.userData.zSide,
      );
      expect(hip).toBeDefined();
      expect(new Box3().setFromObject(ornament).intersectsBox(
        new Box3().setFromObject(hip!),
      )).toBe(true);
    });
  });

  it('adds four seated ornaments at the middle of the lower hip ridges', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const lower = roofs.children.find((child) => child.name === '下檐庑殿顶')!;
    const ornaments = lower.children.filter(
      (child) => child.userData.kind === 'mid-ridge-ornament'
        && child.userData.level === 'lower',
    );
    const hipRidges = lower.children.filter((child) => child.userData.kind === 'hip-ridge');

    expect(ornaments).toHaveLength(4);
    ornaments.forEach((ornament) => {
      const hip = hipRidges.find(
        (ridge) => ridge.userData.xSide === ornament.userData.xSide
          && ridge.userData.zSide === ornament.userData.zSide,
      );
      expect(hip).toBeDefined();
      expect(new Box3().setFromObject(ornament).intersectsBox(
        new Box3().setFromObject(hip!),
      )).toBe(true);
    });
  });

  it('uses a vertically thicker top ridge and ridge band', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;
    const main = upper.children.find((child) => child.userData.kind === 'main-ridge')!;
    const band = upper.children.find((child) => child.userData.kind === 'ridge-band')!;
    const mainSize = new Box3().setFromObject(main).getSize(new Vector3());
    const bandSize = new Box3().setFromObject(band).getSize(new Vector3());

    expect(mainSize.y).toBeGreaterThan(0.8);
    expect(bandSize.y).toBeGreaterThan(0.7);
  });

  it('seats thicker chiwen bases directly on the main ridge ends', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;
    const main = upper.children.find((child) => child.userData.kind === 'main-ridge')!;
    const chiwen = upper.children.filter((child) => child.userData.kind === 'chiwen');
    const mainBounds = new Box3().setFromObject(main);

    expect(chiwen).toHaveLength(2);
    chiwen.forEach((ornament) => {
      const bases: Object3D[] = [];
      ornament.traverse((child) => {
        if (child.userData.kind === 'chiwen-base') bases.push(child);
      });
      expect(bases).toHaveLength(1);
      ornament.updateWorldMatrix(true, false);
      const baseBounds = new Box3().setFromObject(bases[0]!);
      expect(baseBounds.getSize(new Vector3()).y).toBeGreaterThan(0.3);
      expect(baseBounds.intersectsBox(mainBounds)).toBe(true);
      const ornamentBounds = new Box3().setFromObject(ornament);
      expect(ornamentBounds.min.x).toBeGreaterThanOrEqual(mainBounds.min.x);
      expect(ornamentBounds.max.x).toBeLessThanOrEqual(mainBounds.max.x);
    });
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
      (child) => child instanceof Mesh
        && child.geometry instanceof CylinderGeometry
        && child.userData.kind === 'main-ridge',
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

  it('builds the reference-inspired front chiwen component structure', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const upper = roofs.children[1]!;
    const chiwen = upper.children.filter((child) => child.userData.kind === 'chiwen');

    expect(chiwen).toHaveLength(2);
    chiwen.forEach((ornament) => {
      const components = new Map<string, Object3D[]>();
      ornament.traverse((child) => {
        const kind = child.userData.kind as string | undefined;
        if (!kind) return;
        const matches = components.get(kind) ?? [];
        matches.push(child);
        components.set(kind, matches);
      });

      expect(ornament.userData.profile).toBe('simplified-front-reference');
      expect(components.get('chiwen-body')).toHaveLength(1);
      expect(components.get('chiwen-tail')).toHaveLength(1);
      expect(components.get('chiwen-back-scale')?.length).toBeGreaterThanOrEqual(6);
      expect(components.get('chiwen-head')).toHaveLength(1);
      expect(components.get('chiwen-mouth')).toHaveLength(1);
      expect(components.has('chiwen-upper-jaw')).toBe(false);
      expect(components.has('chiwen-lower-jaw')).toBe(false);
      expect(components.has('chiwen-jaw-hinge')).toBe(false);
      expect(components.has('chiwen-horn')).toBe(false);
      expect(components.has('chiwen-eye')).toBe(false);
      expect(components.has('chiwen-pupil')).toBe(false);
      expect(components.has('chiwen-whisker')).toBe(false);

      const headBounds = new Box3().setFromObject(components.get('chiwen-head')![0]!);
      const tailBounds = new Box3().setFromObject(components.get('chiwen-tail')![0]!);
      const bodyBounds = new Box3().setFromObject(components.get('chiwen-body')![0]!);
      const exposedScale = components.get('chiwen-back-scale')!.some((scale) => (
        new Box3().setFromObject(scale).max.z > bodyBounds.max.z - 0.01
      ));
      const bounds = new Box3().setFromObject(ornament);
      const size = bounds.getSize(new Vector3());
      expect(tailBounds.max.y).toBeGreaterThan(headBounds.max.y + 0.35);
      expect(exposedScale).toBe(true);
      expect(size.y).toBeLessThan(3.3);
      expect(size.y / size.x).toBeGreaterThan(1.15);
    });
  });
});
