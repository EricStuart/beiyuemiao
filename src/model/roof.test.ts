import { Box3, BoxGeometry, Color, CylinderGeometry, InstancedMesh, LineSegments, Mesh, Object3D, Vector3 } from 'three';
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

function collectMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child);
  });
  return meshes;
}

describe('hip ridge alignment', () => {
  it('uses gray roof surfaces and tiles with green diamond tiles and glazed ridges', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    expect(materials.roofSurface.color.getHex()).toBe(0x92948e);
    expect(materials.tile.color.getHex()).toBe(0x7b7c76);
    expect(materials.tileRib.color.getHex()).toBe(0x565852);
    expect(materials.diamondTile.color.getHex()).toBe(0x2f543d);
    expect(materials.glazedGreen.color.getHex()).toBe(0x255942);
    expect(materials.yellowGlaze.color.getHex()).toBe(0xb08d3e);
    const roofHsl = materials.roofSurface.color.getHSL({ h: 0, s: 0, l: 0 });
    const tileHsl = materials.tile.color.getHSL({ h: 0, s: 0, l: 0 });
    const ridgeHsl = materials.glazedGreen.color.getHSL({ h: 0, s: 0, l: 0 });
    expect(roofHsl.s).toBeLessThan(0.06);
    expect(tileHsl.l).toBeLessThan(roofHsl.l);
    expect(ridgeHsl.s).toBeGreaterThan(roofHsl.s);
    expect(materials.tile.roughness).toBeGreaterThan(0.85);
    expect(materials.tile.vertexColors).toBe(false);
    expect(materials.diamondTile.vertexColors).toBe(false);
  });

  it('covers both roof levels with instanced faded tiles', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const coverings = roofs.children.map((roof) => roof.getObjectByName('坡面筒瓦覆盖'));
    expect(coverings.every(Boolean)).toBe(true);
    coverings.forEach((covering) => {
      expect(covering!.userData.kind).toBe('roof-tile-covering');
      expect(covering!.userData.instanceCount).toBeGreaterThan(400);
      expect(covering!.userData.surfaceOffset).toBeGreaterThanOrEqual(0.07);
      expect(covering!.userData.tileOrientationMode).toBe('surface-normal');
      expect(covering!.userData.tileOpeningDirection).toBe('toward-roof-surface');
    });
  });

  it('does not draw auxiliary lines across either roof slope', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');

    roofs.children.forEach((roof) => {
      expect(roof.children.some((child) => child instanceof LineSegments)).toBe(false);
    });
  });

  it('uses half-density tile columns on both side slopes', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    roofs.children.forEach((roof) => {
      expect(roof.userData.tilePlacementCounts).toEqual({
        front: 546,
        back: 546,
        left: 280,
        right: 280,
      });
    });
  });

  it('recolors eave and ridge-adjacent tiles in the existing mesh without outline objects', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const roofs = createRoofs(DENING_HALL, materials, 'high');

    roofs.children.forEach((roof) => {
      const outlineObjects = roof.children.filter(
        (child) => child.userData.kind === 'eave-green-outline',
      );
      expect(outlineObjects).toHaveLength(0);

      const covering = roof.children.find(
        (child) => child.userData.kind === 'roof-tile-covering',
      );
      expect(covering).toBeInstanceOf(InstancedMesh);
      expect(covering!.userData.eaveGreenInstanceCount).toBe(118);
      expect(covering!.userData.ridgeGreenInstanceCount).toBe(112);
      expect(covering!.userData.greenEdgeInstanceCount).toBe(222);
      expect(covering!.userData.eaveGreenColor).toBe(0x2f543d);
      expect(covering!.userData.edgeGreenColor).toBe(0x2f543d);

      const instanceTint = new Color();
      (covering as InstancedMesh).getColorAt(0, instanceTint);
      const renderedColor = instanceTint.multiply(materials.tile.color);
      expect(renderedColor.getHex()).toBe(materials.diamondTile.color.getHex());

      const ridgeTint = new Color();
      (covering as InstancedMesh).getColorAt(39, ridgeTint);
      const renderedRidgeColor = ridgeTint.multiply(materials.tile.color);
      expect(renderedRidgeColor.getHex()).toBe(materials.diamondTile.color.getHex());

      const ordinaryTint = new Color();
      (covering as InstancedMesh).getColorAt(40, ordinaryTint);
      const renderedOrdinaryColor = ordinaryTint.multiply(materials.tile.color);
      expect(renderedOrdinaryColor.getHex()).toBe(materials.tile.color.getHex());
    });
  });

  it('directly colors the existing roof surface along eave and hip boundaries', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const roofs = createRoofs(DENING_HALL, materials, 'high');

    expect(materials.roofSurface.vertexColors).toBe(true);
    roofs.children.forEach((roof) => {
      const surface = roof.children.find((child) => child.userData.kind === 'roof-surface');
      expect(surface).toBeInstanceOf(Mesh);
      const colorAttribute = (surface as Mesh).geometry.getAttribute('color');
      expect(colorAttribute).toBeDefined();
      expect(surface!.userData.edgeBandColor).toBe(0x2f543d);
      expect(surface!.userData.edgeBandMode).toBe('eave-and-hip-boundaries');

      const edgeTint = new Color().fromBufferAttribute(colorAttribute, 0);
      const renderedEdge = edgeTint.multiply(materials.roofSurface.color);
      expect(renderedEdge.getHex()).toBe(materials.diamondTile.color.getHex());

      const interiorTint = new Color().fromBufferAttribute(colorAttribute, 229);
      const renderedInterior = interiorTint.multiply(materials.roofSurface.color);
      expect(renderedInterior.getHex()).toBe(materials.roofSurface.color.getHex());

      const overlayObjects = roof.children.filter(
        (child) => child.userData.kind === 'roof-surface-edge-overlay',
      );
      expect(overlayObjects).toHaveLength(0);
    });
  });

  it('places one raised, wide green diamond with visibly isolated single-tile tips', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const upper = roofs.children[1]!;
    const diamond = upper.getObjectByName('二层中央菱形绿瓦');
    expect(diamond).toBeDefined();
    expect(diamond!.userData.kind).toBe('green-diamond-tiles');
    expect(diamond!.userData.face).toBe('front');
    expect(diamond!.userData.instanceCount).toBe(35);
    expect(diamond!.userData.horizontalTileSpan).toBe(13);
    expect(diamond!.userData.verticalTileRows).toBe(7);
    expect(diamond!.userData.rowTileCounts).toEqual([1, 3, 7, 13, 7, 3, 1]);
    expect(diamond!.userData.tipInstanceCounts).toEqual({
      left: 1,
      right: 1,
      top: 1,
      bottom: 1,
    });
    expect(diamond!.userData.maskCenterT).toBeCloseTo(15 / 28, 8);
    expect(diamond!.userData.maskMode).toBe('discrete-grid');
    expect(diamond!.userData.rowHalfWidths).toEqual([0, 1, 3, 6, 3, 1, 0]);
    const diamondPatch = upper.getObjectByName('二层中央菱形绿瓦底');
    expect(diamondPatch).toBeUndefined();
  });

  it.each(['high', 'medium', 'low'] as const)(
    'uses the exact diamond row profile at %s quality',
    (quality) => {
      const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), quality);
      const diamond = roofs.children[1]!.getObjectByName('二层中央菱形绿瓦');

      expect(diamond).toBeDefined();
      expect(diamond!.userData.rowTileCounts).toEqual([1, 3, 7, 13, 7, 3, 1]);
      expect(diamond!.userData.tipInstanceCounts).toEqual({
        left: 1,
        right: 1,
        top: 1,
        bottom: 1,
      });
    },
  );

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
    const mainRidges = upper.children.filter(
      (child) => child instanceof Mesh
        && child.userData.kind === 'main-ridge',
    );
    expect(mainRidges).toHaveLength(1);
    expect((mainRidges[0] as Mesh).geometry).toBeInstanceOf(BoxGeometry);
    expect((mainRidges[0] as Mesh).geometry).not.toBeInstanceOf(CylinderGeometry);
  });

  it('mounts one yellow glazed band on the front of the upper main ridge', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const roofs = createRoofs(DENING_HALL, materials, 'high');
    const lower = roofs.children.find((child) => child.name === '下檐庑殿顶')!;
    const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;
    const main = upper.children.find((child) => child.userData.kind === 'main-ridge')!;
    const band = upper.children.find(
      (child) => child.userData.kind === 'main-ridge-front-band',
    );

    expect(lower.children.some(
      (child) => child.userData.kind === 'main-ridge-front-band',
    )).toBe(false);
    expect(band).toBeInstanceOf(Mesh);
    const bandMesh = band as Mesh;
    expect(bandMesh.geometry).toBeInstanceOf(BoxGeometry);
    expect(bandMesh.material).toBe(materials.yellowGlaze);
    expect(bandMesh.position.z).toBeGreaterThan(main.position.z);

    const mainBounds = new Box3().setFromObject(main);
    const bandBounds = new Box3().setFromObject(bandMesh);
    const mainSize = mainBounds.getSize(new Vector3());
    const bandSize = bandBounds.getSize(new Vector3());
    expect(mainBounds.intersectsBox(bandBounds)).toBe(true);
    expect(bandSize.x).toBeLessThan(mainSize.x);
  });

  it('lowers the complete upper roof while preserving its profile', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    const lower = roofs.children.find((child) => child.name === '下檐庑殿顶')!;
    const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;

    expect(lower.userData.baseY).toBeCloseTo(8.49, 5);
    expect(lower.userData.ridgeY).toBeCloseTo(12.82, 5);
    expect(UPPER_ROOF_BASE_Y).toBeCloseTo(13.27, 5);
    expect(upper.userData.baseY).toBeCloseTo(13.27, 5);
    expect(upper.userData.ridgeY).toBeCloseTo(DENING_HALL.upperRidgeHeight - 2.73, 5);
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

  it('adds eight outward-facing beasts at the eave ends of all hip ridges', () => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
    let totalBeasts = 0;

    roofs.children.forEach((roof) => {
      const beasts = roof.children.filter(
        (child) => child.userData.kind === 'ridge-end-beast',
      );
      const hipRidges = roof.children.filter((child) => child.userData.kind === 'hip-ridge');
      expect(beasts).toHaveLength(4);
      totalBeasts += beasts.length;

      beasts.forEach((beast) => {
        expect(beast.userData.facing).toBe('outward');
        expect(Math.sign(beast.position.x)).toBe(beast.userData.xSide);
        expect(Math.sign(beast.position.z)).toBe(beast.userData.zSide);
        const hip = hipRidges.find(
          (candidate) => candidate.userData.xSide === beast.userData.xSide
            && candidate.userData.zSide === beast.userData.zSide,
        );
        expect(hip).toBeDefined();
        expect(new Box3().setFromObject(beast).intersectsBox(
          new Box3().setFromObject(hip!),
        )).toBe(true);
      });
    });

    expect(totalBeasts).toBe(8);
  });

  it('uses yellow glaze on every small ridge beast while keeping chiwen green', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const roofs = createRoofs(DENING_HALL, materials, 'high');
    const smallBeasts: Object3D[] = [];

    roofs.traverse((child) => {
      if (
        child.userData.kind === 'mid-ridge-ornament'
        || child.userData.kind === 'ridge-end-beast'
      ) {
        smallBeasts.push(child);
      }
    });

    expect(smallBeasts).toHaveLength(16);
    smallBeasts.forEach((beast) => {
      const meshes = collectMeshes(beast);
      expect(meshes.length).toBeGreaterThan(0);
      meshes.forEach((mesh) => {
        expect(mesh.material).toBe(materials.yellowGlaze);
      });
    });

    const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;
    const chiwen = upper.children.filter((child) => child.userData.kind === 'chiwen');
    expect(chiwen).toHaveLength(2);
    chiwen.forEach((ornament) => {
      expect(collectMeshes(ornament).some(
        (mesh) => mesh.material === materials.glazedGreen,
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

    expect(mainSize.y).toBeCloseTo(1.2, 5);
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
        && child.userData.kind === 'main-ridge',
    );

    expect(lowerChiwen).toHaveLength(0);
    expect(upperChiwen).toHaveLength(2);
    expect(mainRidge).toBeDefined();
    expect((mainRidge as Mesh).geometry).toBeInstanceOf(BoxGeometry);
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
