# Door Animation and Faded Roof Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatically cycling double-leaf doors to the five front openings and central rear opening, cover both roof levels with faded yellow tile geometry, and add the upper-front central green diamond tile motif.

**Architecture:** Door geometry is created in a focused model module and returned as typed animation bindings instead of storing animation state inside Three.js objects. A pure runtime cycle function drives a small controller from the existing render loop. Roof tiles use shared low-poly geometry and `InstancedMesh` batches so the curved tile covering remains performant on mobile; the upper-front diamond uses a separate aged-green instance batch and replaces yellow tiles in that region.

**Tech Stack:** TypeScript, Three.js, Vite, Vitest, Three.js `Group`, `Mesh`, `InstancedMesh`, `Matrix4`, `Quaternion`, `CylinderGeometry`.

---

### Task 1: Model six double-leaf door openings

**Files:**
- Create: `src/model/doors.ts`
- Create: `src/model/doors.test.ts`
- Modify: `src/model/timber-frame.ts`
- Modify: `src/model/timber-frame.test.ts`

- [ ] **Step 1: Write the failing door-model tests**

Create `src/model/doors.test.ts` with assertions for the wished-for API:

```ts
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
});
```

Update the previous no-door assertion in `src/model/timber-frame.test.ts` so it still rejects accidental standalone door frames but expects exactly twelve meshes with `userData.kind === 'door-leaf'`.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
npm test -- --run src/model/doors.test.ts src/model/timber-frame.test.ts
```

Expected: FAIL because `TimberFrameResult` has no `doors` property and no `door-pair` groups exist.

- [ ] **Step 3: Implement the door geometry module**

Create `src/model/doors.ts` with these public types and factory:

```ts
import { BoxGeometry, Group, Mesh, type Material } from 'three';

export interface DoorLeafBinding {
  pivot: Group;
  closedRotationY: number;
  openRotationY: number;
}

export interface DoorPairResult {
  group: Group;
  leaves: [DoorLeafBinding, DoorLeafBinding];
}

export interface DoorPairOptions {
  side: 'front' | 'rear';
  bay: number;
  left: number;
  right: number;
  z: number;
  platformTop: number;
  height: number;
  material: Material;
  timberMaterial: Material;
}

export function createDoorPair(options: DoorPairOptions): DoorPairResult {
  const group = new Group();
  group.name = `${options.side === 'front' ? '正门' : '后门'}第${options.bay + 1}间`;
  group.userData.kind = 'door-pair';
  group.userData.side = options.side;
  group.userData.bay = options.bay;

  const openingWidth = options.right - options.left - 0.16;
  const centreGap = 0.08;
  const leafWidth = (openingWidth - centreGap) / 2;
  const openingAngle = Math.PI * 0.42;

  const createLeaf = (role: 'left' | 'right'): DoorLeafBinding => {
    const pivot = new Group();
    const isLeft = role === 'left';
    const pivotX = isLeft ? options.left + 0.08 : options.right - 0.08;
    pivot.position.set(pivotX, options.platformTop, options.z);
    pivot.userData.kind = 'door-leaf-pivot';
    pivot.userData.side = options.side;
    pivot.userData.bay = options.bay;
    pivot.userData.role = role;

    const leaf = new Mesh(
      new BoxGeometry(leafWidth, options.height, 0.18),
      options.material,
    );
    leaf.name = `${role === 'left' ? '左' : '右'}门扇`;
    leaf.userData.kind = 'door-leaf';
    leaf.userData.side = options.side;
    leaf.userData.bay = options.bay;
    leaf.userData.role = role;
    leaf.position.set(isLeft ? leafWidth / 2 : -leafWidth / 2, options.height / 2, 0);

    for (const yRatio of [0.18, 0.5, 0.82]) {
      const rail = new Mesh(
        new BoxGeometry(leafWidth + 0.04, 0.14, 0.24),
        options.timberMaterial,
      );
      rail.position.set(0, options.height * (yRatio - 0.5), 0.04);
      leaf.add(rail);
    }
    for (const xRatio of [-0.25, 0.25]) {
      const stile = new Mesh(
        new BoxGeometry(0.12, options.height - 0.18, 0.24),
        options.timberMaterial,
      );
      stile.position.set(leafWidth * xRatio, 0, 0.04);
      leaf.add(stile);
    }

    pivot.add(leaf);
    group.add(pivot);
    const outwardSign = options.side === 'front' ? 1 : -1;
    const leafSign = isLeft ? -1 : 1;
    return {
      pivot,
      closedRotationY: 0,
      openRotationY: openingAngle * outwardSign * leafSign,
    };
  };

  return { group, leaves: [createLeaf('left'), createLeaf('right')] };
}
```

Use a maximum opening angle of `Math.PI * 0.42` (75.6 degrees). Door leaf thickness is `0.18`, the pair leaves a `0.08` centre gap, and the leaf bottom is exactly `platformTop`.

Modify `TimberFrameResult` in `src/model/timber-frame.ts`:

```ts
export interface TimberFrameResult {
  grid: Group;
  brackets: Group;
  doors: {
    front: DoorLeafBinding[];
    rear: DoorLeafBinding[];
  };
}
```

For front bays `1..5`, create a pair at `hallFront - 0.05`. For rear bay `3`, create a pair at `hallRear + 0.05`. Add every pair group directly to `grid`, append its bindings to the matching door array, and return the arrays.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```powershell
npm test -- --run src/model/doors.test.ts src/model/timber-frame.test.ts
```

Expected: PASS with five front pairs, one rear pair, twelve door leaves, and no platform gaps.

- [ ] **Step 5: Commit the door model**

```powershell
git add src/model/doors.ts src/model/doors.test.ts src/model/timber-frame.ts src/model/timber-frame.test.ts
git commit -m "完善：增加正门与后门门扇"
```

### Task 2: Drive automatic opening and closing from the render loop

**Files:**
- Create: `src/runtime/door-animation.ts`
- Create: `src/runtime/door-animation.test.ts`
- Modify: `src/model/types.ts`
- Modify: `src/model/create-dening-hall.ts`
- Modify: `src/runtime/viewer.ts`

- [ ] **Step 1: Write the failing pure-cycle tests**

Create `src/runtime/door-animation.test.ts`:

```ts
import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { DoorAnimationController, evaluateDoorCycle } from './door-animation';

describe('automatic door cycle', () => {
  it('holds closed, opens, holds open, and closes within fourteen seconds', () => {
    expect(evaluateDoorCycle(0)).toBe(0);
    expect(evaluateDoorCycle(2000)).toBe(0);
    expect(evaluateDoorCycle(4500)).toBeCloseTo(1, 5);
    expect(evaluateDoorCycle(8000)).toBe(1);
    expect(evaluateDoorCycle(10500)).toBeCloseTo(0, 5);
    expect(evaluateDoorCycle(14000)).toBe(0);
  });

  it('keeps all front leaves synchronized while rear leaves use an offset phase', () => {
    const frontA = { pivot: new Group(), closedRotationY: 0, openRotationY: 1 };
    const frontB = { pivot: new Group(), closedRotationY: 0, openRotationY: -1 };
    const rear = { pivot: new Group(), closedRotationY: 0, openRotationY: 1 };
    const controller = new DoorAnimationController({ front: [frontA, frontB], rear: [rear] });
    controller.update(3500);
    expect(Math.abs(frontA.pivot.rotation.y)).toBeCloseTo(Math.abs(frontB.pivot.rotation.y), 5);
    expect(rear.pivot.rotation.y).not.toBeCloseTo(frontA.pivot.rotation.y, 5);
  });
});
```

- [ ] **Step 2: Run the animation test and verify RED**

Run:

```powershell
npm test -- --run src/runtime/door-animation.test.ts
```

Expected: FAIL because `door-animation.ts` does not exist.

- [ ] **Step 3: Implement the pure cycle and controller**

Create `src/runtime/door-animation.ts`:

```ts
import { MathUtils } from 'three';
import type { DoorLeafBinding } from '../model/doors';

const CYCLE_MS = 14_000;

function smoothstep(value: number): number {
  const t = MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function evaluateDoorCycle(timeMs: number, phaseMs = 0): number {
  const time = ((timeMs + phaseMs) % CYCLE_MS + CYCLE_MS) % CYCLE_MS;
  if (time < 2000) return 0;
  if (time < 4500) return smoothstep((time - 2000) / 2500);
  if (time < 8000) return 1;
  if (time < 10500) return 1 - smoothstep((time - 8000) / 2500);
  return 0;
}

export class DoorAnimationController {
  constructor(private readonly targets: { front: DoorLeafBinding[]; rear: DoorLeafBinding[] }) {}

  update(timeMs: number): void {
    this.apply(this.targets.front, evaluateDoorCycle(timeMs));
    this.apply(this.targets.rear, evaluateDoorCycle(timeMs, 2500));
  }

  private apply(leaves: DoorLeafBinding[], openness: number): void {
    leaves.forEach(({ pivot, closedRotationY, openRotationY }) => {
      pivot.rotation.y = MathUtils.lerp(closedRotationY, openRotationY, openness);
    });
  }
}
```

Extend `DeningHallModel` in `src/model/types.ts` with `doors: { front: DoorLeafBinding[]; rear: DoorLeafBinding[] }`. Return `timber.doors` from `createDeningHall`. In `DeningHallViewer`, instantiate `DoorAnimationController` after building creation and call `this.doorAnimation.update(time)` before rendering each frame.

- [ ] **Step 4: Run focused and model tests and verify GREEN**

Run:

```powershell
npm test -- --run src/runtime/door-animation.test.ts src/model/create-dening-hall.test.ts
```

Expected: PASS; repeated timestamps remain deterministic and the model exposes the animation bindings.

- [ ] **Step 5: Commit the runtime animation**

```powershell
git add src/runtime/door-animation.ts src/runtime/door-animation.test.ts src/model/types.ts src/model/create-dening-hall.ts src/runtime/viewer.ts
git commit -m "动画：实现正门后门循环开合"
```

### Task 3: Replace grey roof colour with faded yellow tile materials

**Files:**
- Modify: `src/model/materials.ts`
- Modify: `src/model/roof.test.ts`

- [ ] **Step 1: Write the failing material assertions**

Add to `src/model/roof.test.ts`:

```ts
it('uses faded yellow tiles and aged green diamond tiles', () => {
  const materials = createBuildingMaterials(DENING_HALL);
  expect(materials.tile.color.getHex()).toBe(0xa89163);
  expect(materials.tileRib.color.getHex()).toBe(0x8d7955);
  expect(materials.diamondTile.color.getHex()).toBe(0x55745a);
  expect(materials.tile.roughness).toBeGreaterThan(0.85);
});
```

- [ ] **Step 2: Run the roof test and verify RED**

Run:

```powershell
npm test -- --run src/model/roof.test.ts
```

Expected: FAIL because the current tile colours are grey and `diamondTile` is absent.

- [ ] **Step 3: Add the photographed faded materials**

In `BuildingMaterials`, add `diamondTile: MeshStandardMaterial`. Change the existing materials to:

```ts
const tile = weathered(0xa89163, 0.93);
tile.side = DoubleSide;
tile.vertexColors = true;
const tileRib = weathered(0x8d7955, 0.92);
const diamondTile = weathered(0x55745a, 0.9);
diamondTile.vertexColors = true;
```

Include `diamondTile` in the returned object and `all` disposal array. Keep `glazedGreen` unchanged for ridges, chiwen, and edge trim.

- [ ] **Step 4: Run the roof material test and verify GREEN**

Run:

```powershell
npm test -- --run src/model/roof.test.ts
```

Expected: PASS with the exact aged yellow, darker rib, and muted green colours.

- [ ] **Step 5: Commit material changes**

```powershell
git add src/model/materials.ts src/model/roof.test.ts
git commit -m "材质：调整屋面为褪色黄瓦"
```

### Task 4: Cover both roof levels with instanced curved tiles

**Files:**
- Modify: `src/model/roof.ts`
- Modify: `src/model/roof.test.ts`

- [ ] **Step 1: Write failing tile-covering tests**

Add these expectations to `src/model/roof.test.ts`:

```ts
it('covers both roof levels with instanced faded tiles', () => {
  const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
  const coverings = roofs.children.map((roof) => roof.getObjectByName('坡面筒瓦覆盖'));
  expect(coverings.every(Boolean)).toBe(true);
  coverings.forEach((covering) => {
    expect(covering!.userData.kind).toBe('roof-tile-covering');
    expect(covering!.userData.instanceCount).toBeGreaterThan(400);
    expect(covering!.userData.surfaceOffset).toBeGreaterThanOrEqual(0.07);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npm test -- --run src/model/roof.test.ts
```

Expected: FAIL because only line-based tile ribs exist.

- [ ] **Step 3: Implement the instanced tile covering**

In `src/model/roof.ts`, import `InstancedMesh`, `Matrix4`, `MeshStandardMaterial`, and `Quaternion`. Add helpers that create one half-cylinder tile geometry and place instances on front, back, left, and right faces:

```ts
interface TilePlacement {
  position: Vector3;
  tangent: Vector3;
  side: 'front' | 'back' | 'left' | 'right';
  ratio: number;
  t: number;
  length: number;
}

function collectTilePlacements(
  dimensions: RoofDimensions,
  quality: QualityLevel,
): TilePlacement[] {
  const columns = quality === 'high' ? 38 : quality === 'medium' ? 28 : 18;
  const rows = quality === 'high' ? 14 : quality === 'medium' ? 11 : 8;
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const topHalfWidth = (dimensions.topWidth ?? dimensions.ridgeLength) / 2;
  const topHalfDepth = (dimensions.topDepth ?? 0) / 2;
  const placements: TilePlacement[] = [];

  const pointAt = (
    side: TilePlacement['side'],
    ratio: number,
    t: number,
  ): Vector3 => {
    const extentX = halfWidth + (topHalfWidth - halfWidth) * t;
    const extentZ = halfDepth + (topHalfDepth - halfDepth) * t;
    const y = profileY(t, dimensions) + evaluateWingLift(ratio, t) + 0.08;
    if (side === 'front') return new Vector3(ratio * extentX, y, extentZ);
    if (side === 'back') return new Vector3(ratio * extentX, y, -extentZ);
    if (side === 'right') return new Vector3(extentX, y, ratio * extentZ);
    return new Vector3(-extentX, y, ratio * extentZ);
  };

  for (const side of ['front', 'back', 'left', 'right'] as const) {
    for (let row = 0; row < rows; row += 1) {
      const t1 = row / rows;
      const t2 = (row + 1) / rows;
      const t = (t1 + t2) / 2;
      for (let column = 0; column <= columns; column += 1) {
        const ratio = -0.96 + (1.92 * column) / columns;
        const start = pointAt(side, ratio, t1);
        const end = pointAt(side, ratio, t2);
        placements.push({
          position: start.clone().lerp(end, 0.5),
          tangent: end.clone().sub(start).normalize(),
          side,
          ratio,
          t,
          length: start.distanceTo(end) * 0.96,
        });
      }
    }
  }
  return placements;
}

function createInstancedTiles(
  placements: TilePlacement[],
  material: MeshStandardMaterial,
  name: string,
  kind: string,
): InstancedMesh {
  const geometry = new CylinderGeometry(0.14, 0.16, 1, 6, 1, true, 0, Math.PI);
  const mesh = new InstancedMesh(geometry, material, placements.length);
  const up = new Vector3(0, 1, 0);
  const quaternion = new Quaternion();
  const matrix = new Matrix4();
  const scale = new Vector3();
  const base = material.color.clone();
  placements.forEach((placement, index) => {
    quaternion.setFromUnitVectors(up, placement.tangent);
    scale.set(1, placement.length, 1);
    matrix.compose(placement.position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
    const shade = index % 3 === 0 ? 0.93 : index % 3 === 1 ? 1 : 1.05;
    mesh.setColorAt(index, base.clone().multiplyScalar(shade));
  });
  mesh.name = name;
  mesh.userData.kind = kind;
  mesh.userData.instanceCount = placements.length;
  mesh.userData.surfaceOffset = 0.08;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}
```

Call `collectTilePlacements(dimensions, quality)`, then pass the placements to `createInstancedTiles(..., materials.tile, '坡面筒瓦覆盖', 'roof-tile-covering')`. Add the mesh to each roof level before ridges. Preserve the current tile lines as darker seams, now using `materials.tileRib.color.getHex()`.

- [ ] **Step 4: Run roof tests and verify GREEN**

Run:

```powershell
npm test -- --run src/model/roof.test.ts
```

Expected: PASS; each roof level contains a batched tile covering with a safe surface offset.

- [ ] **Step 5: Commit the tile geometry**

```powershell
git add src/model/roof.ts src/model/roof.test.ts
git commit -m "完善：为两层屋面覆盖筒瓦"
```

### Task 5: Add the upper-front green diamond tile motif

**Files:**
- Modify: `src/model/roof.ts`
- Modify: `src/model/roof.test.ts`

- [ ] **Step 1: Write the failing diamond-motif test**

Add to `src/model/roof.test.ts`:

```ts
it('places one muted green diamond on the centre of the upper front slope', () => {
  const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
  const upper = roofs.children.find((child) => child.name === '上檐庑殿顶')!;
  const diamond = upper.getObjectByName('二层中央菱形绿瓦');
  expect(diamond).toBeDefined();
  expect(diamond!.userData.kind).toBe('green-diamond-tiles');
  expect(diamond!.userData.face).toBe('front');
  expect(diamond!.userData.instanceCount).toBeGreaterThan(20);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npm test -- --run src/model/roof.test.ts
```

Expected: FAIL because no upper diamond object exists.

- [ ] **Step 3: Build the green replacement tile batch**

Extend `createRoofLevel` with `greenDiamond = false`. For the upper roof only, classify front-face placements with:

```ts
const isGreenDiamond = ({ side, ratio, t }: TilePlacement): boolean => {
  if (side !== 'front') return false;
  const centredT = Math.abs(t - 0.46) / 0.22;
  const centredX = Math.abs(ratio) / 0.18;
  return centredT + centredX <= 1;
};
```

Skip these placements from the yellow covering and generate a second `InstancedMesh` from the same placements using `materials.diamondTile`. Name it `二层中央菱形绿瓦`, set `userData.kind = 'green-diamond-tiles'`, `face = 'front'`, and `instanceCount`. Pass `greenDiamond: true` only for the upper roof created in `createRoofs`.

- [ ] **Step 4: Run roof tests and verify GREEN**

Run:

```powershell
npm test -- --run src/model/roof.test.ts
```

Expected: PASS; the upper front slope has one centred diamond batch and the yellow batch has no overlapping instances in that region.

- [ ] **Step 5: Commit the motif**

```powershell
git add src/model/roof.ts src/model/roof.test.ts
git commit -m "完善：增加二层中央菱形绿瓦"
```

### Task 6: Full verification, browser playtest, merge, and push

**Files:**
- Verify all modified files
- Browser artifacts: `artifacts/screenshots/door-roof-front.png`, `door-roof-rear.png`, `door-roof-bird.png`, `door-roof-mobile.png`

- [ ] **Step 1: Run the complete automated verification**

```powershell
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Expected: all tests pass, TypeScript exits zero, Vite production build exits zero, and `git diff --check` prints nothing.

- [ ] **Step 2: Start an isolated local preview**

Start Vite from the implementation worktree on a free localhost port, verify the exact listener process belongs to that worktree, and avoid replacing an existing user server.

- [ ] **Step 3: Browser-verify desktop views**

Use the in-app browser to inspect:

- front view while the five front pairs open and close together;
- rear view while the rear pair cycles with an offset phase;
- bird view showing faded yellow tiles on both roofs and the centred upper green diamond;
- roof-only layer confirming tile instances remain grouped with the roofs.

Check the browser console for warnings or errors and save the desktop screenshots under `artifacts/screenshots/`.

- [ ] **Step 4: Browser-verify mobile**

Set the viewport to `390 × 844`, reload, wait through at least one opening transition, rotate the model, and confirm the door animation, green diamond, and controls remain usable. Save `door-roof-mobile.png`, then reset the viewport override.

- [ ] **Step 5: Re-run tests after any visual corrections**

```powershell
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

- [ ] **Step 6: Integrate and publish**

Fast-forward merge the implementation branch into `master`, re-run the full verification on `master`, then push:

```powershell
git push origin master:main
```

Confirm `refs/heads/main` matches local `HEAD`, wait for both GitHub Pages workflows to complete successfully, and verify `https://ericstuart.github.io/beiyuemiao/` returns HTTP 200 with the Dening Hall page title.
