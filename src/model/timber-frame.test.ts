import { Box3, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createBuildingMaterials } from './materials';
import { createTimberFrame } from './timber-frame';

describe('lower timber frame', () => {
  it('uses the documented 4.89 metre height for lower perimeter columns', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const columns = grid.children.filter(
      (child) => child instanceof Mesh
        && child.userData.level === 'lower'
        && child.userData.kind === 'column',
    );

    expect(columns.length).toBeGreaterThan(0);
    columns.forEach((column) => {
      const bounds = new Box3().setFromObject(column);
      expect(bounds.min.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
      expect(bounds.max.y).toBeLessThanOrEqual(
        DENING_HALL.platformHeight + DENING_HALL.corridorColumnHeight.value + 0.25,
      );
    });
  });

  it('keeps every lower bracket set below the lower eave', () => {
    const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const lowerBrackets = brackets.children.filter(
      (child) => child.userData.level === 'lower' && child.userData.kind === 'bracket',
    );

    expect(lowerBrackets.length).toBeGreaterThan(0);
    lowerBrackets.forEach((bracket) => {
      expect(new Box3().setFromObject(bracket).max.y).toBeLessThan(DENING_HALL.lowerEaveHeight);
    });
  });

  it('encloses all four sides while leaving the central front bay open', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const panels: Mesh[] = [];
    grid.traverse((child) => {
      if (child instanceof Mesh && child.userData.kind === 'enclosure-panel') panels.push(child);
    });

    const sideCounts = { front: 0, rear: 0, left: 0, right: 0 };
    panels.forEach((panel) => {
      const side = panel.userData.side as keyof typeof sideCounts;
      sideCounts[side] += 1;
    });
    const frontPanels = panels.filter((panel) => panel.userData.side === 'front');

    expect(sideCounts).toEqual({ front: 6, rear: 7, left: 4, right: 4 });
    expect(frontPanels.some((panel) => panel.userData.bay === 3)).toBe(false);
    panels.forEach((panel) => {
      expect(new Box3().setFromObject(panel).min.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
    });
  });

  it('places the 德宁之殿 plaque at the centre of the upper front facade', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const plaques = grid.children.filter((child) => child.userData.kind === 'plaque');

    expect(plaques).toHaveLength(1);
    const plaque = plaques[0]!;
    expect(plaque.position.x).toBeCloseTo(0, 5);
    expect(plaque.position.z).toBeGreaterThan(0);
    expect(plaque.position.y).toBeGreaterThan(DENING_HALL.lowerEaveHeight);
    expect(plaque.position.y).toBeLessThan(DENING_HALL.upperEaveHeight);
  });

  it('builds a continuous multi-layer upper bracket band below the upper eave', () => {
    const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const upperBrackets = brackets.children.filter(
      (child) => child.userData.level === 'upper' && child.userData.kind === 'bracket',
    );

    expect(upperBrackets.length).toBeGreaterThanOrEqual(30);
    upperBrackets.forEach((bracket) => {
      expect(bracket.children.length).toBeGreaterThanOrEqual(7);
      const bounds = new Box3().setFromObject(bracket);
      expect(bounds.min.y).toBeGreaterThan(15);
      expect(bounds.max.y).toBeLessThan(DENING_HALL.upperEaveHeight);
    });
    expect(upperBrackets.some((bracket) => bracket.userData.role === 'intercolumn')).toBe(true);
  });

  it('closes both upper side walls beneath the bracket band', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const sidePanels: Mesh[] = [];
    grid.traverse((child) => {
      if (child instanceof Mesh && child.userData.kind === 'upper-enclosure-panel') {
        sidePanels.push(child);
      }
    });

    expect(sidePanels.filter((panel) => panel.userData.side === 'left')).toHaveLength(4);
    expect(sidePanels.filter((panel) => panel.userData.side === 'right')).toHaveLength(4);
    sidePanels.forEach((panel) => {
      expect(new Box3().setFromObject(panel).min.y).toBeCloseTo(12.25, 5);
    });
  });
});
