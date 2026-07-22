import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  type Material,
} from 'three';
import type { BuildingData } from '../data/building';
import { createAxisCoordinates } from './grid';
import type { BuildingMaterials } from './materials';

export interface TimberFrameResult {
  grid: Group;
  brackets: Group;
}

type EnclosureSide = 'front' | 'rear' | 'left' | 'right';

function beam(width: number, height: number, depth: number, material: Material): Mesh {
  return new Mesh(new BoxGeometry(width, height, depth), material);
}

function addColumn(
  group: Group,
  x: number,
  z: number,
  bottom: number,
  top: number,
  radius: number,
  material: Material,
  level: 'lower' | 'upper',
): void {
  const column = new Mesh(new CylinderGeometry(radius * 0.9, radius, top - bottom, 14), material);
  column.position.set(x, (bottom + top) / 2, z);
  column.name = level === 'lower' ? '首层柱' : '上层柱';
  column.userData.level = level;
  column.userData.kind = 'column';
  group.add(column);
}

function addBracketSet(
  group: Group,
  x: number,
  y: number,
  z: number,
  materials: BuildingMaterials,
  level: 'lower' | 'upper',
  inward = false,
  role: 'column' | 'intercolumn' = 'column',
  side?: EnclosureSide,
  tier?: 'lower' | 'middle' | 'upper',
): void {
  const set = new Group();
  set.position.set(x, y, z);
  set.name = level === 'lower' ? '首层斗栱' : '上层斗栱';
  set.userData.level = level;
  set.userData.kind = 'bracket';
  set.userData.role = role;
  set.userData.side = side;
  set.userData.tier = tier;
  if (inward) set.rotation.y = Math.PI / 2;
  const bearing = beam(1.55, 0.24, 0.62, materials.paintedGreen);
  const block = beam(0.72, 0.42, 0.72, materials.paintedBlue);
  block.position.y = 0.31;
  const arm = beam(0.42, 0.3, 1.82, materials.timber);
  arm.position.y = 0.58;
  const cap = beam(2.15, 0.24, 0.48, materials.paintedGreen);
  cap.position.y = 0.78;
  set.add(bearing, block, arm, cap);
  if (level === 'upper') {
    const lowerDou = beam(0.58, 0.24, 0.82, materials.paintedBlue);
    lowerDou.position.y = -0.18;
    const secondArm = beam(2.45, 0.22, 0.38, materials.timber);
    secondArm.position.y = 0.45;
    const forwardAng = beam(0.34, 0.24, 2.35, materials.darkTimber);
    forwardAng.position.y = 0.64;
    const eaveBearer = beam(2.75, 0.22, 0.5, materials.paintedGreen);
    eaveBearer.position.y = 0.94;
    set.add(lowerDou, secondArm, forwardAng, eaveBearer);
    const tierScale = tier === 'lower' ? 0.78 : tier === 'middle' ? 0.9 : 1;
    const roleScale = role === 'intercolumn' ? 0.82 : 1;
    set.scale.set(roleScale * tierScale, (role === 'intercolumn' ? 0.9 : 1) * tierScale, roleScale * tierScale);
  }
  group.add(set);
}

function addPerimeterColumns(
  group: Group,
  xAxis: readonly number[],
  zAxis: readonly number[],
  bottom: number,
  top: number,
  radius: number,
  material: Material,
  level: 'lower' | 'upper',
): void {
  const front = zAxis.at(-1);
  const rear = zAxis[0];
  if (front === undefined || rear === undefined) return;
  for (const x of xAxis) {
    addColumn(group, x, front, bottom, top, radius, material, level);
    addColumn(group, x, rear, bottom, top, radius, material, level);
  }
  for (const z of zAxis.slice(1, -1)) {
    addColumn(group, xAxis[0] ?? 0, z, bottom, top, radius, material, level);
    addColumn(group, xAxis.at(-1) ?? 0, z, bottom, top, radius, material, level);
  }
}

function addEnclosurePanel(
  group: Group,
  side: EnclosureSide,
  bay: number,
  start: number,
  end: number,
  fixedCoordinate: number,
  platformTop: number,
  height: number,
  materials: BuildingMaterials,
): void {
  const facade = side === 'front' || side === 'rear';
  const span = end - start;
  const panel = beam(
    facade ? span - 0.36 : 0.32,
    height,
    facade ? 0.32 : span - 0.36,
    materials.door,
  );
  panel.name = '首层围护板';
  panel.userData.kind = 'enclosure-panel';
  panel.userData.side = side;
  panel.userData.bay = bay;
  panel.position.set(
    facade ? (start + end) / 2 : fixedCoordinate,
    platformTop + height / 2,
    facade ? fixedCoordinate : (start + end) / 2,
  );
  group.add(panel);

  for (let stud = 1; stud < 4; stud += 1) {
    const mullion = beam(
      facade ? 0.12 : 0.42,
      height - 0.25,
      facade ? 0.42 : 0.12,
      materials.darkTimber,
    );
    mullion.name = '首层围护竖棂';
    mullion.userData.kind = 'enclosure-mullion';
    mullion.userData.side = side;
    mullion.userData.bay = bay;
    mullion.position.set(
      facade ? start + (span / 4) * stud : fixedCoordinate,
      platformTop + height / 2,
      facade ? fixedCoordinate : start + (span / 4) * stud,
    );
    group.add(mullion);
  }
}

function createPlaque(materials: BuildingMaterials): Group {
  const plaque = new Group();
  plaque.name = '德宁之殿牌匾';
  plaque.userData.kind = 'plaque';

  const board = beam(5.4, 2.8, 0.28, materials.paintedGreen);
  board.name = '牌匾绿色底板';
  const topFrame = beam(6.2, 0.28, 0.42, materials.timber);
  topFrame.position.y = 1.53;
  const bottomFrame = topFrame.clone();
  bottomFrame.position.y = -1.53;
  const leftFrame = beam(0.32, 3.35, 0.42, materials.timber);
  leftFrame.position.x = -2.92;
  const rightFrame = leftFrame.clone();
  rightFrame.position.x = 2.92;
  const goldTop = beam(5.25, 0.1, 0.08, materials.gold);
  goldTop.position.set(0, 1.28, 0.19);
  const goldBottom = goldTop.clone();
  goldBottom.position.y = -1.28;
  plaque.add(board, topFrame, bottomFrame, leftFrame, rightFrame, goldTop, goldBottom);

  for (const side of [-1, 1]) {
    const pendant = beam(0.48, 1.25, 0.34, materials.timber);
    pendant.position.set(side * 2.94, -1.95, 0);
    pendant.rotation.z = side * 0.18;
    const wing = beam(0.9, 0.22, 0.35, materials.timber);
    wing.position.set(side * 3.18, 1.58, 0);
    wing.rotation.z = side * 0.12;
    plaque.add(pendant, wing);
  }

  return plaque;
}

export function createTimberFrame(data: BuildingData, materials: BuildingMaterials): TimberFrameResult {
  const grid = new Group();
  grid.name = '柱网与围护';
  const brackets = new Group();
  brackets.name = '斗栱';
  const xAxis = createAxisCoordinates(data.bayWidths, data.planWidth.value);
  const zAxis = createAxisCoordinates(data.depthWidths, data.planDepth.value);
  const platformTop = data.platformHeight;
  const outerTop = platformTop + data.corridorColumnHeight.value;

  addPerimeterColumns(grid, xAxis, zAxis, platformTop, outerTop, 0.46, materials.timber, 'lower');

  const hallXAxis = xAxis.slice(1, -1);
  const hallZAxis = zAxis.slice(1, -1);
  addPerimeterColumns(grid, hallXAxis, hallZAxis, platformTop, outerTop + 0.25, 0.5, materials.darkTimber, 'lower');

  const frontZ = zAxis.at(-1) ?? 0;
  const rearZ = zAxis[0] ?? 0;
  const fullWidth = data.planWidth.value + 0.8;
  for (const z of [frontZ, rearZ]) {
    const lowerBeam = beam(fullWidth, 0.48, 0.54, materials.darkTimber);
    lowerBeam.position.set(0, outerTop - 0.15, z);
    const paintedBeam = beam(fullWidth + 0.7, 0.42, 0.6, materials.paintedGreen);
    paintedBeam.position.set(0, outerTop + 0.35, z);
    grid.add(lowerBeam, paintedBeam);
  }

  const lowerEnclosure = new Group();
  lowerEnclosure.name = '首层围护';
  const hallFront = hallZAxis.at(-1) ?? frontZ - 3;
  const hallRear = hallZAxis[0] ?? rearZ + 3;
  const hallLeft = hallXAxis[0] ?? 0;
  const hallRight = hallXAxis.at(-1) ?? 0;
  const enclosureHeight = data.corridorColumnHeight.value;

  for (let bay = 0; bay < hallXAxis.length - 1; bay += 1) {
    const left = hallXAxis[bay];
    const right = hallXAxis[bay + 1];
    if (left === undefined || right === undefined) continue;
    if (bay !== 3) {
      addEnclosurePanel(lowerEnclosure, 'front', bay, left, right, hallFront - 0.05, platformTop, enclosureHeight, materials);
    }
    addEnclosurePanel(lowerEnclosure, 'rear', bay, left, right, hallRear + 0.05, platformTop, enclosureHeight, materials);
  }

  for (let bay = 0; bay < hallZAxis.length - 1; bay += 1) {
    const rear = hallZAxis[bay];
    const front = hallZAxis[bay + 1];
    if (rear === undefined || front === undefined) continue;
    addEnclosurePanel(lowerEnclosure, 'left', bay, rear, front, hallLeft + 0.05, platformTop, enclosureHeight, materials);
    addEnclosurePanel(lowerEnclosure, 'right', bay, rear, front, hallRight - 0.05, platformTop, enclosureHeight, materials);
  }
  grid.add(lowerEnclosure);

  const upperWidth = data.planWidth.value * 0.73;
  const upperDepth = data.planDepth.value * 0.62;
  const upperBottom = 12.25;
  const upperTop = data.upperEaveHeight - 1.8;
  const upperX = createAxisCoordinates(data.bayWidths.slice(1, -1), upperWidth);
  const upperZ = createAxisCoordinates(data.depthWidths.slice(1, -1), upperDepth);
  const upperFront = upperZ.at(-1) ?? 0;
  const upperBeam = beam(upperWidth + 1, 0.5, 0.58, materials.paintedGreen);
  upperBeam.position.set(0, upperTop + 0.18, upperFront);
  const upperRearBeam = upperBeam.clone();
  upperRearBeam.position.z = upperZ[0] ?? 0;
  grid.add(upperBeam, upperRearBeam);

  const upperRear = upperZ[0] ?? 0;
  const upperLeft = upperX[0] ?? 0;
  const upperRight = upperX.at(-1) ?? 0;

  const upperBracketFrames = new Group();
  upperBracketFrames.name = '上层多层斗栱梁架';
  const tierConfigs = [
    { tier: 'lower' as const, y: 13.0 },
    { tier: 'middle' as const, y: 14.25 },
    { tier: 'upper' as const, y: upperTop + 0.12 },
  ];
  const addUpperTier = (tier: 'lower' | 'middle' | 'upper', y: number): void => {
    for (const x of upperX) {
      addBracketSet(brackets, x, y, upperFront, materials, 'upper', false, 'column', 'front', tier);
      addBracketSet(brackets, x, y, upperRear, materials, 'upper', false, 'column', 'rear', tier);
    }
    for (let index = 0; index < upperX.length - 1; index += 1) {
      const left = upperX[index];
      const right = upperX[index + 1];
      if (left === undefined || right === undefined) continue;
      const midpoint = (left + right) / 2;
      addBracketSet(brackets, midpoint, y, upperFront, materials, 'upper', false, 'intercolumn', 'front', tier);
      addBracketSet(brackets, midpoint, y, upperRear, materials, 'upper', false, 'intercolumn', 'rear', tier);
    }
    for (const z of upperZ) {
      addBracketSet(brackets, upperLeft, y, z, materials, 'upper', true, 'column', 'left', tier);
      addBracketSet(brackets, upperRight, y, z, materials, 'upper', true, 'column', 'right', tier);
    }
    for (let index = 0; index < upperZ.length - 1; index += 1) {
      const rear = upperZ[index];
      const front = upperZ[index + 1];
      if (rear === undefined || front === undefined) continue;
      const midpoint = (rear + front) / 2;
      addBracketSet(brackets, upperLeft, y, midpoint, materials, 'upper', true, 'intercolumn', 'left', tier);
      addBracketSet(brackets, upperRight, y, midpoint, materials, 'upper', true, 'intercolumn', 'right', tier);
    }

    const frontFrame = beam(upperWidth + 1, 0.3, 0.44, materials.paintedGreen);
    frontFrame.position.set(0, y - 0.34, upperFront);
    const rearFrame = frontFrame.clone();
    rearFrame.position.z = upperRear;
    const leftFrame = beam(0.44, 0.3, upperDepth + 1, materials.paintedGreen);
    leftFrame.position.set(upperLeft, y - 0.34, 0);
    const rightFrame = leftFrame.clone();
    rightFrame.position.x = upperRight;
    upperBracketFrames.add(frontFrame, rearFrame, leftFrame, rightFrame);
  };
  tierConfigs.forEach(({ tier, y }) => addUpperTier(tier, y));
  grid.add(upperBracketFrames);

  const plaque = createPlaque(materials);
  const plaqueZ = upperFront + 2.1;
  plaque.position.set(0, 13.85, plaqueZ);
  const plaqueHangerBeam = beam(7.2, 0.28, 0.42, materials.darkTimber);
  plaqueHangerBeam.name = '牌匾悬挂横梁';
  plaqueHangerBeam.userData.kind = 'plaque-hanger-beam';
  plaqueHangerBeam.position.set(0, 16.0, plaqueZ);
  const plaqueHangerRods = [-2.25, 2.25].map((x) => {
    const rod = beam(0.18, 0.92, 0.18, materials.timber);
    rod.name = '牌匾吊杆';
    rod.userData.kind = 'plaque-hanger-rod';
    rod.position.set(x, 15.52, plaqueZ);
    return rod;
  });
  grid.add(plaque, plaqueHangerBeam, ...plaqueHangerRods);

  for (const x of xAxis) {
    addBracketSet(brackets, x, outerTop + 0.65, frontZ, materials, 'lower', false, 'column', 'front');
    addBracketSet(brackets, x, outerTop + 0.65, rearZ, materials, 'lower', false, 'column', 'rear');
  }
  const lowerLeft = xAxis[0] ?? 0;
  const lowerRight = xAxis.at(-1) ?? 0;
  for (const z of zAxis) {
    addBracketSet(brackets, lowerLeft, outerTop + 0.65, z, materials, 'lower', true, 'column', 'left');
    addBracketSet(brackets, lowerRight, outerTop + 0.65, z, materials, 'lower', true, 'column', 'right');
  }
  for (let index = 0; index < zAxis.length - 1; index += 1) {
    const rear = zAxis[index];
    const front = zAxis[index + 1];
    if (rear === undefined || front === undefined) continue;
    const midpoint = (rear + front) / 2;
    addBracketSet(brackets, lowerLeft, outerTop + 0.65, midpoint, materials, 'lower', true, 'intercolumn', 'left');
    addBracketSet(brackets, lowerRight, outerTop + 0.65, midpoint, materials, 'lower', true, 'intercolumn', 'right');
  }
  const interiorFloor = beam(data.planWidth.value - 8, 0.12, data.planDepth.value - 8, materials.darkTimber);
  interiorFloor.position.y = platformTop + 0.06;
  grid.add(interiorFloor);

  return { grid, brackets };
}
