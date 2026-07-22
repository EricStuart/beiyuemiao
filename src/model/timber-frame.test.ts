import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createBuildingMaterials } from './materials';
import { UPPER_ROOF_BASE_Y } from './roof';
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

  it('uses the same four-stage profile for lower bracket sets', () => {
    const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const lowerBracket = brackets.children.find(
      (child) => child.userData.level === 'lower' && child.userData.kind === 'bracket',
    );

    expect(lowerBracket).toBeDefined();
    expect(lowerBracket!.userData.stageCount).toBe(4);
    expect(lowerBracket!.children.filter(
      (child) => child.userData.kind === 'bracket-stage',
    )).toHaveLength(4);
    expect(new Box3().setFromObject(lowerBracket!).max.y).toBeLessThan(DENING_HALL.lowerEaveHeight);
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

  it('uses a tall narrow plaque with heavier top and bottom frames', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const plaque = grid.children.find((child) => child.userData.kind === 'plaque')!;
    const board = plaque.getObjectByName('牌匾绿色底板')!;
    const size = new Box3().setFromObject(board).getSize(new Vector3());
    const horizontalFrame = plaque.getObjectByName('牌匾上下边框');
    const verticalFrame = plaque.getObjectByName('牌匾左右边框');

    expect(size.y / size.x).toBeGreaterThan(1.15);
    expect(size.y / size.x).toBeLessThan(1.35);
    expect(horizontalFrame?.userData.thickness).toBeGreaterThan(
      verticalFrame?.userData.thickness,
    );
  });

  it('keeps the complete plaque below the upper roof without oversizing it', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const plaque = grid.children.find((child) => child.userData.kind === 'plaque')!;
    const board = plaque.getObjectByName('牌匾绿色底板')!;
    const boardSize = new Box3().setFromObject(board).getSize(new Vector3());
    const plaqueBounds = new Box3().setFromObject(plaque);

    expect(boardSize.x).toBeLessThan(2.5);
    expect(boardSize.y).toBeLessThan(3.2);
    expect(plaqueBounds.max.y).toBeLessThanOrEqual(UPPER_ROOF_BASE_Y - 0.1);
  });

  it('tilts the plaque outward from the upper bracket band', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const plaque = grid.children.find((child) => child.userData.kind === 'plaque');

    expect(plaque).toBeDefined();
    expect(plaque!.rotation.x).toBeCloseTo(Math.PI / 20, 3);
    expect(plaque!.userData.outwardTiltDegrees).toBe(9);
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

  it('builds one upper bracket band with four narrowing stages per set', () => {
    const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const upperBrackets = brackets.children.filter(
      (child) => child.userData.level === 'upper' && child.userData.kind === 'bracket',
    );

    expect(upperBrackets).toHaveLength(48);
    expect(upperBrackets.every((set) => set.userData.stageCount === 4)).toBe(true);
    upperBrackets.forEach((set) => {
      const stages = set.children.filter((child) => child.userData.kind === 'bracket-stage');
      expect(stages.map((stage) => stage.userData.stage)).toEqual([1, 2, 3, 4]);
      expect(stages.every((stage) => stage.children.length > 0)).toBe(true);
      const widths = stages.map((stage) => stage.userData.width as number);
      expect(widths[0]).toBeLessThan(widths[1]!);
      expect(widths[1]).toBeLessThan(widths[2]!);
      expect(widths[2]).toBeLessThan(widths[3]!);
      const bounds = new Box3().setFromObject(set);
      expect(bounds.min.y).toBeGreaterThan(12.25);
      expect(bounds.max.y).toBeLessThan(DENING_HALL.upperEaveHeight);
    });
    expect(upperBrackets.some((bracket) => bracket.userData.role === 'intercolumn')).toBe(true);
  });

  it('exposes lower support, upper transfer, and upper eave beam frames', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const frames = [
      grid.getObjectByName('首层斗栱承托梁架'),
      grid.getObjectByName('二层斗栱转换梁架'),
      grid.getObjectByName('二层斗栱承檐梁架'),
    ];

    frames.forEach((frame) => {
      expect(frame).toBeDefined();
      expect(frame!.children).toHaveLength(4);
    });
  });

  it('wraps all four lower column-head elevations with matching beams and caps', () => {
    const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const members = grid.children.filter(
      (child) => child instanceof Mesh
        && (child.userData.kind === 'lower-column-head-beam'
          || child.userData.kind === 'lower-column-head-cap'),
    ) as Mesh[];
    const counts = {
      beam: { front: 0, rear: 0, left: 0, right: 0 },
      cap: { front: 0, rear: 0, left: 0, right: 0 },
    };

    members.forEach((member) => {
      const role = member.userData.kind === 'lower-column-head-beam' ? 'beam' : 'cap';
      const side = member.userData.side as keyof typeof counts.beam;
      counts[role][side] += 1;
    });

    expect(counts.beam).toEqual({ front: 1, rear: 1, left: 1, right: 1 });
    expect(counts.cap).toEqual({ front: 1, rear: 1, left: 1, right: 1 });

    const frontBeam = members.find(
      (member) => member.userData.kind === 'lower-column-head-beam'
        && member.userData.side === 'front',
    )!;
    const sideBeam = members.find(
      (member) => member.userData.kind === 'lower-column-head-beam'
        && member.userData.side === 'right',
    )!;
    const frontSize = new Box3().setFromObject(frontBeam).getSize(new Vector3());
    const sideSize = new Box3().setFromObject(sideBeam).getSize(new Vector3());
    expect(frontSize.x).toBeGreaterThan(frontSize.z * 10);
    expect(sideSize.z).toBeGreaterThan(sideSize.x * 10);
  });

  it('uses the same bracket module and vertical scale on both storeys', () => {
    const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const lower = brackets.children.find(
      (child) => child.userData.level === 'lower' && child.userData.role === 'column',
    )!;
    const upper = brackets.children.find(
      (child) => child.userData.level === 'upper' && child.userData.role === 'column',
    )!;
    const moduleOf = (set: typeof lower) => set.children
      .filter((child) => child.userData.kind === 'bracket-stage')
      .map((stage) => ({
        width: stage.userData.width,
        depth: stage.userData.depth,
      }));

    expect(moduleOf(upper)).toEqual(moduleOf(lower));
    expect(upper.scale.y).toBeCloseTo(lower.scale.y, 5);
    expect(upper.scale.y).toBeCloseTo(1, 5);
  });

  it('seats the upper bracket band under the lowered roof without trapping the plaque', () => {
    const { grid, brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const upper = brackets.children.filter(
      (child) => child.userData.level === 'upper' && child.userData.kind === 'bracket',
    );
    const upperEaveFrame = grid.getObjectByName('二层斗栱承檐梁架')!;
    const plaque = grid.children.find((child) => child.userData.kind === 'plaque')!;
    const hanger = grid.children.find((child) => child.userData.kind === 'plaque-hanger-beam')!;
    const upperMaxY = Math.max(...upper.map((set) => new Box3().setFromObject(set).max.y));
    const frameBounds = new Box3().setFromObject(upperEaveFrame);
    const plaqueTop = new Box3().setFromObject(plaque).max.y;
    const hangerTop = new Box3().setFromObject(hanger).max.y;

    expect(Math.abs(upperMaxY - UPPER_ROOF_BASE_Y)).toBeLessThanOrEqual(0.05);
    expect(frameBounds.min.y).toBeLessThanOrEqual(upperMaxY);
    expect(frameBounds.max.y).toBeGreaterThanOrEqual(upperMaxY);
    expect(upperMaxY).toBeGreaterThanOrEqual(frameBounds.min.y - 0.12);
    expect(plaqueTop).toBeLessThanOrEqual(UPPER_ROOF_BASE_Y - 0.1);
    expect(hangerTop).toBeLessThan(UPPER_ROOF_BASE_Y);
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
    expect(sideCounts).toEqual({ front: 15, rear: 15, left: 9, right: 9 });
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

  it('fills the lower front and rear bays with intercolumn bracket sets', () => {
    const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
    const lower = brackets.children.filter((child) => child.userData.level === 'lower');
    const counts = { front: 0, rear: 0, left: 0, right: 0 };
    lower.forEach((set) => {
      counts[set.userData.side as keyof typeof counts] += 1;
    });

    expect(counts).toEqual({ front: 19, rear: 19, left: 13, right: 13 });
    expect(lower.some(
      (set) => set.userData.side === 'front' && set.userData.role === 'intercolumn',
    )).toBe(true);
    expect(lower.some(
      (set) => set.userData.side === 'rear' && set.userData.role === 'intercolumn',
    )).toBe(true);
  });
});
