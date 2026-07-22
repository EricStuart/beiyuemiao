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

export const UPPER_ROOF_DROP = 1.5;
export const UPPER_ROOF_BASE_Y = 16.0 - UPPER_ROOF_DROP;

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
  chiwen.userData.profile = 'front-reference';

  const profile = new Shape();
  profile.moveTo(-0.58, 0.22);
  profile.lineTo(0.72, 0.22);
  profile.bezierCurveTo(0.76, 0.78, 0.68, 1.55, 0.56, 2.2);
  profile.bezierCurveTo(0.49, 2.68, 0.38, 2.98, 0.16, 3.1);
  profile.bezierCurveTo(-0.02, 3.18, -0.14, 3.0, -0.18, 2.72);
  profile.bezierCurveTo(-0.22, 2.25, -0.28, 1.75, -0.32, 1.28);
  profile.bezierCurveTo(-0.36, 0.8, -0.48, 0.46, -0.58, 0.22);
  profile.closePath();

  const bodyGeometry = new ExtrudeGeometry(profile, {
    depth: 0.56,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    curveSegments: 10,
  });
  bodyGeometry.translate(0, 0, -0.28);
  const body = new Mesh(bodyGeometry, materials.glazedGreen);
  body.name = '鸱吻高背主体';
  body.userData.kind = 'chiwen-body';

  const base = new Mesh(new BoxGeometry(2.0, 0.46, 0.82), materials.glazedGreen);
  base.name = '鸱吻底座';
  base.userData.kind = 'chiwen-base';
  base.position.y = 0.12;

  const tailCurve = new CatmullRomCurve3([
    new Vector3(0.05, 2.72, 0),
    new Vector3(-0.25, 3.02, 0),
    new Vector3(-0.62, 3.26, 0),
    new Vector3(-1.02, 3.34, 0),
    new Vector3(-1.16, 3.18, 0),
    new Vector3(-1.04, 3.02, 0),
  ]);
  const tail = new Mesh(new TubeGeometry(tailCurve, 24, 0.19, 10, false), materials.glazedGreen);
  tail.name = '鸱吻内卷尾';
  tail.userData.kind = 'chiwen-tail';
  const tailTip = new Mesh(new SphereGeometry(0.22, 12, 10), materials.glazedGreen);
  tailTip.name = '鸱吻卷尾端';
  tailTip.userData.kind = 'chiwen-tail-tip';
  tailTip.scale.set(1.12, 1, 0.86);
  tailTip.position.set(-1.05, 3.12, 0);

  const backScalePositions = [
    { x: 0.02, y: 2.88, scale: 1.02 },
    { x: 0.2, y: 3.02, scale: 1.08 },
    { x: 0.39, y: 3.0, scale: 1.06 },
    { x: 0.57, y: 2.9, scale: 1 },
    { x: 0.7, y: 2.72, scale: 0.94 },
    { x: 0.75, y: 2.5, scale: 0.88 },
    { x: 0.77, y: 2.26, scale: 0.82 },
  ];
  const backScales = backScalePositions.flatMap(({ x, y, scale }, index) => [-1, 1].map((zSide) => {
    const plate = new Mesh(new SphereGeometry(0.24, 12, 9), materials.glazedGreen);
    plate.name = `鸱吻背鳍${index + 1}${zSide > 0 ? '前' : '后'}`;
    plate.userData.kind = 'chiwen-back-scale';
    plate.scale.set(0.7 * scale, 1.08 * scale, 0.34 * scale);
    plate.position.set(x, y, zSide * 0.3);
    return plate;
  }));

  const head = new Mesh(new SphereGeometry(0.5, 14, 10), materials.glazedGreen);
  head.name = '鸱吻龙首';
  head.userData.kind = 'chiwen-head';
  head.scale.set(1.28, 1.08, 0.94);
  head.position.set(-0.58, 1.06, 0);
  const snout = new Mesh(new SphereGeometry(0.36, 12, 9), materials.gold);
  snout.name = '鸱吻金色吻部';
  snout.userData.kind = 'chiwen-snout';
  snout.scale.set(1.52, 0.7, 0.92);
  snout.position.set(-0.98, 0.94, 0);

  const upperJaw = new Mesh(new BoxGeometry(0.96, 0.2, 0.56), materials.gold);
  upperJaw.name = '鸱吻上颌';
  upperJaw.userData.kind = 'chiwen-upper-jaw';
  upperJaw.rotation.z = 0.12;
  upperJaw.position.set(-0.96, 0.78, 0);
  const lowerJaw = new Mesh(new BoxGeometry(0.88, 0.18, 0.52), materials.gold);
  lowerJaw.name = '鸱吻下颌';
  lowerJaw.userData.kind = 'chiwen-lower-jaw';
  lowerJaw.rotation.z = -0.14;
  lowerJaw.position.set(-0.88, 0.42, 0);
  const jawHinge = new Mesh(new SphereGeometry(0.22, 10, 8), materials.gold);
  jawHinge.name = '鸱吻颌关节';
  jawHinge.userData.kind = 'chiwen-jaw-hinge';
  jawHinge.position.set(-0.48, 0.66, 0);

  const horns = [
    { x: -0.36, y: 1.62, z: 0.12, rotation: 0.58 },
    { x: -0.06, y: 1.58, z: -0.1, rotation: 0.34 },
  ].map(({ x, y, z, rotation }, index) => {
    const horn = new Mesh(new ConeGeometry(0.11, 0.58, 8), materials.gold);
    horn.name = `鸱吻龙角${index + 1}`;
    horn.userData.kind = 'chiwen-horn';
    horn.rotation.z = rotation;
    horn.position.set(x, y, z);
    return horn;
  });

  const eyes: Mesh[] = [];
  const pupils: Mesh[] = [];
  for (const zSide of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.13, 10, 8), materials.stone);
    eye.name = zSide < 0 ? '鸱吻后侧眼' : '鸱吻前侧眼';
    eye.userData.kind = 'chiwen-eye';
    eye.position.set(-0.86, 1.2, zSide * 0.36);
    const pupil = new Mesh(new SphereGeometry(0.055, 8, 6), materials.darkTimber);
    pupil.name = zSide < 0 ? '鸱吻后侧瞳孔' : '鸱吻前侧瞳孔';
    pupil.userData.kind = 'chiwen-pupil';
    pupil.position.set(-0.9, 1.2, zSide * 0.47);
    eyes.push(eye);
    pupils.push(pupil);
  }

  const whiskers = [-1, 1].map((zSide, index) => {
    const curve = new CatmullRomCurve3([
      new Vector3(-1.14, 0.95, zSide * 0.26),
      new Vector3(-1.34, 1.1, zSide * 0.32),
      new Vector3(-1.42, 1.36, zSide * 0.36),
    ]);
    const whisker = new Mesh(new TubeGeometry(curve, 10, 0.025, 6, false), materials.gold);
    whisker.name = `鸱吻龙须${index + 1}`;
    whisker.userData.kind = 'chiwen-whisker';
    return whisker;
  });

  chiwen.add(
    base,
    body,
    tail,
    tailTip,
    ...backScales,
    head,
    snout,
    upperJaw,
    lowerJaw,
    jawHinge,
    ...horns,
    ...eyes,
    ...pupils,
    ...whiskers,
  );
  chiwen.scale.set(side * 1.3, 1.24, 1.3);
  return chiwen;
}

function createMidRidgeOrnament(
  materials: BuildingMaterials,
  level: 'lower' | 'upper',
): Group {
  const ornament = new Group();
  ornament.name = level === 'lower' ? '下檐斜脊中段脊兽' : '上檐斜脊中段脊兽';
  ornament.userData.kind = 'mid-ridge-ornament';
  ornament.userData.level = level;

  const base = new Mesh(new BoxGeometry(0.68, 0.16, 0.42), materials.glazedGreen);
  base.userData.kind = 'mid-ridge-ornament-base';
  const body = new Mesh(new SphereGeometry(0.24, 10, 8), materials.glazedGreen);
  body.scale.set(1.05, 1.28, 0.78);
  body.position.y = 0.28;
  const head = new Mesh(new SphereGeometry(0.18, 10, 8), materials.glazedGreen);
  head.scale.set(1.25, 0.92, 0.85);
  head.position.set(0.25, 0.52, 0);
  const crest = new Mesh(new ConeGeometry(0.1, 0.4, 8), materials.glazedGreen);
  crest.rotation.z = -0.55;
  crest.position.set(0.1, 0.68, 0);
  const eye = new Mesh(new SphereGeometry(0.05, 8, 6), materials.gold);
  eye.position.set(0.36, 0.56, 0.14);
  ornament.add(base, body, head, crest, eye);
  if (level === 'lower') ornament.scale.setScalar(0.86);
  return ornament;
}

function addRidges(group: Group, dimensions: RoofDimensions, materials: BuildingMaterials): void {
  const ridgeY = dimensions.ridgeY + 0.25;
  const ridgeHalf = dimensions.ridgeLength / 2;
  if (dimensions.ridgeStyle !== 'truncated') {
    const main = new Mesh(new CylinderGeometry(0.4, 0.48, dimensions.ridgeLength + 1.2, 12), materials.glazedGreen);
    main.name = `${dimensions.name}主脊`;
    main.userData.kind = 'main-ridge';
    main.rotation.z = Math.PI / 2;
    main.position.set(0, ridgeY, 0);
    group.add(main);
  }

  if (dimensions.ridgeStyle === 'chiwen') {
    const ridgeBand = new Mesh(
      new BoxGeometry(dimensions.ridgeLength + 0.5, 0.78, 0.42),
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
      const hipPoints = createHipRidgePoints(dimensions, xSide, zSide);
      const hip = createRidgeTube(
        hipPoints,
        0.22,
        materials.glazedGreen,
      );
      hip.name = `${dimensions.name}角脊`;
      hip.userData.kind = 'hip-ridge';
      hip.userData.xSide = xSide;
      hip.userData.zSide = zSide;
      group.add(hip);

      if (dimensions.ridgeStyle === 'chiwen' || dimensions.ridgeStyle === 'truncated') {
        const midpointIndex = Math.floor(hipPoints.length / 2);
        const midpoint = hipPoints[midpointIndex]!;
        const previous = hipPoints[Math.max(0, midpointIndex - 1)]!;
        const next = hipPoints[Math.min(hipPoints.length - 1, midpointIndex + 1)]!;
        const tangent = next.clone().sub(previous).normalize();
        const ornamentLevel = dimensions.ridgeStyle === 'truncated' ? 'lower' : 'upper';
        const ornament = createMidRidgeOrnament(materials, ornamentLevel);
        ornament.position.copy(midpoint);
        ornament.rotation.y = Math.atan2(-tangent.z, tangent.x);
        ornament.userData.xSide = xSide;
        ornament.userData.zSide = zSide;
        group.add(ornament);
      }
    }
  }

  for (const side of [-1, 1]) {
    if (dimensions.ridgeStyle === 'truncated') continue;
    if (dimensions.ridgeStyle === 'chiwen') {
      const chiwen = createChiwen(side, materials);
      chiwen.position.set(side * (ridgeHalf - 1.15), ridgeY + 0.22, 0);
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
  group.userData.baseY = dimensions.baseY;
  group.userData.ridgeY = dimensions.ridgeY;
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
        baseY: UPPER_ROOF_BASE_Y,
        ridgeY: data.upperRidgeHeight - UPPER_ROOF_DROP,
        eaveLift: 0.72,
        ridgeStyle: 'chiwen',
      },
      materials,
      quality,
    ),
  );
  return roofs;
}
