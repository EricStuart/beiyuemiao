# 侧梁、同模数斗拱与屋脊细节 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with checkpoints.

**Goal:** 按右视测绘图完善德宁殿侧面梁枋、上下层斗拱模数、上檐标高及正脊/鸱吻/斜脊中段装饰。

**Architecture:** 保持现有 `timber-frame.ts` 与 `roof.ts` 的几何职责边界。用 `roof.ts` 导出的上檐下移常量让屋顶和梁架共享同一标高；斗拱继续由 `addBracketSet` 生成，lower/upper 共用同一组 stage 尺寸和缩放；所有新增构件写入 `userData.kind`，让单元测试能验证结构关系而不依赖渲染截图。

**Tech Stack:** TypeScript, Three.js, Vitest, Vite。

---

### Task 1: Add failing timber-frame regression tests

**Files:**
- Modify: `src/model/timber-frame.test.ts`

- [ ] **Step 1: Test the side column-head beams**

Add assertions that `grid` contains two `lower-column-head-beam` and two `lower-column-head-cap` meshes for the front/rear pair and the same counts for left/right; each set must have `userData.side` and the side beams must span the side axis.

- [ ] **Step 2: Test identical lower/upper bracket modules**

Collect one lower column bracket and one upper column bracket. Assert their four stage `userData.width` and `userData.depth` arrays match, their `scale.y` values match, and every bracket stage count remains four.

- [ ] **Step 3: Run the focused test and verify RED**

Run `npm test -- --run src/model/timber-frame.test.ts`. It must fail because side beams are not tagged/created for the side elevations and upper brackets currently use vertical scales `1.72/1.85`.

### Task 2: Implement shared bracket scale and closed side梁枋

**Files:**
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: Tag and close the four-sided column-head梁枋 band**

Create the dark beam and green cap for each side in `['front', 'rear', 'left', 'right']`, using the existing full-width/full-depth frame extents. Set `userData.level = 'lower'`, `userData.side`, and `userData.kind` to `lower-column-head-beam` / `lower-column-head-cap`.

- [ ] **Step 2: Remove upper-only vertical stretching**

Change `addBracketSet` so both levels use `verticalScale = role === 'intercolumn' ? 0.92 : 1`, keep `roleScale` unchanged, and expose `userData.verticalScale` for regression inspection.

- [ ] **Step 3: Derive shared upper alignment heights**

Import `UPPER_ROOF_DROP` and `UPPER_ROOF_BASE_Y` from `roof.ts`. Keep `upperBracketBaseY = 13.05`; set upper eave-frame, plaque hanger, rods, and plaque center from `UPPER_ROOF_BASE_Y` so the assembly moves together.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run `npm test -- --run src/model/timber-frame.test.ts`; all timber-frame tests must pass.

### Task 3: Add failing roof-detail regression tests

**Files:**
- Modify: `src/model/roof.test.ts`

- [ ] **Step 1: Test four mid-ridge ornaments**

Assert the upper roof contains exactly four `userData.kind === 'mid-ridge-ornament'` groups, one for each hip ridge sign pair, and that each ornament’s bounds intersect the corresponding hip ridge bounds.

- [ ] **Step 2: Test thicker main ridge and ridge band**

Assert the upper `main-ridge` world Y thickness is greater than `0.8` and the upper `ridge-band` world Y thickness is greater than `0.7`.

- [ ] **Step 3: Test chiwen bases seat on the main ridge**

Tag each chiwen base as `chiwen-base`, assert its Y thickness is greater than `0.4`, and assert each base bounds intersects the main-ridge bounds.

- [ ] **Step 4: Run the focused roof test and verify RED**

Run `npm test -- --run src/model/roof.test.ts`. It must fail because the mid-ridge ornaments do not exist and the current ridge/base thicknesses are below the new thresholds.

### Task 4: Implement roof drop and roof ornaments

**Files:**
- Modify: `src/model/roof.ts`

- [ ] **Step 1: Add shared roof alignment constants**

Export `UPPER_ROOF_DROP = 1.4` and `UPPER_ROOF_BASE_Y = 16.0 - UPPER_ROOF_DROP`. In `createRoofs`, use `baseY: UPPER_ROOF_BASE_Y` and `ridgeY: data.upperRidgeHeight - UPPER_ROOF_DROP` for the upper roof; store both values in the roof group `userData`.

- [ ] **Step 2: Thicken the top ridge and chiwen base**

Increase the upper main ridge cylinder radii to `0.4`/`0.48`, increase `ridge-band` height to `0.78`, and increase the chiwen base to approximately `2.0 × 0.46 × 0.82`. Tag the base `chiwen-base`.

- [ ] **Step 3: Add four mid-ridge ornaments**

For each upper hip ridge, sample the midpoint of `createHipRidgePoints`, create a small glazed-green/gold ornament group tagged `mid-ridge-ornament`, rotate its local ridge axis to the hip tangent, and position it at the sampled ridge point so its base intersects the ridge tube.

- [ ] **Step 4: Run roof tests and verify GREEN**

Run `npm test -- --run src/model/roof.test.ts`; all roof tests must pass.

### Task 5: Full verification and browser QA

**Files:**
- Modify: `src/model/timber-frame.test.ts` and `src/model/roof.test.ts` only if assertions need precision adjustment after implementation.
- Create: `artifacts/screenshots/side-beams-upper-brackets-front.jpg`, `artifacts/screenshots/side-beams-upper-brackets-side.jpg`, `artifacts/screenshots/side-beams-upper-brackets-aerial.jpg`.

- [ ] **Step 1: Run the full test suite**

Run `npm test -- --run`; expect zero failures.

- [ ] **Step 2: Run typecheck and production build**

Run `npm run typecheck` and `npm run build`; both must exit with code 0.

- [ ] **Step 3: Inspect the browser from front, right-side, and aerial views**

Verify side梁枋 continuity, equal bracket module scale, upper roof contact, four mid-ridge ornaments, thicker top ridge, and seated chiwen. Save the three screenshots and confirm no console errors or warnings.

- [ ] **Step 4: Commit and push only after fresh verification**

Run `git diff --check`, stage the implementation, commit with `完善：补齐侧梁统一斗拱并细化屋脊鸱吻`, then push with `git push origin master:main`. Confirm `HEAD`, `origin/main`, and `git ls-remote --heads origin main` are identical.
