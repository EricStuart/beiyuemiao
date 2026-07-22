import { Box3, BufferGeometry, Group, Mesh } from 'three';
import { DENING_HALL } from '../data/building';
import { createFoundations } from './foundations';
import { validateBuildingData } from './grid';
import { createBuildingMaterials } from './materials';
import { createRoofs } from './roof';
import { createTimberFrame } from './timber-frame';
import { enableShadows, type DeningHallModel, type InspectionLayer, type QualityLevel } from './types';

export function createDeningHall(quality: QualityLevel): DeningHallModel {
  validateBuildingData(DENING_HALL);
  const materials = createBuildingMaterials(DENING_HALL);
  const root = new Group();
  root.name = '曲阳北岳庙德宁之殿';

  const foundations = createFoundations(DENING_HALL, materials);
  const timber = createTimberFrame(DENING_HALL, materials);
  const roofs = createRoofs(DENING_HALL, materials, quality);
  root.add(foundations.group, timber.grid, timber.brackets, roofs);
  enableShadows(root);

  const layers = new Map<InspectionLayer, Group>([
    ['full', root],
    ['grid', timber.grid],
    ['roof', roofs],
    ['brackets', timber.brackets],
  ]);

  return {
    root,
    layers,
    collisions: [...foundations.collisions, new Box3().setFromObject(timber.grid)],
    metrics: {
      facadeBays: DENING_HALL.facadeBays,
      depthBays: DENING_HALL.depthBays,
      height: DENING_HALL.totalHeight.value,
      width: DENING_HALL.planWidth.value,
      depth: DENING_HALL.planDepth.value,
    },
    doors: timber.doors,
    dispose: () => {
      root.traverse((object) => {
        if (object instanceof Mesh && object.geometry instanceof BufferGeometry) object.geometry.dispose();
      });
      materials.all.forEach((material) => material.dispose());
    },
  };
}
