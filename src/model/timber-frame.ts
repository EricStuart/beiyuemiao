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

function beam(width: number, height: number, depth: number, material: Material): Mesh {
  return new Mesh(new BoxGeometry(width, height, depth), material);
}

function addColumn(group: Group, x: number, z: number, bottom: number, top: number, radius: number, material: Material): void {
  const column = new Mesh(new CylinderGeometry(radius * 0.9, radius, top - bottom, 14), material);
  column.position.set(x, (bottom + top) / 2, z);
  group.add(column);
}

function addBracketSet(group: Group, x: number, y: number, z: number, materials: BuildingMaterials, inward = false): void {
  const set = new Group();
  set.position.set(x, y, z);
  const bearing = beam(1.55, 0.24, 0.62, materials.paintedGreen);
  const block = beam(0.72, 0.42, 0.72, materials.paintedBlue);
  block.position.y = 0.31;
  const arm = beam(0.42, 0.3, 1.82, materials.timber);
  arm.position.y = 0.58;
  if (inward) arm.rotation.y = Math.PI / 2;
  const cap = beam(2.15, 0.24, 0.48, materials.paintedGreen);
  cap.position.y = 0.78;
  set.add(bearing, block, arm, cap);
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
): void {
  const front = zAxis.at(-1);
  const rear = zAxis[0];
  if (front === undefined || rear === undefined) return;
  for (const x of xAxis) {
    addColumn(group, x, front, bottom, top, radius, material);
    addColumn(group, x, rear, bottom, top, radius, material);
  }
  for (const z of zAxis.slice(1, -1)) {
    addColumn(group, xAxis[0] ?? 0, z, bottom, top, radius, material);
    addColumn(group, xAxis.at(-1) ?? 0, z, bottom, top, radius, material);
  }
}

export function createTimberFrame(data: BuildingData, materials: BuildingMaterials): TimberFrameResult {
  const grid = new Group();
  grid.name = '柱网与围护';
  const brackets = new Group();
  brackets.name = '斗栱';
  const xAxis = createAxisCoordinates(data.bayWidths, data.planWidth.value);
  const zAxis = createAxisCoordinates(data.depthWidths, data.planDepth.value);
  const platformTop = data.platformHeight;
  const outerTop = data.lowerEaveHeight - 0.75;

  addPerimeterColumns(grid, xAxis, zAxis, platformTop, outerTop, 0.46, materials.timber);

  const hallXAxis = xAxis.slice(1, -1);
  const hallZAxis = zAxis.slice(1, -1);
  addPerimeterColumns(grid, hallXAxis, hallZAxis, platformTop, outerTop + 0.25, 0.5, materials.darkTimber);

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

  const wallZ = hallZAxis.at(-1) ?? frontZ - 3;
  for (let bay = 1; bay < xAxis.length - 2; bay += 1) {
    const left = xAxis[bay];
    const right = xAxis[bay + 1];
    if (left === undefined || right === undefined) continue;
    const panelWidth = right - left - 0.36;
    const door = beam(panelWidth, 4.9, 0.32, materials.door);
    door.position.set((left + right) / 2, platformTop + 2.46, wallZ + 0.05);
    grid.add(door);
    for (let stud = 1; stud < 4; stud += 1) {
      const mullion = beam(0.12, 4.65, 0.42, materials.darkTimber);
      mullion.position.set(left + (panelWidth / 4) * stud + 0.18, platformTop + 2.46, wallZ + 0.25);
      grid.add(mullion);
    }
  }

  const upperWidth = data.planWidth.value * 0.73;
  const upperDepth = data.planDepth.value * 0.62;
  const upperBottom = 12.25;
  const upperTop = data.upperEaveHeight - 0.75;
  const upperX = createAxisCoordinates(data.bayWidths.slice(1, -1), upperWidth);
  const upperZ = createAxisCoordinates(data.depthWidths.slice(1, -1), upperDepth);
  addPerimeterColumns(grid, upperX, upperZ, upperBottom, upperTop, 0.43, materials.timber);
  const upperFront = upperZ.at(-1) ?? 0;
  const upperBeam = beam(upperWidth + 1, 0.5, 0.58, materials.paintedGreen);
  upperBeam.position.set(0, upperTop + 0.3, upperFront);
  const upperRearBeam = upperBeam.clone();
  upperRearBeam.position.z = upperZ[0] ?? 0;
  grid.add(upperBeam, upperRearBeam);

  const upperEnclosure = new Group();
  upperEnclosure.name = '上层檐下围护';
  const upperRear = upperZ[0] ?? 0;
  for (let bay = 0; bay < upperX.length - 1; bay += 1) {
    const left = upperX[bay];
    const right = upperX[bay + 1];
    if (left === undefined || right === undefined) continue;
    const panelWidth = right - left - 0.24;
    for (const z of [upperFront - 0.12, upperRear + 0.12]) {
      const panel = beam(panelWidth, 3.85, 0.28, materials.door);
      panel.position.set((left + right) / 2, 14.35, z);
      upperEnclosure.add(panel);
      for (let stud = 1; stud < 4; stud += 1) {
        const mullion = beam(0.11, 3.6, 0.38, materials.darkTimber);
        mullion.position.set(left + ((right - left) / 4) * stud, 14.35, z + 0.08);
        upperEnclosure.add(mullion);
      }
    }
  }
  grid.add(upperEnclosure);

  for (const x of xAxis) {
    addBracketSet(brackets, x, outerTop + 0.65, frontZ, materials);
    addBracketSet(brackets, x, outerTop + 0.65, rearZ, materials);
  }
  for (const x of upperX) {
    addBracketSet(brackets, x, upperTop + 0.62, upperFront, materials);
    addBracketSet(brackets, x, upperTop + 0.62, upperZ[0] ?? 0, materials);
  }

  const interiorFloor = beam(data.planWidth.value - 8, 0.12, data.planDepth.value - 8, materials.darkTimber);
  interiorFloor.position.y = platformTop + 0.06;
  grid.add(interiorFloor);

  return { grid, brackets };
}
