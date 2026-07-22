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

  it('raises the visible platform to 2.9 metres without changing its top elevation', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const ground = group.children.find((child) => child.userData.kind === 'courtyard-ground');
    const main = group.children.find((child) => child.userData.kind === 'platform-main');

    expect(ground).toBeDefined();
    expect(main).toBeDefined();
    const groundBounds = new Box3().setFromObject(ground!);
    const mainBounds = new Box3().setFromObject(main!);

    expect(mainBounds.max.y - groundBounds.max.y).toBeCloseTo(2.9, 5);
    expect(mainBounds.max.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
  });

  it('forms a 凸-shaped plan with a narrower central terrace projecting forward', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const main = group.children.find((child) => child.userData.kind === 'platform-main');
    const terrace = group.children.find((child) => child.userData.kind === 'platform-terrace');

    expect(main).toBeDefined();
    expect(terrace).toBeDefined();
    const mainBounds = new Box3().setFromObject(main!);
    const terraceBounds = new Box3().setFromObject(terrace!);

    expect(terraceBounds.max.z).toBeGreaterThan(mainBounds.max.z);
    expect(terraceBounds.min.x).toBeGreaterThan(mainBounds.min.x);
    expect(terraceBounds.max.x).toBeLessThan(mainBounds.max.x);
    expect(terraceBounds.max.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
  });
});
