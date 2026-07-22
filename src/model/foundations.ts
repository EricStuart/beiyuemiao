import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  Vector3,
  type Material,
} from 'three';
import type { BuildingData } from '../data/building';
import type { BuildingMaterials } from './materials';

export interface FoundationResult {
  group: Group;
  collisions: Box3[];
}

function box(width: number, height: number, depth: number, material: Material): Mesh {
  return new Mesh(new BoxGeometry(width, height, depth), material);
}

function addStraightBalustrade(
  root: Group,
  side: string,
  orientation: 'x' | 'z',
  length: number,
  x: number,
  z: number,
  platformTop: number,
  material: Material,
): void {
  if (length <= 0.8) return;
  const railGroup = new Group();
  railGroup.name = `白石栏杆-${side}`;
  railGroup.userData.kind = 'platform-balustrade';
  railGroup.userData.side = side;

  const panel = box(
    orientation === 'x' ? length : 0.3,
    0.34,
    orientation === 'z' ? length : 0.3,
    material,
  );
  panel.position.set(x, platformTop + 0.54, z);
  railGroup.add(panel);

  const postCount = Math.max(2, Math.ceil(length / 4));
  for (let index = 0; index <= postCount; index += 1) {
    const ratio = index / postCount;
    const post = new Mesh(new CylinderGeometry(0.2, 0.25, 1.35, 8), material);
    post.position.set(
      orientation === 'x' ? x - length / 2 + length * ratio : x,
      platformTop + 0.62,
      orientation === 'z' ? z - length / 2 + length * ratio : z,
    );
    railGroup.add(post);
  }
  root.add(railGroup);
}

function addStairBalustrade(
  root: Group,
  stairSide: 'front' | 'left' | 'right',
  railIndex: number,
  low: Vector3,
  high: Vector3,
  groundY: number,
  platformTop: number,
  material: Material,
): void {
  const railGroup = new Group();
  railGroup.name = `${stairSide}楼梯坡栏-${railIndex}`;
  railGroup.userData.kind = 'stair-balustrade';
  railGroup.userData.stairSide = stairSide;
  railGroup.userData.railIndex = railIndex;

  const direction = high.clone().sub(low);
  const rail = box(0.34, 0.3, direction.length(), material);
  rail.position.copy(low).add(high).multiplyScalar(0.5);
  rail.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), direction.clone().normalize());
  railGroup.add(rail);

  for (let index = 0; index <= 5; index += 1) {
    const ratio = index / 5;
    const post = new Mesh(new CylinderGeometry(0.2, 0.26, 1.3, 8), material);
    post.position.lerpVectors(low, high, ratio);
    post.position.y = groundY + (platformTop - groundY) * ratio + 0.62;
    railGroup.add(post);
  }
  root.add(railGroup);
}

export function createFoundations(data: BuildingData, materials: BuildingMaterials): FoundationResult {
  const group = new Group();
  group.name = '台基与庭院';
  const width = data.planWidth.value + 7.2;
  const depth = data.planDepth.value + 6.2;
  const visiblePlatformHeight = 2.9;
  const groundY = data.platformHeight - visiblePlatformHeight;

  const ground = new Mesh(new PlaneGeometry(170, 150), materials.brick);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY;
  ground.receiveShadow = true;
  ground.userData.shadowReceiverOnly = true;
  ground.userData.kind = 'courtyard-ground';
  ground.name = '院落地面';
  group.add(ground);

  const lowerHeight = 0.75;
  const lower = box(width + 2.4, lowerHeight, depth + 2.4, materials.brick);
  lower.position.y = groundY + lowerHeight / 2;
  const middleHeight = 0.65;
  const middleBottom = groundY + lowerHeight;
  const middle = box(width + 1.1, middleHeight, depth + 1.1, materials.stone);
  middle.position.y = middleBottom + middleHeight / 2;
  const capHeight = 0.18;
  const upperBottom = middleBottom + middleHeight;
  const upperTop = data.platformHeight - capHeight;
  const upper = box(width, upperTop - upperBottom, depth, materials.brick);
  upper.position.y = (upperBottom + upperTop) / 2;
  upper.name = '主体台基';
  upper.userData.kind = 'platform-wall';
  const cap = box(width + 0.35, capHeight, depth + 0.35, materials.stone);
  cap.position.y = upperTop + capHeight / 2;
  cap.name = '主体台基顶面';
  cap.userData.kind = 'platform-main';
  group.add(lower, middle, upper, cap);

  const terraceWidth = 26;
  const terraceDepth = 10;
  const frontEdge = depth / 2;
  const terrace = new Group();
  terrace.name = '前凸月台';
  terrace.userData.kind = 'platform-terrace';
  const terraceCenterZ = frontEdge + terraceDepth / 2;
  const terraceWall = box(terraceWidth, upperTop - groundY, terraceDepth, materials.brick);
  terraceWall.position.set(0, (groundY + upperTop) / 2, terraceCenterZ);
  const terraceBand = box(terraceWidth + 0.45, 0.28, terraceDepth + 0.45, materials.stone);
  terraceBand.position.set(0, groundY + 0.9, terraceCenterZ);
  const terraceCap = box(terraceWidth + 0.3, capHeight, terraceDepth + 0.3, materials.stone);
  terraceCap.position.set(0, upperTop + capHeight / 2, terraceCenterZ);
  terrace.add(terraceWall, terraceBand, terraceCap);
  group.add(terrace);

  const stairWidth = 10.8;
  const stepCount = 10;
  const stepDepth = 0.56;
  const terraceFront = frontEdge + terraceDepth;
  for (let index = 0; index < stepCount; index += 1) {
    const height = visiblePlatformHeight * ((index + 1) / stepCount);
    const step = box(stairWidth, height, stepDepth + 0.08, materials.stone);
    step.position.set(
      0,
      groundY + height / 2,
      terraceFront + (stepCount - index - 0.5) * stepDepth,
    );
    step.name = '正面台阶';
    step.userData.kind = 'platform-step';
    step.userData.side = 'front';
    step.userData.index = index;
    group.add(step);
  }

  const sideStairWidth = 3.4;
  const sideStepRun = terraceDepth / stepCount;
  for (const side of [-1, 1]) {
    const sideName = side < 0 ? 'left' : 'right';
    for (let index = 0; index < stepCount; index += 1) {
      const height = visiblePlatformHeight * ((index + 1) / stepCount);
      const step = box(sideStairWidth, height, sideStepRun + 0.08, materials.stone);
      step.position.set(
        side * (terraceWidth / 2 + sideStairWidth / 2),
        groundY + height / 2,
        terraceFront - (index + 0.5) * sideStepRun,
      );
      step.name = side < 0 ? '左侧台阶' : '右侧台阶';
      step.userData.kind = 'platform-step';
      step.userData.side = sideName;
      step.userData.index = index;
      group.add(step);
    }
  }

  const mainEdgeX = (width + 0.35) / 2;
  const mainFrontZ = (depth + 0.35) / 2;
  const mainRearZ = -mainFrontZ;
  const terraceHalf = terraceWidth / 2;
  const mainFrontSegment = mainEdgeX - terraceHalf - 0.35;
  for (const side of [-1, 1]) {
    addStraightBalustrade(
      group,
      'front',
      'x',
      mainFrontSegment,
      side * (terraceHalf + 0.35 + mainFrontSegment / 2),
      mainFrontZ,
      data.platformHeight,
      materials.stone,
    );
  }
  addStraightBalustrade(group, 'rear', 'x', width + 0.35, 0, mainRearZ, data.platformHeight, materials.stone);
  addStraightBalustrade(group, 'left', 'z', depth + 0.35, -mainEdgeX, 0, data.platformHeight, materials.stone);
  addStraightBalustrade(group, 'right', 'z', depth + 0.35, mainEdgeX, 0, data.platformHeight, materials.stone);

  const terraceFrontSegment = (terraceWidth - stairWidth) / 2 - 0.35;
  for (const side of [-1, 1]) {
    addStraightBalustrade(
      group,
      'terrace-front',
      'x',
      terraceFrontSegment,
      side * (stairWidth / 2 + 0.35 + terraceFrontSegment / 2),
      terraceFront + 0.15,
      data.platformHeight,
      materials.stone,
    );
  }
  const terraceSideRailLength = terraceDepth - 1.4;
  const terraceSideRailZ = frontEdge + 1.4 + terraceSideRailLength / 2;
  addStraightBalustrade(group, 'terrace-left', 'z', terraceSideRailLength, -terraceHalf - 0.15, terraceSideRailZ, data.platformHeight, materials.stone);
  addStraightBalustrade(group, 'terrace-right', 'z', terraceSideRailLength, terraceHalf + 0.15, terraceSideRailZ, data.platformHeight, materials.stone);

  const frontRailLowZ = terraceFront + stepCount * stepDepth - 0.2;
  const frontRailHighZ = terraceFront + 0.25;
  for (const side of [-1, 1]) {
    const x = side * (stairWidth / 2 + 0.35);
    addStairBalustrade(
      group,
      'front',
      side,
      new Vector3(x, groundY + 0.62, frontRailLowZ),
      new Vector3(x, data.platformHeight + 0.62, frontRailHighZ),
      groundY,
      data.platformHeight,
      materials.stone,
    );
  }

  for (const side of [-1, 1]) {
    const stairSide = side < 0 ? 'left' : 'right';
    const innerX = side * (terraceHalf + 0.22);
    const outerX = side * (terraceHalf + sideStairWidth - 0.22);
    for (const [railIndex, x] of [[0, innerX], [1, outerX]] as const) {
      addStairBalustrade(
        group,
        stairSide,
        railIndex,
        new Vector3(x, groundY + 0.62, terraceFront - 0.25),
        new Vector3(x, data.platformHeight + 0.62, frontEdge + 0.4),
        groundY,
        data.platformHeight,
        materials.stone,
      );
    }
  }

  return {
    group,
    collisions: [new Box3().setFromObject(lower), new Box3().setFromObject(upper)],
  };
}
