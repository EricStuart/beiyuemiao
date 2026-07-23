import { PCFSoftShadowMap } from 'three';
import { describe, expect, it } from 'vitest';
import { createHighQualityRenderSettings } from './render-quality';

describe('high quality render settings', () => {
  it('keeps the native device pixel ratio and high quality shadows', () => {
    expect(createHighQualityRenderSettings(3.5)).toEqual({
      antialias: true,
      shadows: true,
      pixelRatio: 3.5,
      shadowMapSize: 2048,
      shadowMapType: PCFSoftShadowMap,
    });
  });

  it('falls back to one only for an unavailable device pixel ratio', () => {
    expect(createHighQualityRenderSettings(0).pixelRatio).toBe(1);
  });
});
