# Gray Roof and Green Edge Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render both roof levels with gray surfaces and gray ordinary tiles while keeping eave tiles, ridge-adjacent edge tiles, the upper diamond, and ridge ornaments green.

**Architecture:** Keep the existing roof geometry and `InstancedMesh` groups. Change the shared roof material palette, then extend the existing per-instance edge tint rule from the eave row to the union of the eave row and the two outermost tile columns beside each hip ridge.

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: Lock the gray material palette

**Files:**
- Modify: `src/model/roof.test.ts:14-25`
- Modify: `src/model/materials.ts:41-46`

- [ ] **Step 1: Write the failing palette assertions**

Update the first roof test to assert:

```ts
expect(materials.roofSurface.color.getHex()).toBe(0x4f534f);
expect(materials.tile.color.getHex()).toBe(0x74736c);
expect(materials.tileRib.color.getHex()).toBe(0x565852);
expect(materials.diamondTile.color.getHex()).toBe(0x2f543d);
expect(materials.glazedGreen.color.getHex()).toBe(0x255942);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: the three gray palette assertions fail against the old green and yellow colors.

- [ ] **Step 3: Apply the approved material colors**

In `createBuildingMaterials`, use:

```ts
const roofSurface = weathered(0x4f534f, 0.95);
const tile = weathered(0x74736c, 0.93);
const tileRib = weathered(0x565852, 0.92);
const diamondTile = weathered(0x2f543d, 0.9);
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: palette assertions pass; edge assertions may still fail only after Task 2 tests are added.

### Task 2: Recolor eave and ridge-adjacent tile instances

**Files:**
- Modify: `src/model/roof.test.ts:53-88`
- Modify: `src/model/roof.ts:228-279`

- [ ] **Step 1: Write failing instance-color assertions**

Extend the existing edge test to require:

```ts
expect(covering!.userData.eaveGreenInstanceCount).toBe(118);
expect(covering!.userData.ridgeGreenInstanceCount).toBe(112);
expect(covering!.userData.greenEdgeInstanceCount).toBe(222);
expect(covering!.userData.edgeGreenColor).toBe(0x255942);
```

Read instance `39` from the lower roof covering and verify its rendered color equals `materials.glazedGreen.color`; it is the first front-slope tile in row 1 beside a hip ridge. Read instance `40` and verify its rendered color equals the approved ordinary gray tile material.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: ridge and union count metadata are undefined, and instance `39` is not green.

- [ ] **Step 3: Extend the existing instance tint rule**

In `createInstancedTiles`, define the edge predicate and a neutral weathering tint:

```ts
const isGreenEdge = (placement: TilePlacement): boolean => (
  placement.row === 0 || Math.abs(placement.ratio) >= 0.95
);
```

When an edge color is present and `isGreenEdge(placement)` is true, set the existing green-over-base multiplier. Otherwise use a neutral tint so the final rendered color is the material color rather than its square:

```ts
const shade = index % 3 === 0 ? 0.93 : index % 3 === 1 ? 1 : 1.05;
mesh.setColorAt(index, new Color(1, 1, 1).multiplyScalar(shade));
```

Expose counts for eave instances, ridge-adjacent instances, and their union without creating additional meshes.

- [ ] **Step 4: Run the focused and full suites**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: all roof tests pass.

Run: `npm test -- --run`

Expected: all project tests pass.

- [ ] **Step 5: Commit implementation**

```powershell
git add src/model/materials.ts src/model/roof.ts src/model/roof.test.ts
git commit -m "调整：屋面改为灰瓦并保留绿色边沿"
```

### Task 3: Build, visually verify, merge, and publish

**Files:**
- Verify only; no planned source edits

- [ ] **Step 1: Build the production bundle**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 2: Verify the rendered model**

Start Vite on an unused local port. Capture desktop front and side screenshots plus a `390x844` mobile screenshot. Confirm gray surface and ordinary tiles, continuous green eave and ridge-adjacent edges, visible green diamond, nonblank canvas, no horizontal overflow, and no browser warnings or errors.

- [ ] **Step 3: Merge and verify the main branch**

Fast-forward the feature branch into local `master`, remove the owned worktree, then rerun `npm test -- --run` and `npm run build` from the main checkout.

- [ ] **Step 4: Push GitHub**

Run: `git push origin master:main`

Expected: remote `origin/main` advances to the verified local `master` commit.
