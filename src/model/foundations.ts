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

  const ground = new Mesh(new PlaneGeometry(170, 150), materials.brick);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  ground.userData.shadowReceiverOnly = true;
  ground.name = '院落地面';
  group.add(ground);

  const lower = box(width + 2.4, 0.65, depth + 2.4, materials.brick);
  lower.position.y = 0.325;
  const middle = box(width + 1.1, 0.62, depth + 1.1, materials.stone);
  middle.position.y = 0.96;
  const capHeight = 0.18;
  const upperBottom = 1.27;
  const upperTop = data.platformHeight - capHeight;
  const upper = box(width, upperTop - upperBottom, depth, materials.brick);
  upper.position.y = (upperBottom + upperTop) / 2;
  const cap = box(width + 0.35, capHeight, depth + 0.35, materials.stone);
  cap.position.y = upperTop + capHeight / 2;
  group.add(lower, middle, upper, cap);

  const stairWidth = 10.8;
  const stepCount = 10;
  const stepDepth = 0.56;
  const frontEdge = depth / 2;
  for (let index = 0; index < stepCount; index += 1) {
    const height = data.platformHeight * ((index + 1) / stepCount);
    const step = box(stairWidth, height, stepDepth + 0.08, materials.stone);
    step.position.set(0, height / 2, frontEdge + 3.15 - index * stepDepth);
    group.add(step);
  }

  const railZ = frontEdge + 0.5;
  for (const side of [-1, 1]) {
    const rail = box(0.42, 0.56, 6.5, materials.stone);
    rail.rotation.x = -0.28;
    rail.position.set(side * (stairWidth / 2 + 0.4), 1.45, railZ + 0.1);
    group.add(rail);
    for (let index = 0; index <= 5; index += 1) {
      const post = new Mesh(new CylinderGeometry(0.22, 0.28, 1.35, 8), materials.stone);
      post.position.set(side * (stairWidth / 2 + 0.4), 1.2 + index * 0.17, frontEdge + 3 - index * 1.08);
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
