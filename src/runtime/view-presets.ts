import { Vector3 } from 'three';

export type ViewPreset = 'front' | 'left' | 'right' | 'rear' | 'aerial' | 'reset';

export interface ViewPose {
  position: Vector3;
  target: Vector3;
}

export function createViewPresets(
  width: number,
  depth: number,
  height: number,
  aspect = 16 / 9,
): Record<ViewPreset, ViewPose> {
  const target = new Vector3(0, height * 0.39, 0);
  const framingScale = Math.max(1, 0.88 / Math.max(aspect, 0.35));
  const frontDistance = Math.max(width * 1.28, depth * 1.85) * framingScale;
  const sideDistance = Math.max(depth * 1.48, width * 0.94) * framingScale;
  const eyeHeight = height * (0.52 + 0.17 * (framingScale - 1));
  return {
    front: { position: new Vector3(0, eyeHeight, frontDistance), target: target.clone() },
    reset: { position: new Vector3(0, eyeHeight, frontDistance), target: target.clone() },
    rear: { position: new Vector3(0, eyeHeight, -frontDistance), target: target.clone() },
    left: { position: new Vector3(-sideDistance, eyeHeight + height * 0.04, 0), target: target.clone() },
    right: { position: new Vector3(sideDistance, eyeHeight + height * 0.04, 0), target: target.clone() },
    aerial: {
      position: new Vector3(
        width * 1.2 * framingScale,
        height * 3.05 * Math.sqrt(framingScale),
        depth * 1.5 * framingScale,
      ),
      target: new Vector3(0, height * 0.27, 0),
    },
  };
}
