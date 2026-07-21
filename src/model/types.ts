import { Mesh, type Box3, type Group, type Object3D } from 'three';

export type QualityLevel = 'low' | 'medium' | 'high';
export type InspectionLayer = 'full' | 'grid' | 'roof' | 'brackets';

export interface DeningHallModel {
  root: Group;
  layers: Map<InspectionLayer, Group>;
  collisions: Box3[];
  metrics: {
    facadeBays: number;
    depthBays: number;
    height: number;
    width: number;
    depth: number;
  };
  dispose: () => void;
}

export function enableShadows(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = child.userData.shadowReceiverOnly !== true;
      child.receiveShadow = true;
    }
  });
}
