import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
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

export const UPPER_ROOF_DROP = 2.5;
export const ROOF_STACK_DROP = 0.23;
const LOWER_ROOF_BASE_Y = 8.72 - ROOF_STACK_DROP;
const LOWER_ROOF_RIDGE_Y = 13.05 - ROOF_STACK_DROP;
export const UPPER_ROOF_BASE_Y = 16.0 - UPPER_ROOF_DROP - ROOF_STACK_DROP;

export function getUpperRoofFrontEaveZ(data: BuildingData): number {
  return (data.planDepth.value * 0.68 + 7) / 2;
}

export function getUpperRoofSurfaceYAtFrontZ(data: BuildingData, z: number): number {
  const run = getUpperRoofFrontEaveZ(data);
  const t = Math.min(1, Math.max(0, (run - Math.abs(z)) / run));
  return UPPER_ROOF_BASE_Y + evaluateRaisedEaveHeight(
    {
      run,
      rise: data.upperRidgeHeight - UPPER_ROOF_DROP,
      eaveLift: 0.72,
    },
    t,
  );
}

export function getLowerRoofSurfaceYAtFrontZ(data: BuildingData, z: number): number {
  const eaveHalfDepth = (data.planDepth.value + 9) / 2;
  const topHalfDepth = (data.planDepth.value * 0.62 + 1) / 2;
  const t = Math.min(1, Math.max(
    0,
    (eaveHalfDepth - Math.abs(z)) / (eaveHalfDepth - topHalfDepth),
  ));
  return LOWER_ROOF_BASE_Y + evaluateRaisedEaveHeight(
    {
      run: eaveHalfDepth - topHalfDepth,
      rise: 13.05 - 8.72,
      eaveLift: 0.58,
    },
    t,
  );
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

function createRoofSurface(
  dimensions: RoofDimensions,
  material: MeshStandardMaterial,
  edgeColor: Color,
  segments: number,
): Mesh {
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const topHalfWidth = (dimensions.topWidth ?? dimensions.ridgeLength) / 2;
  const topHalfDepth = (dimensions.topDepth ?? 0) / 2;
  const across = Math.max(12, Math.round(segments * 1.6));
  const baseColor = material.color.clone();
  const edgeTint = edgeColor.clone();
  edgeTint.r /= Math.max(baseColor.r, 0.000001);
  edgeTint.g /= Math.max(baseColor.g, 0.000001);
  edgeTint.b /= Math.max(baseColor.b, 0.000001);
  material.vertexColors = true;

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
        const tint = Math.abs(ratio) >= 0.9 || t <= 0.065
          ? edgeTint
          : new Color(1, 1, 1);
        colors.push(tint.r, tint.g, tint.b);
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
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  mesh.name = dimensions.name;
  mesh.userData.kind = 'roof-surface';
  mesh.userData.edgeBandColor = edgeColor.getHex();
  mesh.userData.edgeBandMode = 'eave-and-hip-boundaries';
  return mesh;
}

type RoofSide = 'front' | 'back' | 'left' | 'right';

interface TilePlacement {
  position: Vector3;
  tangent: Vector3;
  normal: Vector3;
  side: RoofSide;
  column: number;
  columnCount: number;
  ratio: number;
  row: number;
  rowCount: number;
  t: number;
  length: number;
}

function roofPointAt(
  dimensions: RoofDimensions,
  side: RoofSide,
  ratio: number,
  t: number,
  surfaceOffset: number,
): Vector3 {
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const topHalfWidth = (dimensions.topWidth ?? dimensions.ridgeLength) / 2;
  const topHalfDepth = (dimensions.topDepth ?? 0) / 2;
  const extentX = halfWidth + (topHalfWidth - halfWidth) * t;
  const extentZ = halfDepth + (topHalfDepth - halfDepth) * t;
  const y = profileY(t, dimensions) + evaluateWingLift(ratio, t) + surfaceOffset;
  if (side === 'front') return new Vector3(ratio * extentX, y, extentZ);
  if (side === 'back') return new Vector3(ratio * extentX, y, -extentZ);
  if (side === 'right') return new Vector3(extentX, y, ratio * extentZ);
  return new Vector3(-extentX, y, ratio * extentZ);
}

function roofOutwardDirection(side: RoofSide): Vector3 {
  if (side === 'front') return new Vector3(0, 0, 1);
  if (side === 'back') return new Vector3(0, 0, -1);
  if (side === 'right') return new Vector3(1, 0, 0);
  return new Vector3(-1, 0, 0);
}

function collectTilePlacements(
  dimensions: RoofDimensions,
  quality: QualityLevel,
): TilePlacement[] {
  const baseColumns = quality === 'high' ? 38 : quality === 'medium' ? 28 : 18;
  const rows = quality === 'high' ? 14 : quality === 'medium' ? 11 : 8;
  const placements: TilePlacement[] = [];

  for (const side of ['front', 'back', 'left', 'right'] as const) {
    const columns = side === 'left' || side === 'right'
      ? Math.max(1, Math.floor(baseColumns / 2))
      : baseColumns;
    for (let row = 0; row < rows; row += 1) {
      const t1 = row / rows;
      const t2 = (row + 1) / rows;
      const t = (t1 + t2) / 2;
      for (let column = 0; column <= columns; column += 1) {
        const ratio = -0.96 + (1.92 * column) / columns;
        const start = roofPointAt(dimensions, side, ratio, t1, 0.08);
        const end = roofPointAt(dimensions, side, ratio, t2, 0.08);
        const tangent = end.clone().sub(start).normalize();
        const acrossStart = roofPointAt(dimensions, side, ratio - 0.01, t, 0.08);
        const acrossEnd = roofPointAt(dimensions, side, ratio + 0.01, t, 0.08);
        const normal = new Vector3()
          .crossVectors(acrossEnd.sub(acrossStart), tangent)
          .normalize();
        if (normal.dot(roofOutwardDirection(side)) < 0) normal.multiplyScalar(-1);
        placements.push({
          position: start.clone().lerp(end, 0.5),
          tangent,
          normal,
          side,
          column,
          columnCount: columns,
          ratio,
          row,
          rowCount: rows,
          t,
          length: start.distanceTo(end) * 0.96,
        });
      }
    }
  }
  return placements;
}

function createInstancedTiles(
  placements: TilePlacement[],
  material: MeshStandardMaterial,
  name: string,
  kind: string,
  edgeColor?: Color,
): InstancedMesh {
  const geometry = new CylinderGeometry(0.14, 0.16, 1, 6, 1, true, 0, Math.PI);
  const mesh = new InstancedMesh(geometry, material, placements.length);
  const quaternion = new Quaternion();
  const basis = new Matrix4();
  const xAxis = new Vector3();
  const yAxis = new Vector3();
  const zAxis = new Vector3();
  const matrix = new Matrix4();
  const scale = new Vector3();
  const base = material.color.clone();
  placements.forEach((placement, index) => {
    yAxis.copy(placement.tangent).normalize();
    xAxis.copy(placement.normal).projectOnPlane(yAxis).normalize();
    zAxis.crossVectors(xAxis, yAxis).normalize();
    basis.makeBasis(xAxis, yAxis, zAxis);
    quaternion.setFromRotationMatrix(basis);
    scale.set(1, placement.length, 1);
    matrix.compose(placement.position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
    const isGreenEdge = placement.row === 0 || Math.abs(placement.ratio) >= 0.95;
    if (isGreenEdge && edgeColor) {
      const tint = edgeColor.clone();
      tint.r /= Math.max(base.r, 0.000001);
      tint.g /= Math.max(base.g, 0.000001);
      tint.b /= Math.max(base.b, 0.000001);
      mesh.setColorAt(index, tint);
    } else {
      const shade = index % 3 === 0 ? 0.93 : index % 3 === 1 ? 1 : 1.05;
      mesh.setColorAt(index, new Color(1, 1, 1).multiplyScalar(shade));
    }
  });
  mesh.name = name;
  mesh.userData.kind = kind;
  mesh.userData.instanceCount = placements.length;
  mesh.userData.surfaceOffset = 0.08;
  mesh.userData.tileOrientationMode = 'surface-normal';
  mesh.userData.tileOpeningDirection = 'toward-roof-surface';
  if (edgeColor) {
    mesh.userData.eaveGreenInstanceCount = placements.filter(({ row }) => row === 0).length;
    mesh.userData.ridgeGreenInstanceCount = placements.filter(
      ({ ratio }) => Math.abs(ratio) >= 0.95,
    ).length;
    mesh.userData.greenEdgeInstanceCount = placements.filter(
      ({ row, ratio }) => row === 0 || Math.abs(ratio) >= 0.95,
    ).length;
    mesh.userData.eaveGreenColor = edgeColor.getHex();
    mesh.userData.edgeGreenColor = edgeColor.getHex();
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  return mesh;
}

const DIAMOND_CENTER_T = 15 / 28;
const DIAMOND_ROW_HALF_WIDTHS = [0, 1, 3, 6, 3, 1, 0] as const;

function isGreenDiamond(placement: TilePlacement): boolean {
  if (placement.side !== 'front') return false;
  const centerRow = Math.ceil(DIAMOND_CENTER_T * placement.rowCount - 0.5);
  const localRow = placement.row - (centerRow - 3);
  if (localRow < 0 || localRow >= DIAMOND_ROW_HALF_WIDTHS.length) return false;
  const centerColumn = placement.columnCount / 2;
  return Math.abs(placement.column - centerColumn) <= DIAMOND_ROW_HALF_WIDTHS[localRow]!;
}

function createTileLines(dimensions: RoofDimensions, quality: QualityLevel, color: number): LineSegments {
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
    new LineBasicMaterial({ color, transparent: true, opacity: 0.72 }),
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
  chiwen.userData.profile = 'simplified-front-reference';

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

  const head = new Mesh(new SphereGeometry(0.42, 14, 10), materials.glazedGreen);
  head.name = '鸱吻简化头部';
  head.userData.kind = 'chiwen-head';
  head.scale.set(1.1, 0.9, 0.82);
  head.position.set(-0.46, 0.94, 0);
  const mouth = new Mesh(new SphereGeometry(0.28, 12, 9), materials.gold);
  mouth.name = '鸱吻抽象吻部';
  mouth.userData.kind = 'chiwen-mouth';
  mouth.scale.set(1.35, 0.35, 0.75);
  mouth.rotation.z = 0.08;
  mouth.position.set(-0.82, 0.67, 0);

  chiwen.add(
    base,
    body,
    tail,
    tailTip,
    ...backScales,
    head,
    mouth,
  );
  chiwen.scale.set(side * 1.05, 0.85, 1.05);
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

function createRidgeEndBeast(
  materials: BuildingMaterials,
  level: 'lower' | 'upper',
): Group {
  const beast = new Group();
  beast.name = level === 'lower' ? '下檐斜脊末端走兽' : '上檐斜脊末端走兽';
  beast.userData.kind = 'ridge-end-beast';
  beast.userData.level = level;

  const base = new Mesh(new BoxGeometry(0.58, 0.15, 0.38), materials.glazedGreen);
  base.userData.kind = 'ridge-end-beast-base';
  const body = new Mesh(new SphereGeometry(0.23, 10, 8), materials.glazedGreen);
  body.scale.set(1.25, 1.05, 0.78);
  body.position.set(0, 0.3, 0);
  const head = new Mesh(new SphereGeometry(0.17, 10, 8), materials.glazedGreen);
  head.scale.set(1.18, 0.95, 0.82);
  head.position.set(0.3, 0.48, 0);
  const snout = new Mesh(new SphereGeometry(0.1, 9, 7), materials.yellowGlaze);
  snout.scale.set(1.35, 0.62, 0.76);
  snout.position.set(0.47, 0.44, 0);
  const crest = new Mesh(new ConeGeometry(0.09, 0.34, 8), materials.glazedGreen);
  crest.rotation.z = -0.48;
  crest.position.set(0.14, 0.68, 0);
  const tail = new Mesh(new ConeGeometry(0.1, 0.42, 8), materials.glazedGreen);
  tail.rotation.z = 0.8;
  tail.position.set(-0.3, 0.43, 0);
  beast.add(base, body, head, snout, crest, tail);
  beast.scale.setScalar(level === 'lower' ? 0.68 : 0.78);
  return beast;
}

function addRidges(group: Group, dimensions: RoofDimensions, materials: BuildingMaterials): void {
  const ridgeY = dimensions.ridgeY + 0.25;
  const ridgeHalf = dimensions.ridgeLength / 2;
  if (dimensions.ridgeStyle !== 'truncated') {
    const mainHeight = 1.2;
    const main = new Mesh(
      new BoxGeometry(dimensions.ridgeLength + 1.2, mainHeight, 0.52),
      materials.glazedGreen,
    );
    main.name = `${dimensions.name}主脊`;
    main.userData.kind = 'main-ridge';
    main.position.set(0, dimensions.ridgeY + mainHeight / 2, 0);
    group.add(main);

    const frontBand = new Mesh(
      new BoxGeometry(dimensions.ridgeLength - 3, 0.22, 0.08),
      materials.yellowGlaze,
    );
    frontBand.name = '最高正脊正面黄琉璃饰带';
    frontBand.userData.kind = 'main-ridge-front-band';
    frontBand.position.set(0, dimensions.ridgeY + 0.6, 0.28);
    group.add(frontBand);
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
        const ornamentLevel = dimensions.ridgeStyle === 'truncated' ? 'lower' : 'upper';
        const eavePoint = hipPoints[0]!;
        const outward = eavePoint.clone().sub(hipPoints[1]!).normalize();
        const endBeast = createRidgeEndBeast(materials, ornamentLevel);
        endBeast.position.copy(eavePoint).add(new Vector3(0, 0.12, 0));
        endBeast.rotation.y = Math.atan2(-outward.z, outward.x);
        endBeast.userData.xSide = xSide;
        endBeast.userData.zSide = zSide;
        endBeast.userData.facing = 'outward';
        group.add(endBeast);

        const midpointIndex = Math.floor(hipPoints.length / 2);
        const midpoint = hipPoints[midpointIndex]!;
        const previous = hipPoints[Math.max(0, midpointIndex - 1)]!;
        const next = hipPoints[Math.min(hipPoints.length - 1, midpointIndex + 1)]!;
        const tangent = next.clone().sub(previous).normalize();
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

function createRoofLevel(
  dimensions: RoofDimensions,
  materials: BuildingMaterials,
  quality: QualityLevel,
  greenDiamond = false,
): Group {
  const group = new Group();
  group.name = dimensions.name;
  group.userData.roofForm = dimensions.ridgeStyle === 'truncated' ? 'truncated-hip' : 'hip';
  group.userData.baseY = dimensions.baseY;
  group.userData.ridgeY = dimensions.ridgeY;
  group.add(createRoofSurface(
    dimensions,
    materials.roofSurface,
    materials.diamondTile.color,
    quality === 'low' ? 8 : quality === 'medium' ? 12 : 16,
  ));
  const placements = collectTilePlacements(dimensions, quality);
  group.userData.tilePlacementCounts = placements.reduce<Record<RoofSide, number>>(
    (counts, placement) => {
      counts[placement.side] += 1;
      return counts;
    },
    { front: 0, back: 0, left: 0, right: 0 },
  );
  const ordinaryPlacements = greenDiamond ? placements.filter((placement) => !isGreenDiamond(placement)) : placements;
  group.add(createInstancedTiles(
    ordinaryPlacements,
    materials.tile,
    '坡面筒瓦覆盖',
    'roof-tile-covering',
    materials.diamondTile.color,
  ));
  if (greenDiamond) {
    const greenPlacements = placements.filter(isGreenDiamond);
    const diamond = createInstancedTiles(
      greenPlacements,
      materials.diamondTile,
      '二层中央菱形绿瓦',
      'green-diamond-tiles',
    );
    diamond.userData.face = 'front';
    const rowCounts = new Map<string, number>();
    greenPlacements.forEach(({ t }) => {
      const key = t.toFixed(8);
      rowCounts.set(key, (rowCounts.get(key) ?? 0) + 1);
    });
    const minRatio = Math.min(...greenPlacements.map(({ ratio }) => ratio));
    const maxRatio = Math.max(...greenPlacements.map(({ ratio }) => ratio));
    const minT = Math.min(...greenPlacements.map(({ t }) => t));
    const maxT = Math.max(...greenPlacements.map(({ t }) => t));
    const atValue = (value: number, target: number): boolean => Math.abs(value - target) < 1e-8;
    diamond.userData.horizontalTileSpan = Math.max(...rowCounts.values());
    diamond.userData.verticalTileRows = rowCounts.size;
    diamond.userData.rowTileCounts = [...rowCounts.entries()]
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, count]) => count);
    diamond.userData.tipInstanceCounts = {
      left: greenPlacements.filter(({ ratio }) => atValue(ratio, minRatio)).length,
      right: greenPlacements.filter(({ ratio }) => atValue(ratio, maxRatio)).length,
      top: greenPlacements.filter(({ t }) => atValue(t, maxT)).length,
      bottom: greenPlacements.filter(({ t }) => atValue(t, minT)).length,
    };
    diamond.userData.maskCenterT = DIAMOND_CENTER_T;
    diamond.userData.maskMode = 'discrete-grid';
    diamond.userData.rowHalfWidths = [...DIAMOND_ROW_HALF_WIDTHS];
    group.add(diamond);
  }
  group.add(createTileLines(dimensions, quality, materials.tileRib.color.getHex()));

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
        baseY: LOWER_ROOF_BASE_Y,
        ridgeY: LOWER_ROOF_RIDGE_Y,
        eaveLift: 0.58,
        ridgeStyle: 'truncated',
      },
      materials,
      quality,
    ),
  );
  const upperRoof = createRoofLevel(
    {
        name: '上檐庑殿顶',
        width: data.planWidth.value * 0.82 + 6.5,
        depth: getUpperRoofFrontEaveZ(data) * 2,
        ridgeLength: data.planWidth.value * 0.48,
        baseY: UPPER_ROOF_BASE_Y,
        ridgeY: data.upperRidgeHeight - UPPER_ROOF_DROP - ROOF_STACK_DROP,
        eaveLift: 0.72,
        ridgeStyle: 'chiwen',
      },
    materials,
    quality,
    true,
  );
  upperRoof.userData.frontEaveZ = getUpperRoofFrontEaveZ(data);
  roofs.add(upperRoof);
  return roofs;
}
