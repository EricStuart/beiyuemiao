import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createFoundations } from './foundations';
import { createBuildingMaterials } from './materials';

describe('platform layer geometry', () => {
  it('covers the main platform and terrace with grey brick paving', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const mainPaving = group.children.find(
      (child) => child.userData.kind === 'platform-paving',
    ) as Mesh;
    const terrace = group.children.find(
      (child) => child.userData.kind === 'platform-terrace',
    );
    const terracePaving = terrace?.children.find(
      (child) => child.userData.kind === 'terrace-paving',
    ) as Mesh;

    expect(mainPaving).toBeDefined();
    expect(terracePaving).toBeDefined();
    expect((mainPaving.material as MeshStandardMaterial).color.getHex()).toBe(0x77756c);
    expect((terracePaving.material as MeshStandardMaterial).color.getHex()).toBe(0x77756c);
    expect(new Box3().setFromObject(mainPaving).max.y).toBeGreaterThan(DENING_HALL.platformHeight);
    expect(new Box3().setFromObject(terracePaving).max.y).toBeGreaterThan(DENING_HALL.platformHeight);
  });

  it('drops platform railing boards to the platform surface and fills both stair-adjacent gaps', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const boards: Mesh[] = [];
    group.traverse((child) => {
      if (child instanceof Mesh && child.userData.kind === 'platform-balustrade-board') boards.push(child);
    });
    const nearStairRails = group.children.filter(
      (child) => child.userData.kind === 'platform-balustrade-gap'
        && String(child.userData.side).includes('near-stair'),
    );

    expect(boards.length).toBeGreaterThanOrEqual(7);
    boards.forEach((board) => {
      expect(new Box3().setFromObject(board).min.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
    });
    expect(nearStairRails).toHaveLength(2);
  });

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
    expect(terraceBounds.max.y).toBeCloseTo(DENING_HALL.platformHeight + 0.08, 5);
  });

  it('uses the measured main platform and terrace footprints', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const main = group.children.find((child) => child.userData.kind === 'platform-wall')!;
    const terrace = group.children.find((child) => child.userData.kind === 'platform-terrace')!;
    const terraceWall = terrace.children.find((child) => child.userData.kind === 'terrace-wall');
    expect(terraceWall).toBeDefined();
    const mainSize = new Box3().setFromObject(main).getSize(new Vector3());
    const terraceSize = new Box3().setFromObject(terraceWall!).getSize(new Vector3());

    expect(mainSize.x).toBeCloseTo(48.03, 2);
    expect(mainSize.z).toBeCloseTo(31.77, 2);
    expect(terraceSize.x).toBeCloseTo(25.10, 2);
    expect(terraceSize.z).toBeCloseTo(19.86, 2);
  });

  it('builds a large terrace with front, left, and right stair flights', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const ground = group.children.find((child) => child.userData.kind === 'courtyard-ground');
    const terrace = group.children.find((child) => child.userData.kind === 'platform-terrace');
    const steps = group.children.filter((child) => child.userData.kind === 'platform-step');

    expect(ground).toBeDefined();
    expect(terrace).toBeDefined();
    const groundY = new Box3().setFromObject(ground!).max.y;
    const terraceBounds = new Box3().setFromObject(terrace!);
    expect(terraceBounds.max.x - terraceBounds.min.x).toBeGreaterThanOrEqual(25);
    expect(terraceBounds.max.z - terraceBounds.min.z).toBeGreaterThanOrEqual(9.5);

    (['front', 'left', 'right'] as const).forEach((side) => {
      const flight = steps.filter((step) => step.userData.side === side);
      expect(flight).toHaveLength(12);
      const lowest = flight.find((step) => step.userData.index === 0);
      const highest = flight.find((step) => step.userData.index === 11);
      expect(lowest).toBeDefined();
      expect(highest).toBeDefined();
      expect(new Box3().setFromObject(lowest!).min.y).toBeCloseTo(groundY, 5);
      expect(new Box3().setFromObject(highest!).max.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
    });
  });

  it('sizes the front and side stair flights from the measured plan', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const steps = group.children.filter((child) => child.userData.kind === 'platform-step');
    const boundsFor = (side: string): Box3 => {
      const bounds = new Box3();
      steps.filter((step) => step.userData.side === side).forEach((step) => bounds.expandByObject(step));
      return bounds;
    };
    const frontSize = boundsFor('front').getSize(new Vector3());
    const leftSize = boundsFor('left').getSize(new Vector3());
    const rightSize = boundsFor('right').getSize(new Vector3());

    expect(frontSize.x).toBeCloseTo(6.4, 1);
    expect(frontSize.z).toBeCloseTo(5.5, 1);
    expect(leftSize.x).toBeCloseTo(4.8, 1);
    expect(leftSize.z).toBeCloseTo(3.0, 1);
    expect(rightSize.x).toBeCloseTo(4.8, 1);
    expect(rightSize.z).toBeCloseTo(3.0, 1);
  });

  it('wraps the main platform and terrace with complete white balustrades', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const platformRails = group.children.filter(
      (child) => child.userData.kind === 'platform-balustrade',
    );
    const stairRails = group.children.filter(
      (child) => child.userData.kind === 'stair-balustrade',
    );

    expect(new Set(platformRails.map((rail) => rail.userData.side))).toEqual(new Set([
      'front',
      'rear',
      'left',
      'right',
      'terrace-front',
      'terrace-left',
      'terrace-right',
    ]));
    (['front', 'left', 'right'] as const).forEach((side) => {
      expect(stairRails.filter((rail) => rail.userData.stairSide === side)).toHaveLength(2);
    });
  });

  it('runs both side stair flights horizontally along the main platform wall', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const steps = group.children.filter((child) => child.userData.kind === 'platform-step');

    const left = steps.filter((step) => step.userData.side === 'left');
    const right = steps.filter((step) => step.userData.side === 'right');
    const leftBounds = new Box3();
    const rightBounds = new Box3();
    left.forEach((step) => leftBounds.expandByObject(step));
    right.forEach((step) => rightBounds.expandByObject(step));
    const leftSize = leftBounds.getSize(new Vector3());
    const rightSize = rightBounds.getSize(new Vector3());

    expect(leftSize.x).toBeGreaterThan(leftSize.z * 1.5);
    expect(rightSize.x).toBeGreaterThan(rightSize.z * 1.5);
    const leftLowest = left.find((step) => step.userData.index === 0)!;
    const leftHighest = left.find((step) => step.userData.index === 11)!;
    const rightLowest = right.find((step) => step.userData.index === 0)!;
    const rightHighest = right.find((step) => step.userData.index === 11)!;
    expect(leftLowest).toBeDefined();
    expect(leftHighest).toBeDefined();
    expect(rightLowest).toBeDefined();
    expect(rightHighest).toBeDefined();
    expect(leftHighest.position.x).toBeGreaterThan(leftLowest.position.x);
    expect(rightHighest.position.x).toBeLessThan(rightLowest.position.x);
  });
});
