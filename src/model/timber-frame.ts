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
): void {
  const set = new Group();
  set.position.set(x, y, z);
  set.name = level === 'lower' ? '首层斗栱' : '上层斗栱';
  set.userData.level = level;
  set.userData.kind = 'bracket';
  set.userData.role = role;
  set.userData.side = side;
  set.userData.stageCount = 4;
  if (inward) set.rotation.y = Math.PI / 2;
  const stages = [
    { stage: 1, width: 1.2, depth: 0.78, y: 0.12 },
    { stage: 2, width: 1.55, depth: 1.12, y: 0.43 },
    { stage: 3, width: 1.95, depth: 1.62, y: 0.76 },
    { stage: 4, width: 2.45, depth: 2.24, y: 1.10 },
  ] as const;
  stages.forEach(({ stage, width, depth, y }) => {
    const stageGroup = new Group();
    stageGroup.name = `斗栱第${stage}层`;
    stageGroup.position.y = y;
    stageGroup.userData.kind = 'bracket-stage';
    stageGroup.userData.stage = stage;
    stageGroup.userData.width = width;
    const dou = beam(width * 0.42, 0.22, Math.min(depth * 0.5, 0.78), materials.paintedBlue);
    const transverse = beam(width, 0.22, 0.34, materials.timber);
    const projecting = beam(0.34, 0.22, depth, materials.darkTimber);
    projecting.position.y = 0.12;
    const bearer = beam(width * 0.92, 0.2, 0.38, materials.paintedGreen);
    bearer.position.y = 0.25;
    stageGroup.add(dou, transverse, projecting, bearer);
    set.add(stageGroup);
  });
  const roleScale = role === 'intercolumn' ? 0.82 : 1;
  const verticalScale = level === 'upper'
    ? (role === 'intercolumn' ? 1.72 : 1.85)
    : (role === 'intercolumn' ? 0.92 : 1);
  set.scale.set(roleScale, verticalScale, roleScale);
  group.add(set);
}

function createPerimeterFrame(
  name: string,
  left: number,
  right: number,
  rear: number,
  front: number,
  y: number,
  height: number,
  material: Material,
): Group {
  const frame = new Group();
  frame.name = name;
  const width = right - left + 0.8;
  const depth = front - rear + 0.8;
  const centreX = (left + right) / 2;
  const centreZ = (rear + front) / 2;
  const frontBeam = beam(width, height, 0.48, material);
  frontBeam.position.set(centreX, y, front);
  const rearBeam = frontBeam.clone();
  rearBeam.position.z = rear;
  const leftBeam = beam(0.48, height, depth, material);
  leftBeam.position.set(left, y, centreZ);
  const rightBeam = leftBeam.clone();
  rightBeam.position.x = right;
  frame.add(frontBeam, rearBeam, leftBeam, rightBeam);
  return frame;
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

  const board = beam(2.8, 3.8, 0.28, materials.paintedGreen);
  board.name = '牌匾绿色底板';
  board.userData.aspect = 'vertical';
  const topFrame = beam(3.3, 0.32, 0.42, materials.timber);
  topFrame.name = '牌匾上下边框';
  topFrame.userData.thickness = 0.32;
  topFrame.position.y = 2.04;
  const bottomFrame = topFrame.clone();
  bottomFrame.position.y = -2.04;
  const leftFrame = beam(0.2, 4.14, 0.42, materials.timber);
  leftFrame.name = '牌匾左右边框';
  leftFrame.userData.thickness = 0.2;
  leftFrame.position.x = -1.52;
  const rightFrame = leftFrame.clone();
  rightFrame.position.x = 1.52;
  const goldTop = beam(2.65, 0.1, 0.08, materials.gold);
  goldTop.position.set(0, 1.82, 0.19);
  const goldBottom = goldTop.clone();
  goldBottom.position.y = -1.82;
  plaque.add(board, topFrame, bottomFrame, leftFrame, rightFrame, goldTop, goldBottom);

  for (const side of [-1, 1]) {
    const pendant = beam(0.34, 1.05, 0.34, materials.timber);
    pendant.position.set(side * 1.54, -2.5, 0);
    pendant.rotation.z = side * 0.18;
    const wing = beam(0.72, 0.22, 0.35, materials.timber);
    wing.position.set(side * 1.7, 2.08, 0);
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
  const lowerBracketBaseY = outerTop + 0.58;
  const lowerBracketFrame = createPerimeterFrame(
    '首层斗栱承托梁架',
    xAxis[0] ?? 0,
    xAxis.at(-1) ?? 0,
    rearZ,
    frontZ,
    lowerBracketBaseY - 0.22,
    0.44,
    materials.paintedGreen,
  );
  grid.add(lowerBracketFrame);

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
  const upperX = createAxisCoordinates(data.bayWidths.slice(1, -1), upperWidth);
  const upperZ = createAxisCoordinates(data.depthWidths.slice(1, -1), upperDepth);
  const upperFront = upperZ.at(-1) ?? 0;
  const upperRear = upperZ[0] ?? 0;
  const upperLeft = upperX[0] ?? 0;
  const upperRight = upperX.at(-1) ?? 0;
  const upperBracketBaseY = 13.05;
  const upperTransferFrame = createPerimeterFrame(
    '二层斗栱转换梁架',
    upperLeft,
    upperRight,
    upperRear,
    upperFront,
    upperBracketBaseY - 0.24,
    0.48,
    materials.paintedGreen,
  );
  const upperEaveFrame = createPerimeterFrame(
    '二层斗栱承檐梁架',
    upperLeft,
    upperRight,
    upperRear,
    upperFront,
    15.89,
    0.38,
    materials.darkTimber,
  );
  grid.add(upperTransferFrame, upperEaveFrame);

  for (const x of upperX) {
    addBracketSet(brackets, x, upperBracketBaseY, upperFront, materials, 'upper', false, 'column', 'front');
    addBracketSet(brackets, x, upperBracketBaseY, upperRear, materials, 'upper', false, 'column', 'rear');
  }
  for (let index = 0; index < upperX.length - 1; index += 1) {
    const left = upperX[index];
    const right = upperX[index + 1];
    if (left === undefined || right === undefined) continue;
    const midpoint = (left + right) / 2;
    addBracketSet(brackets, midpoint, upperBracketBaseY, upperFront, materials, 'upper', false, 'intercolumn', 'front');
    addBracketSet(brackets, midpoint, upperBracketBaseY, upperRear, materials, 'upper', false, 'intercolumn', 'rear');
  }
  for (const z of upperZ) {
    addBracketSet(brackets, upperLeft, upperBracketBaseY, z, materials, 'upper', true, 'column', 'left');
    addBracketSet(brackets, upperRight, upperBracketBaseY, z, materials, 'upper', true, 'column', 'right');
  }
  for (let index = 0; index < upperZ.length - 1; index += 1) {
    const rear = upperZ[index];
    const front = upperZ[index + 1];
    if (rear === undefined || front === undefined) continue;
    const midpoint = (rear + front) / 2;
    addBracketSet(brackets, upperLeft, upperBracketBaseY, midpoint, materials, 'upper', true, 'intercolumn', 'left');
    addBracketSet(brackets, upperRight, upperBracketBaseY, midpoint, materials, 'upper', true, 'intercolumn', 'right');
  }

  const plaque = createPlaque(materials);
  const plaqueZ = upperFront + 2.1;
  plaque.position.set(0, 13.75, plaqueZ);
  plaque.rotation.x = Math.PI / 20;
  plaque.userData.outwardTiltDegrees = 9;
  const plaqueHangerBeam = beam(4.6, 0.28, 0.42, materials.darkTimber);
  plaqueHangerBeam.name = '牌匾悬挂横梁';
  plaqueHangerBeam.userData.kind = 'plaque-hanger-beam';
  plaqueHangerBeam.position.set(0, 15.88, plaqueZ);
  const plaqueHangerRods = [-0.9, 0.9].map((x) => {
    const rod = beam(0.18, 0.78, 0.18, materials.timber);
    rod.name = '牌匾吊杆';
    rod.userData.kind = 'plaque-hanger-rod';
    rod.position.set(x, 15.58, plaqueZ);
    return rod;
  });
  grid.add(plaque, plaqueHangerBeam, ...plaqueHangerRods);

  for (const x of xAxis) {
    addBracketSet(brackets, x, lowerBracketBaseY, frontZ, materials, 'lower', false, 'column', 'front');
    addBracketSet(brackets, x, lowerBracketBaseY, rearZ, materials, 'lower', false, 'column', 'rear');
  }
  for (let index = 0; index < xAxis.length - 1; index += 1) {
    const left = xAxis[index];
    const right = xAxis[index + 1];
    if (left === undefined || right === undefined) continue;
    const midpoint = (left + right) / 2;
    addBracketSet(brackets, midpoint, lowerBracketBaseY, frontZ, materials, 'lower', false, 'intercolumn', 'front');
    addBracketSet(brackets, midpoint, lowerBracketBaseY, rearZ, materials, 'lower', false, 'intercolumn', 'rear');
  }
  const lowerLeft = xAxis[0] ?? 0;
  const lowerRight = xAxis.at(-1) ?? 0;
  for (const z of zAxis) {
    addBracketSet(brackets, lowerLeft, lowerBracketBaseY, z, materials, 'lower', true, 'column', 'left');
    addBracketSet(brackets, lowerRight, lowerBracketBaseY, z, materials, 'lower', true, 'column', 'right');
  }
  for (let index = 0; index < zAxis.length - 1; index += 1) {
    const rear = zAxis[index];
    const front = zAxis[index + 1];
    if (rear === undefined || front === undefined) continue;
    const midpoint = (rear + front) / 2;
    addBracketSet(brackets, lowerLeft, lowerBracketBaseY, midpoint, materials, 'lower', true, 'intercolumn', 'left');
    addBracketSet(brackets, lowerRight, lowerBracketBaseY, midpoint, materials, 'lower', true, 'intercolumn', 'right');
  }
  const interiorFloor = beam(data.planWidth.value - 8, 0.12, data.planDepth.value - 8, materials.darkTimber);
  interiorFloor.position.y = platformTop + 0.06;
  grid.add(interiorFloor);

  return { grid, brackets };
}
