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

  it('keeps the plaque frame and backing without any lettering', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const plaque = grid.children.find((child) => child.userData.kind === 'plaque');
    const letteringNames: string[] = [];

    expect(plaque).toBeDefined();
    plaque!.traverse((child) => {
      if (child.name.includes('字') || child.name.includes('文字')) {
        letteringNames.push(child.name);
      }
    });
    expect(letteringNames).toHaveLength(0);
  });

  it('hangs the plaque independently in front of the upper brackets', () => {
    const { grid, brackets } = createTimberFrame(
      DENING_HALL,
      createBuildingMaterials(DENING_HALL),
    );
    const plaque = grid.children.find((child) => child.userData.kind === 'plaque');
    const hangerBeams = grid.children.filter((child) => child.userData.kind === 'plaque-hanger-beam');
    const hangerRods = grid.children.filter((child) => child.userData.kind === 'plaque-hanger-rod');
    const frontUpperBrackets = brackets.children.filter(
      (child) => child.userData.level === 'upper' && child.userData.side === 'front',
    );

    expect(plaque).toBeDefined();
    expect(plaque!.parent).toBe(grid);
    expect(hangerBeams).toHaveLength(1);
    expect(hangerRods).toHaveLength(2);
    const plaqueBounds = new Box3().setFromObject(plaque!);
    const frontMaxZ = Math.max(...frontUpperBrackets.map(
      (bracket) => new Box3().setFromObject(bracket).max.z,
    ));
    expect(plaqueBounds.min.z).toBeGreaterThan(frontMaxZ);
  });

  it('builds a continuous multi-layer upper bracket band below the upper eave', () => {
    const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const upperBrackets = brackets.children.filter(
      (child) => child.userData.level === 'upper' && child.userData.kind === 'bracket',
    );

    expect(upperBrackets).toHaveLength(144);
    expect(new Set(upperBrackets.map((bracket) => bracket.userData.tier))).toEqual(
      new Set(['lower', 'middle', 'upper']),
    );
    (['lower', 'middle', 'upper'] as const).forEach((tier) => {
      const tierSets = upperBrackets.filter((bracket) => bracket.userData.tier === tier);
      const counts = { front: 0, rear: 0, left: 0, right: 0 };
      tierSets.forEach((set) => {
        counts[set.userData.side as keyof typeof counts] += 1;
      });
      expect(counts).toEqual({ front: 15, rear: 15, left: 9, right: 9 });
    });
    upperBrackets.forEach((bracket) => {
      expect(bracket.children.length).toBeGreaterThanOrEqual(7);
      const bounds = new Box3().setFromObject(bracket);
      expect(bounds.min.y).toBeGreaterThan(12.25);
      expect(bounds.max.y).toBeLessThan(DENING_HALL.upperEaveHeight);
    });
    expect(upperBrackets.some((bracket) => bracket.userData.role === 'intercolumn')).toBe(true);
  });

  it('removes every upper enclosure wall and mullion', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    expect(grid.children.some((child) => child.name === '上层檐下围护')).toBe(false);
  });

  it('uses no visible upper columns and wraps the upper storey in bracket sets', () => {
    const { grid, brackets } = createTimberFrame(
      DENING_HALL,
      createBuildingMaterials(DENING_HALL),
    );
    const upperColumns = grid.children.filter(
      (child) => child instanceof Mesh
        && child.userData.level === 'upper'
        && child.userData.kind === 'column',
    );
    const upperBrackets = brackets.children.filter(
      (child) => child.userData.level === 'upper' && child.userData.kind === 'bracket',
    );
    const sideCounts = { front: 0, rear: 0, left: 0, right: 0 };
    upperBrackets.forEach((set) => {
      const side = set.userData.side as keyof typeof sideCounts;
      if (side in sideCounts) sideCounts[side] += 1;
    });

    expect(upperColumns).toHaveLength(0);
    expect(sideCounts).toEqual({ front: 45, rear: 45, left: 27, right: 27 });
    (Object.keys(sideCounts) as Array<keyof typeof sideCounts>).forEach((side) => {
      expect(upperBrackets.some(
        (set) => set.userData.side === side && set.userData.role === 'column',
      )).toBe(true);
      expect(upperBrackets.some(
        (set) => set.userData.side === side && set.userData.role === 'intercolumn',
      )).toBe(true);
    });
  });

  it('fills both lower side elevations with column and intercolumn brackets', () => {
    const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const lowerSideSets = brackets.children.filter(
      (child) => child.userData.level === 'lower'
        && (child.userData.side === 'left' || child.userData.side === 'right'),
    );
    const counts = { left: 0, right: 0 };
    lowerSideSets.forEach((set) => {
      counts[set.userData.side as keyof typeof counts] += 1;
    });

    expect(counts).toEqual({ left: 13, right: 13 });
    expect(lowerSideSets.some((set) => set.userData.role === 'column')).toBe(true);
    expect(lowerSideSets.some((set) => set.userData.role === 'intercolumn')).toBe(true);
  });
});
