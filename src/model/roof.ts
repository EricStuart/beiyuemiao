import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Material,
} from 'three';
import type { BuildingData } from '../data/building';
import type { BuildingMaterials } from './materials';
import { evaluateRaisedEaveHeight, evaluateWingLift, sampleRaisedEaveProfile } from './roof-profile';
import type { QualityLevel } from './types';

export interface RoofDimensions {
  width: number;
  depth: number;
  ridgeLength: number;
  baseY: number;
  ridgeY: number;
  eaveLift: number;
  name: string;
  topWidth?: number;
  topDepth?: number;
  ridgeStyle?: 'truncated' | 'simple' | 'chiwen';
}

function profileY(t: number, dimensions: RoofDimensions): number {
  return dimensions.baseY + evaluateRaisedEaveHeight(
    {
      run: dimensions.depth / 2,
      rise: dimensions.ridgeY - dimensions.baseY,
      eaveLift: dimensions.eaveLift,
    },
    t,
  );
}

function createRoofSurface(dimensions: RoofDimensions, material: Material, segments: number): Mesh {
  const vertices: number[] = [];
  const indices: number[] = [];
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const topHalfWidth = (dimensions.topWidth ?? dimensions.ridgeLength) / 2;
  const topHalfDepth = (dimensions.topDepth ?? 0) / 2;
  const across = Math.max(12, Math.round(segments * 1.6));

  const addSurface = (side: 'front' | 'back' | 'left' | 'right'): void => {
    const baseIndex = vertices.length / 3;
    for (let row = 0; row <= segments; row += 1) {
      const t = row / segments;
      const extentX = halfWidth + (topHalfWidth - halfWidth) * t;
      const extentZ = halfDepth + (topHalfDepth - halfDepth) * t;
      for (let column = 0; column <= across; column += 1) {
        const u = column / across;
        let x: number;
        let z: number;
        let ratio: number;
        if (side === 'front' || side === 'back') {
          x = -extentX + 2 * extentX * u;
          z = (side === 'front' ? 1 : -1) * extentZ;
          ratio = x / Math.max(extentX, 0.001);
        } else {
          x = (side === 'right' ? 1 : -1) * extentX;
          z = -extentZ + 2 * extentZ * u;
          ratio = z / Math.max(extentZ, 0.001);
        }
        vertices.push(x, profileY(t, dimensions) + evaluateWingLift(ratio, t), z);
      }
    }
    for (let row = 0; row < segments; row += 1) {
      for (let column = 0; column < across; column += 1) {
        const a = baseIndex + row * (across + 1) + column;
        const b = a + across + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  };

  addSurface('front');
  addSurface('back');
  addSurface('left');
  addSurface('right');

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  mesh.name = dimensions.name;
  return mesh;
}

function createTileLines(dimensions: RoofDimensions, quality: QualityLevel, green: boolean): LineSegments {
  const count = quality === 'high' ? 54 : quality === 'medium' ? 38 : 24;
  const profileSegments = quality === 'low' ? 8 : 12;
  const points = sampleRaisedEaveProfile(
    {
      run: dimensions.depth / 2,
      rise: dimensions.ridgeY - dimensions.baseY,
      eaveLift: dimensions.eaveLift,
    },
    profileSegments,
  );
  const positions: number[] = [];
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const topHalfWidth = (dimensions.topWidth ?? dimensions.ridgeLength) / 2;
  const topHalfDepth = (dimensions.topDepth ?? 0) / 2;
  for (const face of [-1, 1]) {
    for (let index = 0; index <= count; index += 1) {
      const ratio = -1 + (2 * index) / count;
      for (let segment = 0; segment < points.length - 1; segment += 1) {
        const current = points[segment];
        const next = points[segment + 1];
        if (!current || !next) continue;
        const t1 = current.x / (dimensions.depth / 2);
        const t2 = next.x / (dimensions.depth / 2);
        const extentX1 = halfWidth + (topHalfWidth - halfWidth) * t1;
        const extentX2 = halfWidth + (topHalfWidth - halfWidth) * t2;
        const extentZ1 = halfDepth + (topHalfDepth - halfDepth) * t1;
        const extentZ2 = halfDepth + (topHalfDepth - halfDepth) * t2;
        positions.push(
          ratio * extentX1,
          dimensions.baseY + current.y + evaluateWingLift(ratio, t1) + 0.05,
          face * extentZ1,
          ratio * extentX2,
          dimensions.baseY + next.y + evaluateWingLift(ratio, t2) + 0.05,
          face * extentZ2,
        );
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return new LineSegments(
    geometry,
    new LineBasicMaterial({ color: green ? 0x3f765b : 0x737d76, transparent: true, opacity: 0.8 }),
  );
}

function createRidgeTube(points: Vector3[], radius: number, material: Material): Mesh {
  return new Mesh(new TubeGeometry(new CatmullRomCurve3(points), 20, radius, 8, false), material);
}

export function createHipRidgePoints(
  dimensions: RoofDimensions,
  xSide: number,
  zSide: number,
  surfaceOffset = 0.16,
  segments = 8,
): Vector3[] {
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const topHalfWidth = (dimensions.topWidth ?? dimensions.ridgeLength) / 2;
  const topHalfDepth = (dimensions.topDepth ?? 0) / 2;

  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const extentX = halfWidth + (topHalfWidth - halfWidth) * t;
    const extentZ = halfDepth + (topHalfDepth - halfDepth) * t;
    return new Vector3(
      xSide * extentX,
      profileY(t, dimensions) + evaluateWingLift(1, t) + surfaceOffset,
      zSide * extentZ,
    );
  });
}

function createChiwen(side: number, materials: BuildingMaterials): Group {
  const chiwen = new Group();
  chiwen.name = side < 0 ? '西侧鸱吻' : '东侧鸱吻';
  chiwen.userData.kind = 'chiwen';
  chiwen.userData.level = 'upper';

  const profile = new Shape();
  profile.moveTo(-0.72, 0);
  profile.lineTo(0.58, 0);
  profile.bezierCurveTo(0.82, 0.3, 0.92, 0.72, 0.78, 1.12);
  profile.bezierCurveTo(0.66, 1.48, 0.3, 1.7, 0.38, 2.08);
  profile.bezierCurveTo(0.48, 2.48, 0.2, 2.78, -0.02, 3.05);
  profile.bezierCurveTo(-0.1, 2.63, -0.38, 2.42, -0.55, 2.16);
  profile.bezierCurveTo(-0.88, 1.68, -0.93, 1.15, -0.76, 0.72);
  profile.lineTo(-0.95, 0.34);
  profile.closePath();

  const bodyGeometry = new ExtrudeGeometry(profile, {
    depth: 0.5,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    curveSegments: 8,
  });
  bodyGeometry.translate(0, 0, -0.25);
  const body = new Mesh(bodyGeometry, materials.glazedGreen);
  const base = new Mesh(new BoxGeometry(1.9, 0.34, 0.78), materials.glazedGreen);
  base.position.y = 0.12;
  const eye = new Mesh(new SphereGeometry(0.13, 10, 8), materials.gold);
  eye.position.set(0.38, 2.1, 0.31);
  const snout = new Mesh(new SphereGeometry(0.34, 12, 9), materials.glazedGreen);
  snout.scale.set(1.55, 0.62, 0.82);
  snout.position.set(-0.48, 2.42, 0);
  const jaw = new Mesh(new BoxGeometry(0.82, 0.18, 0.48), materials.glazedGreen);
  jaw.rotation.z = 0.18;
  jaw.position.set(-0.58, 2.18, 0);
  const crest = new Mesh(new ConeGeometry(0.16, 0.7, 8), materials.glazedGreen);
  crest.rotation.z = -0.48;
  crest.position.set(-0.15, 2.82, 0);
  const backFin = new Mesh(new ConeGeometry(0.22, 0.86, 8), materials.glazedGreen);
  backFin.rotation.z = 0.38;
  backFin.position.set(0.48, 1.35, 0);
  chiwen.add(base, body, eye, snout, jaw, crest, backFin);
  chiwen.scale.set(side * 1.12, 1.08, 1.12);
  return chiwen;
}

function addRidges(group: Group, dimensions: RoofDimensions, materials: BuildingMaterials): void {
  const ridgeY = dimensions.ridgeY + 0.25;
  const ridgeHalf = dimensions.ridgeLength / 2;
  if (dimensions.ridgeStyle !== 'truncated') {
    const main = new Mesh(new CylinderGeometry(0.3, 0.36, dimensions.ridgeLength + 1.2, 12), materials.glazedGreen);
    main.name = `${dimensions.name}主脊`;
    main.userData.kind = 'main-ridge';
    main.rotation.z = Math.PI / 2;
    main.position.set(0, ridgeY, 0);
    group.add(main);
  }

  if (dimensions.ridgeStyle === 'chiwen') {
    const ridgeBand = new Mesh(
      new BoxGeometry(dimensions.ridgeLength + 0.5, 0.58, 0.36),
      materials.glazedGreen,
    );
    ridgeBand.name = '上层琉璃正脊带';
    ridgeBand.userData.kind = 'ridge-band';
    ridgeBand.position.set(0, dimensions.ridgeY + 0.32, 0);
    group.add(ridgeBand);
    const ornamentCount = 18;
    for (let index = 0; index < ornamentCount; index += 1) {
      const stud = new Mesh(new BoxGeometry(0.42, 0.22, 0.44), materials.gold);
      stud.position.set(
        -ridgeHalf + ((index + 0.5) / ornamentCount) * dimensions.ridgeLength,
        dimensions.ridgeY + 0.62,
        0,
      );
      group.add(stud);
    }
  }

  for (const xSide of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const hip = createRidgeTube(
        createHipRidgePoints(dimensions, xSide, zSide),
        0.22,
        materials.glazedGreen,
      );
      hip.name = `${dimensions.name}角脊`;
      hip.userData.kind = 'hip-ridge';
      group.add(hip);
    }
  }

  for (const side of [-1, 1]) {
    if (dimensions.ridgeStyle === 'truncated') continue;
    if (dimensions.ridgeStyle === 'chiwen') {
      const chiwen = createChiwen(side, materials);
      chiwen.position.set(side * (ridgeHalf + 0.32), ridgeY + 0.22, 0);
      group.add(chiwen);
    } else {
      const ornament = new Group();
      const body = new Mesh(new SphereGeometry(0.58, 10, 8), materials.glazedGreen);
      body.scale.set(0.72, 1.18, 0.55);
      const horn = new Mesh(new ConeGeometry(0.24, 1.1, 8), materials.glazedGreen);
      horn.rotation.z = -side * 0.75;
      horn.position.set(side * 0.42, 0.58, 0);
      ornament.add(body, horn);
      ornament.position.set(side * (ridgeHalf + 0.35), ridgeY + 0.65, 0);
      group.add(ornament);
    }
  }
}

function createRoofLevel(dimensions: RoofDimensions, materials: BuildingMaterials, quality: QualityLevel): Group {
  const group = new Group();
  group.name = dimensions.name;
  group.userData.roofForm = dimensions.ridgeStyle === 'truncated' ? 'truncated-hip' : 'hip';
  group.add(createRoofSurface(dimensions, materials.tile, quality === 'low' ? 8 : quality === 'medium' ? 12 : 16));
  group.add(createTileLines(dimensions, quality, false));

  addRidges(group, dimensions, materials);
  return group;
}

export function createRoofs(data: BuildingData, materials: BuildingMaterials, quality: QualityLevel): Group {
  const roofs = new Group();
  roofs.name = '重檐庑殿顶';
  roofs.add(
    createRoofLevel(
      {
        name: '下檐庑殿顶',
        width: data.planWidth.value + 9,
        depth: data.planDepth.value + 9,
        ridgeLength: data.planWidth.value * 0.73 + 1,
        topWidth: data.planWidth.value * 0.73 + 1,
        topDepth: data.planDepth.value * 0.62 + 1,
        baseY: 8.72,
        ridgeY: 13.05,
        eaveLift: 0.58,
        ridgeStyle: 'truncated',
      },
      materials,
      quality,
    ),
  );
  roofs.add(
    createRoofLevel(
      {
        name: '上檐庑殿顶',
        width: data.planWidth.value * 0.82 + 6.5,
        depth: data.planDepth.value * 0.68 + 7,
        ridgeLength: data.planWidth.value * 0.48,
        baseY: 16.0,
        ridgeY: data.upperRidgeHeight,
        eaveLift: 0.72,
        ridgeStyle: 'chiwen',
      },
      materials,
      quality,
    ),
  );
  return roofs;
}
