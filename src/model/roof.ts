import {
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Material,
} from 'three';
import type { BuildingData } from '../data/building';
import type { BuildingMaterials } from './materials';
import { sampleRaisedEaveProfile } from './roof-profile';
import type { QualityLevel } from './types';

interface RoofDimensions {
  width: number;
  depth: number;
  ridgeLength: number;
  baseY: number;
  ridgeY: number;
  eaveLift: number;
  name: string;
}

function profileY(t: number, dimensions: RoofDimensions): number {
  const rise = dimensions.ridgeY - dimensions.baseY;
  return dimensions.baseY + dimensions.eaveLift + (rise - dimensions.eaveLift) * (0.18 * t + 0.82 * t * t);
}

function wingLift(positionRatio: number, t: number): number {
  const edge = Math.max(0, (Math.abs(positionRatio) - 0.64) / 0.36);
  return edge * edge * (1 - t) * 0.72;
}

function createRoofSurface(dimensions: RoofDimensions, material: Material, segments: number): Mesh {
  const vertices: number[] = [];
  const indices: number[] = [];
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const ridgeHalf = dimensions.ridgeLength / 2;
  const across = Math.max(12, Math.round(segments * 1.6));

  const addSurface = (side: 'front' | 'back' | 'left' | 'right'): void => {
    const baseIndex = vertices.length / 3;
    for (let row = 0; row <= segments; row += 1) {
      const t = row / segments;
      const extentX = halfWidth + (ridgeHalf - halfWidth) * t;
      const extentZ = halfDepth * (1 - t);
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
        vertices.push(x, profileY(t, dimensions) + wingLift(ratio, t), z);
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
  for (const face of [-1, 1]) {
    for (let index = 0; index <= count; index += 1) {
      const ratio = -1 + (2 * index) / count;
      for (let segment = 0; segment < points.length - 1; segment += 1) {
        const current = points[segment];
        const next = points[segment + 1];
        if (!current || !next) continue;
        const t1 = current.x / (dimensions.depth / 2);
        const t2 = next.x / (dimensions.depth / 2);
        const x1 = ratio * (dimensions.width / 2 + (dimensions.ridgeLength / 2 - dimensions.width / 2) * t1);
        const x2 = ratio * (dimensions.width / 2 + (dimensions.ridgeLength / 2 - dimensions.width / 2) * t2);
        positions.push(
          x1,
          dimensions.baseY + current.y + wingLift(ratio, t1) + 0.05,
          face * (dimensions.depth / 2 - current.x),
          x2,
          dimensions.baseY + next.y + wingLift(ratio, t2) + 0.05,
          face * (dimensions.depth / 2 - next.x),
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

function addRidges(group: Group, dimensions: RoofDimensions, materials: BuildingMaterials): void {
  const ridgeY = dimensions.ridgeY + 0.25;
  const ridgeHalf = dimensions.ridgeLength / 2;
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const main = new Mesh(new CylinderGeometry(0.3, 0.36, dimensions.ridgeLength + 1.2, 12), materials.glazedGreen);
  main.rotation.z = Math.PI / 2;
  main.position.set(0, ridgeY, 0);
  group.add(main);

  for (const xSide of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const hip = createRidgeTube(
        [
          new Vector3(xSide * ridgeHalf, ridgeY, 0),
          new Vector3(xSide * (ridgeHalf + halfWidth) * 0.52, dimensions.baseY + (ridgeY - dimensions.baseY) * 0.48 + 0.45, zSide * halfDepth * 0.5),
          new Vector3(xSide * halfWidth, dimensions.baseY + dimensions.eaveLift + 0.65, zSide * halfDepth),
        ],
        0.22,
        materials.glazedGreen,
      );
      group.add(hip);
    }
  }

  for (const side of [-1, 1]) {
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

function createRoofLevel(dimensions: RoofDimensions, materials: BuildingMaterials, quality: QualityLevel): Group {
  const group = new Group();
  group.name = dimensions.name;
  group.add(createRoofSurface(dimensions, materials.tile, quality === 'low' ? 8 : quality === 'medium' ? 12 : 16));
  group.add(createTileLines(dimensions, quality, false));

  const eaveBand = new Mesh(new CylinderGeometry(0.2, 0.25, dimensions.width + 0.8, 10), materials.glazedGreen);
  eaveBand.rotation.z = Math.PI / 2;
  eaveBand.position.set(0, dimensions.baseY + dimensions.eaveLift + 0.03, dimensions.depth / 2 + 0.1);
  const rearBand = eaveBand.clone();
  rearBand.position.z *= -1;
  group.add(eaveBand, rearBand);

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
        ridgeLength: data.planWidth.value * 0.69,
        baseY: 8.72,
        ridgeY: 13.8,
        eaveLift: 0.58,
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
        baseY: 16.55,
        ridgeY: data.upperRidgeHeight,
        eaveLift: 0.72,
      },
      materials,
      quality,
    ),
  );
  return roofs;
}
