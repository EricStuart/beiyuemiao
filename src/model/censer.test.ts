import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createFoundations } from './foundations';
import { createBuildingMaterials } from './materials';

describe('terrace Taoist censer', () => {
  it('centers one grounded white-stone tripod censer clear of the front stairs', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const censer = group.children.find((child) => child.userData.kind === 'terrace-censer');
    const frontSteps = group.children.filter(
      (child) => child.userData.kind === 'platform-step' && child.userData.side === 'front',
    );

    expect(censer).toBeDefined();
    const censerBounds = new Box3().setFromObject(censer!);
    const frontStepBounds = new Box3();
    frontSteps.forEach((step) => frontStepBounds.expandByObject(step));
    const expectedZ = DENING_HALL.platformDepth.value / 2 + DENING_HALL.terraceDepth.value / 2;
    expect(censer!.position.x).toBeCloseTo(0, 5);
    expect(censer!.position.z).toBeCloseTo(expectedZ, 5);
    expect(censerBounds.min.y).toBeCloseTo(DENING_HALL.platformHeight + 0.08, 5);
    expect(censerBounds.getSize(new Vector3()).y).toBeGreaterThanOrEqual(2.2);
    expect(censerBounds.getSize(new Vector3()).y).toBeLessThanOrEqual(2.4);
    expect(censerBounds.max.z).toBeLessThan(frontStepBounds.min.z);

    const parts: Mesh[] = [];
    censer!.traverse((child) => {
      if (child instanceof Mesh) parts.push(child);
    });
    const belly = parts.find((part) => part.userData.kind === 'censer-belly');
    expect(belly).toBeDefined();
    expect(new Box3().setFromObject(belly!).getSize(new Vector3()).x).toBeCloseTo(2.2, 1);
    expect(parts.filter((part) => part.userData.kind === 'censer-leg')).toHaveLength(3);
    expect(parts.filter((part) => part.userData.kind === 'censer-handle')).toHaveLength(2);
    expect(parts.every((part) => part.userData.materialRole !== 'painted')).toBe(true);
  });
});

