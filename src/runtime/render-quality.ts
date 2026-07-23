import { PCFSoftShadowMap } from 'three';

export function createHighQualityRenderSettings(devicePixelRatio: number) {
  return {
    antialias: true,
    shadows: true,
    pixelRatio: Math.max(1, devicePixelRatio || 1),
    shadowMapSize: 2048,
    shadowMapType: PCFSoftShadowMap,
    shadowNormalBias: 0.035,
  } as const;
}
