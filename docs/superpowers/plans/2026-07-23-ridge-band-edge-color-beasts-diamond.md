# Ridge Band, Edge Color, Beasts, and Diamond Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a yellow glazed front band to the top ridge, continuous green roof-surface edge bands, eight hip-ridge end beasts, and a wider seven-row green tile diamond with single-tile tips.

**Architecture:** Keep the existing roof geometry and instance layout. Extend the material factory with one yellow glaze, add vertex colors to the existing roof surface for continuous edge bands, derive the new diamond from the existing placement mask, and reuse the existing simplified ridge-beast language for eight end ornaments.

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: Yellow glazed ridge band

**Files:**
- Modify: `src/model/materials.ts`
- Modify: `src/model/roof.ts`
- Test: `src/model/roof.test.ts`

- [ ] **Step 1: Write failing material and ridge-band tests**

Add a palette assertion:

```ts
expect(materials.yellowGlaze.color.getHex()).toBe(0xb08d3e);
```

Add a model test that finds one upper-roof child with `userData.kind === 'main-ridge-front-band'`, confirms it is a `Mesh` with `BoxGeometry`, confirms its material is `materials.yellowGlaze`, confirms `position.z > 0`, and confirms its bounds overlap the main ridge while remaining shorter than it. Confirm the lower roof has no such band.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: `yellowGlaze` and `main-ridge-front-band` are missing.

- [ ] **Step 3: Add the yellow glaze and front band**

Extend `BuildingMaterials` with `yellowGlaze: MeshPhysicalMaterial`, create it with color `0xb08d3e`, roughness `0.58`, metalness `0.03`, clearcoat `0.2`, and clearcoat roughness `0.7`, and include it in `all`.

Inside the non-truncated main-ridge branch, add:

```ts
const frontBand = new Mesh(
  new BoxGeometry(dimensions.ridgeLength - 3, 0.22, 0.08),
  materials.yellowGlaze,
);
frontBand.name = '最高正脊正面黄琉璃饰带';
frontBand.userData.kind = 'main-ridge-front-band';
frontBand.position.set(0, dimensions.ridgeY + 0.6, 0.28);
group.add(frontBand);
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: the material and band assertions pass.

### Task 2: Continuous surface edge color and wide diamond

**Files:**
- Modify: `src/model/roof.ts`
- Test: `src/model/roof.test.ts`

- [ ] **Step 1: Write failing surface and diamond assertions**

For each roof surface, require `userData.kind === 'roof-surface'`, a geometry `color` attribute, `materials.roofSurface.vertexColors === true`, `edgeBandColor === 0x2f543d`, and `edgeBandMode === 'eave-and-hip-boundaries'`. Multiply the first vertex color by the base roof material and confirm it renders as `materials.diamondTile.color`; multiply an interior vertex color at index `229` by the base and confirm it renders as the gray roof surface.

Update the diamond test to require:

```ts
expect(diamond!.userData.instanceCount).toBe(43);
expect(diamond!.userData.horizontalTileSpan).toBe(13);
expect(diamond!.userData.verticalTileRows).toBe(7);
expect(diamond!.userData.tipInstanceCounts).toEqual({
  left: 1,
  right: 1,
  top: 1,
  bottom: 1,
});
expect(diamond!.userData.maskRatioHalf).toBeCloseTo(0.3031578947, 8);
expect(diamond!.userData.maskTHalf).toBeCloseTo(3 / 14, 8);
```

Also change the regular edge-tile assertion from glazed ridge green to `materials.diamondTile.color`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: roof surface color attributes and new diamond metadata are missing; edge tiles still use glazed ridge green.

- [ ] **Step 3: Add vertex colors to the existing roof surface**

Change `createRoofSurface` to accept `MeshStandardMaterial` and an edge color. Set `material.vertexColors = true`. For every existing vertex, append a neutral white multiplier for the gray interior or an `edgeColor / material.color` multiplier when `Math.abs(ratio) >= 0.9` or `t <= 0.065`. Add the color buffer as a `Float32BufferAttribute`, and set:

```ts
mesh.userData.kind = 'roof-surface';
mesh.userData.edgeBandColor = edgeColor.getHex();
mesh.userData.edgeBandMode = 'eave-and-hip-boundaries';
```

Pass `materials.diamondTile.color` to `createRoofSurface` and to the existing ordinary tile-edge tint parameter.

- [ ] **Step 4: Replace the diamond mask and expose shape metadata**

Use these constants:

```ts
const DIAMOND_CENTER_T = 13 / 28;
const DIAMOND_RATIO_HALF = (1.92 / 38) * 6;
const DIAMOND_T_HALF = 3 / 14;
```

The mask remains a Manhattan diamond:

```ts
const vertical = Math.abs(t - DIAMOND_CENTER_T) / DIAMOND_T_HALF;
const horizontal = Math.abs(ratio) / DIAMOND_RATIO_HALF;
return vertical + horizontal <= 1 + 1e-9;
```

From `greenPlacements`, calculate total count, maximum tiles in a row, unique row count, and counts at minimum/maximum ratio and minimum/maximum `t`; store them as the metadata asserted above.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: surface edge and diamond tests pass.

### Task 3: Eight hip-ridge end beasts

**Files:**
- Modify: `src/model/roof.ts`
- Test: `src/model/roof.test.ts`

- [ ] **Step 1: Write the failing beast test**

For each roof level, find children with `userData.kind === 'ridge-end-beast'` and require exactly four. For every beast, find the hip ridge with matching `xSide` and `zSide`, require their world bounds to intersect, require `userData.facing === 'outward'`, and require the beast position to be on the signed eave corner. Confirm the total across both roof levels is eight.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: no `ridge-end-beast` objects exist.

- [ ] **Step 3: Create and place the end beasts**

Create `createRidgeEndBeast` by constructing a new simplified ornament with the same green base/body/head/crest and small yellow detail language as the current mid-ridge ornament. Set `userData.kind = 'ridge-end-beast'`, scale upper beasts to `0.78` and lower beasts to `0.68`.

For each hip ridge, use `hipPoints[0]` as the eave endpoint and `hipPoints[0] - hipPoints[1]` as the outward direction. Place the beast at the endpoint plus `0.12` meters in `y`, rotate it around `y` to face outward, set `xSide`, `zSide`, `level`, and `facing`, and add it beside the existing midpoint ornament.

- [ ] **Step 4: Run focused and full verification**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: all roof tests pass.

Run: `npm test -- --run`

Expected: all project tests pass.

Run: `npm run build`

Expected: TypeScript and Vite build successfully.

- [ ] **Step 5: Commit implementation**

```powershell
git add src/model/materials.ts src/model/roof.ts src/model/roof.test.ts
git commit -m "增加：正脊饰带与斜脊末端走兽"
```

### Task 4: Visual verification and publication

**Files:**
- Verify only; no planned source edits

- [ ] **Step 1: Run browser checks**

Start Vite on an unused local port. Capture desktop front and side screenshots and a `390x844` mobile screenshot. Confirm the yellow front band, continuous green surface edges, eight seated end beasts, horizontal diamond with single-tile tips, nonblank canvas, no overflow, and no browser warnings or errors.

- [ ] **Step 2: Merge and clean up**

Fast-forward the feature branch into local `master`, remove the owned worktree, and delete the merged feature branch.

- [ ] **Step 3: Verify and push**

From the main checkout run `npm test -- --run`, `npm run build`, and `git diff --check`. Then run `git push origin master:main` and verify `git rev-parse HEAD` equals `git rev-parse origin/main`.
