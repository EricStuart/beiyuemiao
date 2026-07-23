# Foundation, Roof, Light, and Censer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove platform and railing intersections, enforce the requested diamond-tile pattern at every quality level, close the lower-roof bracket gap, constrain the light cycle to the bright frontal arc, and add a centered white-stone Taoist censer.

**Architecture:** Keep measured dimensions in `BuildingData`, add discrete tile-grid metadata to roof placements, and expose one shared `ROOF_STACK_DROP` for every element above the lower brackets. Simplify foundations to vertical measured walls, derive all railing endpoints from stair bounds, and isolate the censer in its own model factory.

**Tech Stack:** TypeScript, Three.js, Vite, Vitest, in-app browser visual QA.

---

### Task 1: Make the green diamond quality-independent

**Files:**
- Modify: `src/model/roof.ts`
- Test: `src/model/roof.test.ts`

- [ ] **Step 1: Write the failing test**

Parameterize the diamond assertion over `high`, `medium`, and `low` quality and require the exact row profile:

```ts
it.each(['high', 'medium', 'low'] as const)(
  'uses the exact diamond row profile at %s quality',
  (quality) => {
    const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), quality);
    const diamond = roofs.children[1]!.getObjectByName('二层中央菱形绿瓦')!;
    expect(diamond.userData.rowTileCounts).toEqual([1, 3, 7, 13, 7, 3, 1]);
    expect(diamond.userData.tipInstanceCounts).toEqual({ left: 1, right: 1, top: 1, bottom: 1 });
  },
);
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: medium or low quality reports a row profile different from `[1, 3, 7, 13, 7, 3, 1]`.

- [ ] **Step 3: Add discrete grid coordinates and select exact rows**

Extend `TilePlacement` with `column`, `columnCount`, and `rowCount`. Populate those fields in `collectTilePlacements`, then replace the continuous mask with the fixed half-width profile:

```ts
const DIAMOND_HALF_WIDTHS = [0, 1, 3, 6, 3, 1, 0] as const;

function isGreenDiamond(placement: TilePlacement): boolean {
  if (placement.side !== 'front') return false;
  const centerRow = Math.ceil(DIAMOND_CENTER_T * placement.rowCount - 0.5);
  const localRow = placement.row - (centerRow - 3);
  if (localRow < 0 || localRow >= DIAMOND_HALF_WIDTHS.length) return false;
  const centerColumn = placement.columnCount / 2;
  return Math.abs(placement.column - centerColumn) <= DIAMOND_HALF_WIDTHS[localRow]!;
}
```

- [ ] **Step 4: Run the roof tests and verify GREEN**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: all roof tests pass at all three quality levels.

### Task 2: Replace the stepped base and align all stair railings

**Files:**
- Modify: `src/model/foundations.ts`
- Test: `src/model/foundations.test.ts`

- [ ] **Step 1: Write failing platform and railing geometry tests**

Add assertions that:

```ts
expect(platformWalls).toHaveLength(1);
expect(platformWallSize.x).toBeCloseTo(DENING_HALL.platformWidth.value, 5);
expect(platformWallSize.z).toBeCloseTo(DENING_HALL.platformDepth.value, 5);
expect(sideStepsBounds.min.z).toBeGreaterThanOrEqual(platformWallBounds.max.z - 1e-6);
expect(frontRailBounds.min.x).toBeGreaterThanOrEqual(frontStepBounds.min.x - 1e-6);
expect(frontRailBounds.max.x).toBeLessThanOrEqual(frontStepBounds.max.x + 1e-6);
expect(sideStairRails).toHaveLength(2);
expect(nearStairGapRails).toHaveLength(0);
```

For each side, require one sloped board, six posts including both endpoints, and a shared coordinate between the stair high endpoint and the terrace-side rail start.

- [ ] **Step 2: Run the foundation test and verify RED**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: the current three-level base, floating front rails, gap rails, and side-rail coordinates fail the new assertions.

- [ ] **Step 3: Build one measured vertical platform wall**

Replace `lower`, `middle`, and `upper` with one mesh:

```ts
const platformWall = box(width, upperTop - groundY, depth, materials.brick);
platformWall.position.y = (groundY + upperTop) / 2;
platformWall.userData.kind = 'platform-wall';
```

Remove the protruding terrace base band so the terrace is also a vertical wall plus cap and paving. Return `platformWall` as the platform collision.

- [ ] **Step 4: Derive railing coordinates from stair bounds**

Use these shared coordinates:

```ts
const frontRailX = stairWidth / 2 - 0.28;
const sideRailZ = sideStairZ + sideStairWidth / 2 - 0.28;
const sideRailHighX = terraceHalf + 0.15;
const sideRailLowX = terraceHalf + sideFlightLength - 0.28;
```

Remove the two `platform-balustrade-gap` groups. Extend each main front rail segment to the side-flight edge, omit the terrace-side rail's first post, and let the stair high post serve as the shared joint post.

- [ ] **Step 5: Run the foundation tests and verify GREEN**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: all platform, stair, and railing geometry tests pass.

### Task 3: Add the centered white-stone Taoist censer

**Files:**
- Create: `src/model/censer.ts`
- Create: `src/model/censer.test.ts`
- Modify: `src/model/foundations.ts`

- [ ] **Step 1: Write the failing censer test**

Require an independent `terrace-censer` group at `x = 0`, `z = frontEdge + terraceDepth / 2`, with its minimum Y on the platform paving, width near `2.2 m`, height near `2.3 m`, three legs, two handles, and no overlap with the front stair bounds.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run src/model/censer.test.ts`

Expected: module or censer group is missing.

- [ ] **Step 3: Implement `createTerraceCenser`**

Create a `LatheGeometry` round belly with a torus rim, three evenly spaced tapered legs, two torus handles, a shallow lid, and a simplified cloud/flame finial. Apply `materials.stone` to the exterior and a cloned darker stone material to the mouth recess. Set semantic `userData.kind` values on the group and each component.

- [ ] **Step 4: Add the censer to foundations and verify GREEN**

Add the group after terrace paving creation and run:

`npm test -- --run src/model/censer.test.ts src/model/foundations.test.ts`

Expected: both test files pass.

### Task 4: Move the complete roof stack down by 0.23 m

**Files:**
- Modify: `src/model/roof.ts`
- Modify: `src/model/timber-frame.ts`
- Test: `src/model/roof.test.ts`
- Test: `src/model/timber-frame.test.ts`

- [ ] **Step 1: Write failing roof-stack contact tests**

Export `ROOF_STACK_DROP` and require `0.23`. Assert that the lower roof minimum center-eave Y equals the maximum lower-bracket Y within `0.01 m`, and that lower/upper roof base and ridge elevations all shift by the same value. Require upper bracket frames, plaque, and hanger to preserve their pre-shift relative offsets to the roofs.

- [ ] **Step 2: Run roof and timber tests and verify RED**

Run: `npm test -- --run src/model/roof.test.ts src/model/timber-frame.test.ts`

Expected: the current lower eave remains `0.23 m` above the lower brackets.

- [ ] **Step 3: Apply one shared stack offset**

Add:

```ts
export const ROOF_STACK_DROP = 0.23;
export const UPPER_ROOF_BASE_Y = 16.0 - UPPER_ROOF_DROP - ROOF_STACK_DROP;
```

Subtract `ROOF_STACK_DROP` from both lower-roof elevations, upper ridge elevation, lower/upper roof surface helpers, and `upperBracketBaseY`. Let plaque and hanger placement continue deriving from the shifted surface helpers.

- [ ] **Step 4: Run roof and timber tests and verify GREEN**

Run: `npm test -- --run src/model/roof.test.ts src/model/timber-frame.test.ts`

Expected: both suites pass with no new gaps.

### Task 5: Constrain the natural-light cycle to the bright frontal arc

**Files:**
- Modify: `src/runtime/natural-light-cycle.ts`
- Test: `src/runtime/natural-light-cycle.test.ts`

- [ ] **Step 1: Replace the old full-orbit assertions with bright-arc assertions**

Sample at least 32 points and require every state to satisfy:

```ts
expect(state.position.z).toBeGreaterThan(50);
expect(Math.abs(Math.atan2(state.position.x, state.position.z))).toBeLessThanOrEqual(Math.PI * 25 / 180 + 1e-6);
expect(state.intensity).toBeGreaterThanOrEqual(3.65);
expect(state.intensity).toBeLessThanOrEqual(3.9);
```

Keep the cycle-closure assertion and verify that left, center, and right positions still differ.

- [ ] **Step 2: Run the light-cycle test and verify RED**

Run: `npm test -- --run src/runtime/natural-light-cycle.test.ts`

Expected: the current full 360-degree orbit enters side/back and lower-intensity states.

- [ ] **Step 3: Implement a frontal ping-pong arc**

Use a sinusoidal lateral phase around the front axis:

```ts
const lateral = Math.sin(phase * Math.PI * 2);
const angle = Math.PI / 2 + lateral * (Math.PI * 25 / 180);
const frontness = Math.cos(lateral * Math.PI / 2);
position: { x: Math.cos(angle) * 62, y: 60 + frontness * 2, z: Math.sin(angle) * 62 };
intensity: 3.65 + frontness * 0.25;
fillIntensity: 2.35 + frontness * 0.15;
```

Mix only between two light warm colors and keep `NATURAL_LIGHT_CYCLE_MS = 90_000`.

- [ ] **Step 4: Run the light-cycle test and verify GREEN**

Run: `npm test -- --run src/runtime/natural-light-cycle.test.ts`

Expected: all samples stay in the bright frontal arc and the cycle closes cleanly.

### Task 6: Full verification and delivery

**Files:**
- Verify all modified files

- [ ] **Step 1: Run all automated checks**

Run:

```powershell
npm test -- --run
npm run build
git diff --check
```

Expected: all tests pass, production build exits zero, and diff check is clean.

- [ ] **Step 2: Perform visual QA**

At desktop and `390 x 844` mobile sizes, inspect front, left, right, and aerial presets. Confirm the front rails rest on stairs, side stairs do not intersect the base, railing joints are continuous without duplicate posts, the censer is centered and grounded, the lower roof touches its brackets, the diamond profile is exact, and the console has no warning/error logs.

- [ ] **Step 3: Commit and push**

Commit the implementation with a Chinese message, push `master` to `origin/main`, fetch, and verify `HEAD` equals `origin/main`.

