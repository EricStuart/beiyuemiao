import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createBuildingMaterials } from './materials';
import { createTimberFrame } from './timber-frame';

describe('Dening Hall doors', () => {
  it('builds five front pairs and one rear pair with two hinged leaves each', () => {
    const result = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    expect(result.doors.front).toHaveLength(10);
    expect(result.doors.rear).toHaveLength(2);
    expect(result.grid.children.filter((child) => child.userData.kind === 'door-pair'))
      .toHaveLength(6);
  });

  it('keeps every door leaf seated on the platform and inside its opening', () => {
    const result = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    [...result.doors.front, ...result.doors.rear].forEach(({ pivot, closedRotationY }) => {
      pivot.rotation.y = closedRotationY;
      const bounds = new Box3().setFromObject(pivot);
      expect(bounds.min.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
      expect(pivot.userData.kind).toBe('door-leaf-pivot');
    });
  });

  it('opens both facade door groups toward the interior', () => {
    const result = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    expect(result.doors.front[0]!.openRotationY).toBeGreaterThan(0);
    expect(result.doors.front[1]!.openRotationY).toBeLessThan(0);
    expect(result.doors.rear[0]!.openRotationY).toBeLessThan(0);
    expect(result.doors.rear[1]!.openRotationY).toBeGreaterThan(0);
  });
});
