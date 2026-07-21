import { Box3, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createFoundations } from './foundations';
import { createBuildingMaterials } from './materials';

describe('platform layer geometry', () => {
  it('stacks the stone cap above the upper brick layer without overlap', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const upperBrick = group.children[3];
    const stoneCap = group.children[4];
    expect(upperBrick).toBeInstanceOf(Mesh);
    expect(stoneCap).toBeInstanceOf(Mesh);

    const upperBounds = new Box3().setFromObject(upperBrick!);
    const capBounds = new Box3().setFromObject(stoneCap!);
    expect(upperBounds.max.y).toBeCloseTo(capBounds.min.y, 5);
  });
});
