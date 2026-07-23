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

  it('drops platform railing boards to the platform surface without duplicate stair-gap rails', () => {
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
    expect(nearStairRails).toHaveLength(0);
  });

  it('uses one measured vertical main wall without stepped foundation courses', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const ground = group.children.find((child) => child.userData.kind === 'courtyard-ground')!;
    const mainSolids = group.children.filter((child) => (
      child instanceof Mesh
      && (child.userData.kind === 'platform-wall' || child.userData.kind === undefined)
    ));

    expect(mainSolids).toHaveLength(1);
    const wallBounds = new Box3().setFromObject(mainSolids[0]!);
    const wallSize = wallBounds.getSize(new Vector3());
    expect(wallSize.x).toBeCloseTo(DENING_HALL.platformWidth.value, 5);
    expect(wallSize.z).toBeCloseTo(DENING_HALL.platformDepth.value, 5);
    expect(wallBounds.min.y).toBeCloseTo(new Box3().setFromObject(ground).max.y, 5);
  });

  it('keeps both side stair flights outside every main foundation solid', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const steps = group.children.filter((child) => child.userData.kind === 'platform-step');
    const foundationBounds = new Box3();
    group.children
      .filter((child) => child instanceof Mesh
        && (child.userData.kind === 'platform-wall' || child.userData.kind === undefined))
      .forEach((child) => foundationBounds.expandByObject(child));

    (['left', 'right'] as const).forEach((side) => {
      const flightBounds = new Box3();
      steps.filter((step) => step.userData.side === side)
        .forEach((step) => flightBounds.expandByObject(step));
      expect(flightBounds.min.z).toBeGreaterThanOrEqual(foundationBounds.max.z - 1e-6);
    });
  });

  it('seats both front stair balustrades completely over the front steps', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const frontSteps = group.children.filter(
      (child) => child.userData.kind === 'platform-step' && child.userData.side === 'front',
    );
    const frontRails = group.children.filter(
      (child) => child.userData.kind === 'stair-balustrade'
        && child.userData.stairSide === 'front',
    );
    const stepBounds = new Box3();
    frontSteps.forEach((step) => stepBounds.expandByObject(step));

    expect(frontRails).toHaveLength(2);
    frontRails.forEach((rail) => {
      const bounds = new Box3().setFromObject(rail);
      expect(bounds.min.x).toBeGreaterThanOrEqual(stepBounds.min.x - 1e-6);
      expect(bounds.max.x).toBeLessThanOrEqual(stepBounds.max.x + 1e-6);
    });
  });

  it('uses one clean outer rail per side stair with complete shared terrace joints', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const sideRails = group.children.filter(
      (child) => child.userData.kind === 'stair-balustrade'
        && (child.userData.stairSide === 'left' || child.userData.stairSide === 'right'),
    );

    expect(sideRails).toHaveLength(2);
    sideRails.forEach((rail) => {
      const posts = rail.children.filter((child) => child.userData.kind === 'stair-balustrade-post');
      const boards = rail.children.filter((child) => child.userData.kind === 'stair-balustrade-board');
      const highPost = posts.find((post) => post.userData.endpoint === 'high');
      const terraceSide = rail.userData.stairSide === 'left' ? 'terrace-left' : 'terrace-right';
      const terraceRail = group.children.find(
        (child) => child.userData.kind === 'platform-balustrade'
          && child.userData.side === terraceSide,
      )!;
      const terraceBoard = terraceRail.children.find(
        (child) => child.userData.kind === 'platform-balustrade-board',
      )!;
      const terraceBounds = new Box3().setFromObject(terraceBoard);

      expect(boards).toHaveLength(1);
      expect(posts).toHaveLength(6);
      expect(highPost).toBeDefined();
      expect(highPost!.position.x).toBeCloseTo(terraceBoard.position.x, 5);
      expect(highPost!.position.z).toBeCloseTo(terraceBounds.min.z, 5);
    });
  });

  it('extends the main front railing to both side stair edges without a gap', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const frontRails = group.children.filter(
      (child) => child.userData.kind === 'platform-balustrade' && child.userData.side === 'front',
    );
    const sideSteps = group.children.filter(
      (child) => child.userData.kind === 'platform-step'
        && (child.userData.side === 'left' || child.userData.side === 'right'),
    );
    const leftSteps = new Box3();
    const rightSteps = new Box3();
    sideSteps.forEach((step) => (
      step.userData.side === 'left' ? leftSteps : rightSteps
    ).expandByObject(step));
    const railCenterX = (rail: typeof frontRails[number]): number => (
      rail.children.find((child) => child.userData.kind === 'platform-balustrade-board')!.position.x
    );
    const leftRail = frontRails.find((rail) => railCenterX(rail) < 0)!;
    const rightRail = frontRails.find((rail) => railCenterX(rail) > 0)!;

    const leftBoard = leftRail.children.find(
      (child) => child.userData.kind === 'platform-balustrade-board',
    )!;
    const rightBoard = rightRail.children.find(
      (child) => child.userData.kind === 'platform-balustrade-board',
    )!;
    expect(new Box3().setFromObject(leftBoard).max.x).toBeCloseTo(leftSteps.min.x, 5);
    expect(new Box3().setFromObject(rightBoard).min.x).toBeCloseTo(rightSteps.max.x, 5);
  });

  it('adds one shared-post railing bay toward the center on both front sides', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const frontRails = group.children.filter(
      (child) => child.userData.kind === 'platform-balustrade' && child.userData.side === 'front',
    );
    const extensions = group.children.filter(
      (child) => child.userData.kind === 'front-center-extension',
    );

    expect(extensions).toHaveLength(2);

    const boardFor = (rail: typeof extensions[number]) => rail.children.find(
      (child) => child.userData.kind === 'platform-balustrade-board',
    )!;
    const leftRail = frontRails.find((rail) => boardFor(rail).position.x < 0)!;
    const rightRail = frontRails.find((rail) => boardFor(rail).position.x > 0)!;
    const leftExtension = extensions.find((rail) => boardFor(rail).position.x < 0)!;
    const rightExtension = extensions.find((rail) => boardFor(rail).position.x > 0)!;
    const leftRailBounds = new Box3().setFromObject(boardFor(leftRail));
    const rightRailBounds = new Box3().setFromObject(boardFor(rightRail));
    const leftExtensionBounds = new Box3().setFromObject(boardFor(leftExtension));
    const rightExtensionBounds = new Box3().setFromObject(boardFor(rightExtension));

    extensions.forEach((extension) => {
      expect(extension.children.filter(
        (child) => child.userData.kind === 'platform-balustrade-board',
      )).toHaveLength(1);
      expect(extension.children.filter(
        (child) => child.userData.kind === 'platform-balustrade-post',
      )).toHaveLength(1);
    });
    expect(leftExtensionBounds.min.x).toBeCloseTo(leftRailBounds.max.x, 5);
    expect(rightExtensionBounds.max.x).toBeCloseTo(rightRailBounds.min.x, 5);
    expect(leftExtensionBounds.max.x).toBeCloseTo(-rightExtensionBounds.min.x, 5);
    expect(leftExtensionBounds.max.x).toBeGreaterThan(leftRailBounds.max.x);
    expect(rightExtensionBounds.min.x).toBeLessThan(rightRailBounds.min.x);
  });

  it('stacks the stone cap above the upper brick layer without overlap', () => {
    const materials = createBuildingMaterials(DENING_HALL);
    const { group } = createFoundations(DENING_HALL, materials);
    const upperBrick = group.children.find((child) => child.userData.kind === 'platform-wall');
    const stoneCap = group.children.find((child) => child.userData.kind === 'platform-main');
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
    expect(stairRails.filter((rail) => rail.userData.stairSide === 'front')).toHaveLength(2);
    (['left', 'right'] as const).forEach((side) => {
      expect(stairRails.filter((rail) => rail.userData.stairSide === side)).toHaveLength(1);
      expect(stairRails.filter((rail) => rail.userData.stairSide === side)[0]!.userData.railIndex).toBe(1);
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
