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
import { createTerraceCenser } from './censer';
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
  railKind = 'platform-balustrade',
  omitStartPost = false,
): void {
  if (length <= 0.1) return;
  const railGroup = new Group();
  railGroup.name = `白石栏杆-${side}`;
  railGroup.userData.kind = railKind;
  railGroup.userData.side = side;

  const boardHeight = 0.9;
  const panel = box(
    orientation === 'x' ? length : 0.3,
    boardHeight,
    orientation === 'z' ? length : 0.3,
    material,
  );
  panel.position.set(x, platformTop + boardHeight / 2, z);
  panel.userData.kind = 'platform-balustrade-board';
  railGroup.add(panel);

  const postCount = Math.max(2, Math.ceil(length / 4));
  for (let index = omitStartPost ? 1 : 0; index <= postCount; index += 1) {
    const ratio = index / postCount;
    const post = new Mesh(new CylinderGeometry(0.2, 0.25, 1.35, 8), material);
    post.position.set(
      orientation === 'x' ? x - length / 2 + length * ratio : x,
      platformTop + 0.62,
      orientation === 'z' ? z - length / 2 + length * ratio : z,
    );
    post.userData.kind = 'platform-balustrade-post';
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
  rail.userData.kind = 'stair-balustrade-board';
  railGroup.add(rail);

  for (let index = 0; index <= 5; index += 1) {
    const ratio = index / 5;
    const post = new Mesh(new CylinderGeometry(0.2, 0.26, 1.3, 8), material);
    post.position.lerpVectors(low, high, ratio);
    post.position.y = groundY + (platformTop - groundY) * ratio + 0.62;
    post.userData.kind = 'stair-balustrade-post';
    if (index === 0) post.userData.endpoint = 'low';
    if (index === 5) post.userData.endpoint = 'high';
    railGroup.add(post);
  }
  railGroup.userData.low = low.toArray();
  railGroup.userData.high = high.toArray();
  root.add(railGroup);
}

export function createFoundations(data: BuildingData, materials: BuildingMaterials): FoundationResult {
  const group = new Group();
  group.name = '台基与庭院';
  const width = data.platformWidth.value;
  const depth = data.platformDepth.value;
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

  const capHeight = 0.18;
  const upperTop = data.platformHeight - capHeight;
  const platformWall = box(width, upperTop - groundY, depth, materials.brick);
  platformWall.position.y = (groundY + upperTop) / 2;
  platformWall.name = '主体台基';
  platformWall.userData.kind = 'platform-wall';
  const cap = box(width + 0.35, capHeight, depth + 0.35, materials.stone);
  cap.position.y = upperTop + capHeight / 2;
  cap.name = '主体台基顶面';
  cap.userData.kind = 'platform-main';
  group.add(platformWall, cap);
  const mainPaving = box(width - 0.6, 0.08, depth - 0.6, materials.paving);
  mainPaving.position.y = data.platformHeight + 0.04;
  mainPaving.name = '主台基灰砖铺地';
  mainPaving.userData.kind = 'platform-paving';
  group.add(mainPaving);

  const terraceWidth = data.terraceWidth.value;
  const terraceDepth = data.terraceDepth.value;
  const frontEdge = depth / 2;
  const terrace = new Group();
  terrace.name = '前凸月台';
  terrace.userData.kind = 'platform-terrace';
  const terraceCenterZ = frontEdge + terraceDepth / 2;
  const terraceWall = box(terraceWidth, upperTop - groundY, terraceDepth, materials.brick);
  terraceWall.userData.kind = 'terrace-wall';
  terraceWall.position.set(0, (groundY + upperTop) / 2, terraceCenterZ);
  const terraceCap = box(terraceWidth + 0.3, capHeight, terraceDepth + 0.3, materials.stone);
  terraceCap.position.set(0, upperTop + capHeight / 2, terraceCenterZ);
  const terracePaving = box(terraceWidth - 0.3, 0.08, terraceDepth - 0.3, materials.paving);
  terracePaving.position.set(0, data.platformHeight + 0.04, terraceCenterZ);
  terracePaving.name = '月台灰砖铺地';
  terracePaving.userData.kind = 'terrace-paving';
  terrace.add(terraceWall, terraceCap, terracePaving);
  group.add(terrace);
  group.add(createTerraceCenser(data, materials));

  const stairWidth = 6.4;
  const stepCount = 12;
  const stepDepth = 5.5 / stepCount;
  const terraceFront = frontEdge + terraceDepth;
  for (let index = 0; index < stepCount; index += 1) {
    const height = visiblePlatformHeight * ((index + 1) / stepCount);
    const step = box(stairWidth, height, stepDepth, materials.stone);
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

  const sideStairWidth = 3.0;
  const sideFlightLength = 4.8;
  const sideStepRun = sideFlightLength / stepCount;
  const sideStairZ = frontEdge + sideStairWidth / 2;
  const sideRailZ = sideStairZ + sideStairWidth / 2 - 0.28;
  for (const side of [-1, 1]) {
    const sideName = side < 0 ? 'left' : 'right';
    for (let index = 0; index < stepCount; index += 1) {
      const height = visiblePlatformHeight * ((index + 1) / stepCount);
      const step = box(sideStepRun, height, sideStairWidth, materials.stone);
      step.position.set(
        side * (terraceWidth / 2 + (stepCount - index - 0.5) * sideStepRun),
        groundY + height / 2,
        sideStairZ,
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
  const sideFlightOuterX = terraceHalf + sideFlightLength;
  const mainFrontSegment = mainEdgeX - sideFlightOuterX;
  for (const side of [-1, 1]) {
    addStraightBalustrade(
      group,
      'front',
      'x',
      mainFrontSegment,
      side * (sideFlightOuterX + mainFrontSegment / 2),
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
  const terraceSideRailLength = terraceFront - sideRailZ;
  const terraceSideRailZ = sideRailZ + terraceSideRailLength / 2;
  addStraightBalustrade(group, 'terrace-left', 'z', terraceSideRailLength, -terraceHalf - 0.15, terraceSideRailZ, data.platformHeight, materials.stone, 'platform-balustrade', true);
  addStraightBalustrade(group, 'terrace-right', 'z', terraceSideRailLength, terraceHalf + 0.15, terraceSideRailZ, data.platformHeight, materials.stone, 'platform-balustrade', true);

  const frontRailLowZ = terraceFront + stepCount * stepDepth - 0.2;
  const frontRailHighZ = terraceFront + 0.25;
  for (const side of [-1, 1]) {
    const x = side * (stairWidth / 2 - 0.28);
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
    const highX = side * (terraceHalf + 0.15);
    const lowX = side * (terraceHalf + sideFlightLength - 0.28);
    addStairBalustrade(
      group,
      stairSide,
      1,
      new Vector3(lowX, groundY + 0.62, sideRailZ),
      new Vector3(highX, data.platformHeight + 0.62, sideRailZ),
      groundY,
      data.platformHeight,
      materials.stone,
    );
  }

  return {
    group,
    collisions: [new Box3().setFromObject(platformWall)],
  };
}
