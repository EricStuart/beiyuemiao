import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
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

  const terraceWidth = 15.6;
  const terraceDepth = 5.8;
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
    group.add(step);
  }

  const railZ = terraceFront + (stepCount * stepDepth) / 2;
  for (const side of [-1, 1]) {
    const rail = box(0.42, 0.56, 6.5, materials.stone);
    rail.rotation.x = -0.42;
    rail.position.set(side * (stairWidth / 2 + 0.4), groundY + 1.55, railZ);
    group.add(rail);
    for (let index = 0; index <= 5; index += 1) {
      const post = new Mesh(new CylinderGeometry(0.22, 0.28, 1.35, 8), materials.stone);
      post.position.set(
        side * (stairWidth / 2 + 0.4),
        groundY + 0.78 + index * 0.4,
        terraceFront + stepCount * stepDepth - index * 1.08,
      );
      group.add(post);
    }
  }

  const balustradeZ = depth / 2 - 0.25;
  for (let index = 0; index <= 9; index += 1) {
    const x = -width / 2 + (width / 9) * index;
    if (Math.abs(x) < stairWidth / 2 + 1) continue;
    const post = new Mesh(new CylinderGeometry(0.2, 0.25, 1.35, 8), materials.stone);
    post.position.set(x, data.platformHeight + 0.62, balustradeZ);
    group.add(post);
  }
  const leftRail = box((width - stairWidth) / 2 - 1.2, 0.34, 0.3, materials.stone);
  leftRail.position.set(-(width + stairWidth) / 4 - 0.3, data.platformHeight + 0.55, balustradeZ);
  const rightRail = leftRail.clone();
  rightRail.position.x *= -1;
  group.add(leftRail, rightRail);

  return {
    group,
    collisions: [new Box3().setFromObject(lower), new Box3().setFromObject(upper)],
  };
}
