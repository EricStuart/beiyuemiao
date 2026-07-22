import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  Vector3,
  type Material,
} from 'three';
import type { BuildingData } from '../data/building';
import { createAxisCoordinates } from './grid';
import type { BuildingMaterials } from './materials';
import {
  getLowerRoofSurfaceYAtFrontZ,
  getUpperRoofSurfaceYAtFrontZ,
  UPPER_ROOF_BASE_Y,
} from './roof';

export interface TimberFrameResult {
  grid: Group;
  brackets: Group;
}

type EnclosureSide = 'front' | 'rear' | 'left' | 'right';
type IntercolumnSetCount = 1 | 2;

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
    stageGroup.userData.depth = depth;
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
  const verticalScale = role === 'intercolumn' ? 0.92 : 1;
  set.userData.roleScale = roleScale;
  set.userData.verticalScale = verticalScale;
  set.scale.set(roleScale, verticalScale, roleScale);
  group.add(set);
}

function createIntercolumnBracketCoordinates(
  axis: readonly number[],
  setsPerBay: (bayIndex: number, bayCount: number) => IntercolumnSetCount,
): number[] {
  const bayCount = axis.length - 1;
  return axis.slice(0, -1).flatMap((start, bayIndex) => {
    const end = axis[bayIndex + 1];
    if (end === undefined) return [];
    const span = end - start;
    return setsPerBay(bayIndex, bayCount) === 1
      ? [start + span / 2]
      : [start + span / 3, start + (span * 2) / 3];
  });
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
  kind: 'enclosure-panel' | 'inner-enclosure-panel' = 'enclosure-panel',
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
  panel.userData.kind = kind;
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
    mullion.userData.kind = kind === 'inner-enclosure-panel'
      ? 'inner-enclosure-mullion'
      : 'enclosure-mullion';
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

  const board = beam(1.18, 1.08, 0.18, materials.paintedGreen);
  board.name = '牌匾绿色底板';
  board.userData.aspect = 'near-square';
  const topFrame = beam(1.44, 0.15, 0.24, materials.timber);
  topFrame.name = '牌匾上下边框';
  topFrame.userData.thickness = 0.15;
  topFrame.position.y = 0.6;
  const bottomFrame = topFrame.clone();
  bottomFrame.position.y = -0.6;
  const leftFrame = beam(0.12, 1.2, 0.24, materials.timber);
  leftFrame.name = '牌匾左右边框';
  leftFrame.userData.thickness = 0.12;
  leftFrame.position.x = -0.65;
  const rightFrame = leftFrame.clone();
  rightFrame.position.x = 0.65;
  const goldTop = beam(1.04, 0.045, 0.05, materials.gold);
  goldTop.position.set(0, 0.5, 0.1);
  const goldBottom = goldTop.clone();
  goldBottom.position.y = -0.5;
  plaque.add(board, topFrame, bottomFrame, leftFrame, rightFrame, goldTop, goldBottom);

  for (const side of [-1, 1]) {
    const pendant = beam(0.12, 0.18, 0.2, materials.timber);
    pendant.position.set(side * 0.66, -0.61, 0);
    pendant.rotation.z = side * 0.12;
    const wing = beam(0.16, 0.1, 0.22, materials.timber);
    wing.position.set(side * 0.69, 0.62, 0);
    wing.rotation.z = side * 0.08;
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
  const frontRearSides = [
    { side: 'front' as const, coordinate: frontZ },
    { side: 'rear' as const, coordinate: rearZ },
  ];
  for (const { side, coordinate } of frontRearSides) {
    const lowerBeam = beam(fullWidth, 0.48, 0.54, materials.darkTimber);
    lowerBeam.name = `首层${side}柱头梁`;
    lowerBeam.userData.level = 'lower';
    lowerBeam.userData.side = side;
    lowerBeam.userData.kind = 'lower-column-head-beam';
    lowerBeam.position.set(0, outerTop - 0.15, coordinate);
    const paintedBeam = beam(fullWidth + 0.7, 0.42, 0.6, materials.paintedGreen);
    paintedBeam.name = `首层${side}柱头枋`;
    paintedBeam.userData.level = 'lower';
    paintedBeam.userData.side = side;
    paintedBeam.userData.kind = 'lower-column-head-cap';
    paintedBeam.position.set(0, outerTop + 0.35, coordinate);
    grid.add(lowerBeam, paintedBeam);
  }
  const fullDepth = data.planDepth.value + 0.8;
  const leftX = xAxis[0] ?? 0;
  const rightX = xAxis.at(-1) ?? 0;
  const leftRightSides = [
    { side: 'left' as const, coordinate: leftX },
    { side: 'right' as const, coordinate: rightX },
  ];
  for (const { side, coordinate } of leftRightSides) {
    const lowerBeam = beam(0.54, 0.48, fullDepth, materials.darkTimber);
    lowerBeam.name = `首层${side}柱头梁`;
    lowerBeam.userData.level = 'lower';
    lowerBeam.userData.side = side;
    lowerBeam.userData.kind = 'lower-column-head-beam';
    lowerBeam.position.set(coordinate, outerTop - 0.15, 0);
    const paintedBeam = beam(0.6, 0.42, fullDepth + 0.7, materials.paintedGreen);
    paintedBeam.name = `首层${side}柱头枋`;
    paintedBeam.userData.level = 'lower';
    paintedBeam.userData.side = side;
    paintedBeam.userData.kind = 'lower-column-head-cap';
    paintedBeam.position.set(coordinate, outerTop + 0.35, 0);
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
  const frontOpeningBays = new Set([1, 2, 3, 4, 5]);
  const rearOpeningBay = 3;

  for (let bay = 0; bay < hallXAxis.length - 1; bay += 1) {
    const left = hallXAxis[bay];
    const right = hallXAxis[bay + 1];
    if (left === undefined || right === undefined) continue;
    if (!frontOpeningBays.has(bay)) {
      addEnclosurePanel(lowerEnclosure, 'front', bay, left, right, hallFront - 0.05, platformTop, enclosureHeight, materials);
    }
    if (bay !== rearOpeningBay) {
      addEnclosurePanel(lowerEnclosure, 'rear', bay, left, right, hallRear + 0.05, platformTop, enclosureHeight, materials);
    }
  }

  for (let bay = 0; bay < hallZAxis.length - 1; bay += 1) {
    const rear = hallZAxis[bay];
    const front = hallZAxis[bay + 1];
    if (rear === undefined || front === undefined) continue;
    addEnclosurePanel(lowerEnclosure, 'left', bay, rear, front, hallLeft + 0.05, platformTop, enclosureHeight, materials);
    addEnclosurePanel(lowerEnclosure, 'right', bay, rear, front, hallRight - 0.05, platformTop, enclosureHeight, materials);
  }
  grid.add(lowerEnclosure);

  const innerEnclosure = new Group();
  innerEnclosure.name = '内槽 C 字形围护';
  const innerRearZ = zAxis[2];
  const innerLeftX = xAxis[2];
  const innerRightX = xAxis[7];
  if (innerRearZ !== undefined && innerLeftX !== undefined && innerRightX !== undefined) {
    for (let bay = 2; bay < 7; bay += 1) {
      const left = xAxis[bay];
      const right = xAxis[bay + 1];
      if (left === undefined || right === undefined) continue;
      addEnclosurePanel(
        innerEnclosure,
        'rear',
        bay - 2,
        left,
        right,
        innerRearZ,
        platformTop,
        enclosureHeight,
        materials,
        'inner-enclosure-panel',
      );
    }

    for (let bay = 2; bay < 4; bay += 1) {
      const rear = zAxis[bay];
      const front = zAxis[bay + 1];
      if (rear === undefined || front === undefined) continue;
      addEnclosurePanel(
        innerEnclosure,
        'left',
        bay - 2,
        rear,
        front,
        innerLeftX,
        platformTop,
        enclosureHeight,
        materials,
        'inner-enclosure-panel',
      );
      addEnclosurePanel(
        innerEnclosure,
        'right',
        bay - 2,
        rear,
        front,
        innerRightX,
        platformTop,
        enclosureHeight,
        materials,
        'inner-enclosure-panel',
      );
    }
  }
  grid.add(innerEnclosure);

  const upperX = xAxis.slice(1, -1);
  const upperZ = zAxis.slice(1, -1);
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
    UPPER_ROOF_BASE_Y - 0.11,
    0.38,
    materials.darkTimber,
  );
  grid.add(upperTransferFrame, upperEaveFrame);

  for (const x of upperX) {
    addBracketSet(brackets, x, upperBracketBaseY, upperFront, materials, 'upper', false, 'column', 'front');
    addBracketSet(brackets, x, upperBracketBaseY, upperRear, materials, 'upper', false, 'column', 'rear');
  }
  for (const x of createIntercolumnBracketCoordinates(upperX, () => 2)) {
    addBracketSet(brackets, x, upperBracketBaseY, upperFront, materials, 'upper', false, 'intercolumn', 'front');
    addBracketSet(brackets, x, upperBracketBaseY, upperRear, materials, 'upper', false, 'intercolumn', 'rear');
  }
  for (const z of upperZ) {
    addBracketSet(brackets, upperLeft, upperBracketBaseY, z, materials, 'upper', true, 'column', 'left');
    addBracketSet(brackets, upperRight, upperBracketBaseY, z, materials, 'upper', true, 'column', 'right');
  }
  for (const z of createIntercolumnBracketCoordinates(upperZ, () => 2)) {
    addBracketSet(brackets, upperLeft, upperBracketBaseY, z, materials, 'upper', true, 'intercolumn', 'left');
    addBracketSet(brackets, upperRight, upperBracketBaseY, z, materials, 'upper', true, 'intercolumn', 'right');
  }

  const plaque = createPlaque(materials);
  plaque.position.set(0, 0, 0);
  plaque.rotation.x = Math.PI / 20;
  plaque.userData.outwardTiltDegrees = 9;
  const frontUpperBrackets = brackets.children.filter(
    (child) => child.userData.level === 'upper' && child.userData.side === 'front',
  );
  const centralTwoBrackets = [...frontUpperBrackets]
    .sort((left, right) => Math.abs(left.position.x) - Math.abs(right.position.x))
    .slice(0, 2);
  const centralPairBounds = new Box3();
  centralTwoBrackets.forEach((bracket) => centralPairBounds.expandByObject(bracket));
  const targetPlaqueSide = centralPairBounds.getSize(new Vector3()).x * 0.72;
  const initialPlaqueWidth = new Box3().setFromObject(plaque).getSize(new Vector3()).x;
  const plaqueScale = targetPlaqueSide / initialPlaqueWidth;
  plaque.scale.set(plaqueScale, 1, plaqueScale);
  plaque.position.z = upperFront + 2.1;
  let plaqueBounds = new Box3().setFromObject(plaque);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const upperRoofSurfaceY = getUpperRoofSurfaceYAtFrontZ(data, plaqueBounds.min.z);
    const lowerRoofSurfaceY = getLowerRoofSurfaceYAtFrontZ(data, plaqueBounds.min.z);
    const availableHeight = upperRoofSurfaceY - lowerRoofSurfaceY - 0.1;
    const targetPlaqueHeight = Math.min(targetPlaqueSide, availableHeight);
    plaque.scale.y *= targetPlaqueHeight / plaqueBounds.getSize(new Vector3()).y;
    plaqueBounds = new Box3().setFromObject(plaque);
  }
  const lowerRoofSurfaceY = getLowerRoofSurfaceYAtFrontZ(data, plaqueBounds.min.z);
  plaque.position.y += lowerRoofSurfaceY + 0.06 - plaqueBounds.min.y;
  plaqueBounds = new Box3().setFromObject(plaque);
  const plaqueTopY = plaqueBounds.max.y;
  plaque.userData.bottomY = plaqueBounds.min.y;
  plaque.userData.scaleBasis = 'square-between-roofs';
  const plaqueWidth = plaqueBounds.getSize(new Vector3()).x;
  const plaqueZ = plaque.position.z;
  const plaqueHangerDepth = Math.max(0.28, plaqueZ - upperFront + 0.28);
  const plaqueHangerBeam = beam(plaqueWidth + 0.36, 0.22, plaqueHangerDepth, materials.darkTimber);
  plaqueHangerBeam.name = '牌匾悬挂横梁';
  plaqueHangerBeam.userData.kind = 'plaque-hanger-beam';
  plaqueHangerBeam.position.set(0, plaqueTopY - 0.12, upperFront + (plaqueZ - upperFront) / 2);
  const plaqueHangerRods = [-plaqueWidth * 0.28, plaqueWidth * 0.28].map((x) => {
    const rod = beam(0.12, 0.34, 0.12, materials.timber);
    rod.name = '牌匾吊杆';
    rod.userData.kind = 'plaque-hanger-rod';
    rod.position.set(x, plaqueTopY - 0.25, plaqueZ - 0.02);
    return rod;
  });
  grid.add(plaque, plaqueHangerBeam, ...plaqueHangerRods);

  for (const x of xAxis) {
    addBracketSet(brackets, x, lowerBracketBaseY, frontZ, materials, 'lower', false, 'column', 'front');
    addBracketSet(brackets, x, lowerBracketBaseY, rearZ, materials, 'lower', false, 'column', 'rear');
  }
  const outerBaySingle = (bayIndex: number, bayCount: number): IntercolumnSetCount => (
    bayIndex === 0 || bayIndex === bayCount - 1 ? 1 : 2
  );
  for (const x of createIntercolumnBracketCoordinates(xAxis, outerBaySingle)) {
    addBracketSet(brackets, x, lowerBracketBaseY, frontZ, materials, 'lower', false, 'intercolumn', 'front');
    addBracketSet(brackets, x, lowerBracketBaseY, rearZ, materials, 'lower', false, 'intercolumn', 'rear');
  }
  const lowerLeft = xAxis[0] ?? 0;
  const lowerRight = xAxis.at(-1) ?? 0;
  for (const z of zAxis) {
    addBracketSet(brackets, lowerLeft, lowerBracketBaseY, z, materials, 'lower', true, 'column', 'left');
    addBracketSet(brackets, lowerRight, lowerBracketBaseY, z, materials, 'lower', true, 'column', 'right');
  }
  for (const z of createIntercolumnBracketCoordinates(zAxis, outerBaySingle)) {
    addBracketSet(brackets, lowerLeft, lowerBracketBaseY, z, materials, 'lower', true, 'intercolumn', 'left');
    addBracketSet(brackets, lowerRight, lowerBracketBaseY, z, materials, 'lower', true, 'intercolumn', 'right');
  }
  const interiorFloor = beam(data.planWidth.value - 8, 0.12, data.planDepth.value - 8, materials.darkTimber);
  interiorFloor.position.y = platformTop + 0.06;
  grid.add(interiorFloor);

  return { grid, brackets };
}
