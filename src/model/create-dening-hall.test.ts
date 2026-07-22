import { describe, expect, it } from 'vitest';
import { DoubleSide, Mesh, type Material } from 'three';
import { createDeningHall } from './create-dening-hall';

describe('Dening Hall assembly', () => {
  it('registers every inspectable architectural layer', () => {
    const building = createDeningHall('medium');
    expect([...building.layers.keys()].sort()).toEqual(['brackets', 'full', 'grid', 'roof']);
  });

  it('preserves the documented bay counts and height', () => {
    const building = createDeningHall('low');
    expect(building.metrics.facadeBays).toBe(9);
    expect(building.metrics.depthBays).toBe(6);
    expect(building.metrics.height).toBe(25.6);
  });

  it('contains visible geometry in every inspection layer', () => {
    const building = createDeningHall('medium');
    for (const group of building.layers.values()) {
      expect(group.children.length).toBeGreaterThan(0);
    }
  });

  it('renders roof surfaces from every exterior viewing direction', () => {
    const building = createDeningHall('medium');
    let upperRoof: Mesh | undefined;
    building.layers.get('roof')?.traverse((object) => {
      if (object instanceof Mesh && object.name === '上檐庑殿顶') upperRoof = object;
    });
    expect(upperRoof).toBeDefined();
    expect((upperRoof?.material as Material).side).toBe(DoubleSide);
  });

  it('replaces the upper enclosure with three complete bracket tiers', () => {
    const building = createDeningHall('medium');
    expect(building.layers.get('grid')?.getObjectByName('上层檐下围护')).toBeUndefined();
    const upperBrackets = building.layers.get('brackets')?.children.filter(
      (child) => child.userData.level === 'upper',
    );
    expect(upperBrackets).toHaveLength(144);
    expect(new Set(upperBrackets?.map((child) => child.userData.tier))).toEqual(
      new Set(['lower', 'middle', 'upper']),
    );
  });

  it('keeps the courtyard ground as a shadow receiver only', () => {
    const building = createDeningHall('medium');
    const ground = building.root.getObjectByName('院落地面');
    expect(ground?.receiveShadow).toBe(true);
    expect(ground?.castShadow).toBe(false);
  });
});
