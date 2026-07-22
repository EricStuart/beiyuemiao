# 牌匾、上层屋面与鸱吻简化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复牌匾穿入下层屋面的几何问题，将上层屋面整体下移 1 米，并缩小、抽象化鸱吻。

**Architecture:** 继续使用 `UPPER_ROOF_DROP` 作为上层全部屋面构件的统一垂直偏移。牌匾不再使用固定中心高度，而是在斗拱和转换梁生成后读取其 `Box3` 边界，按上下构造线缩放和定位；鸱吻在原工厂函数中删减具象面部组件并降低整体比例。

**Tech Stack:** TypeScript, Three.js, Vitest, Vite.

---

### Task 1: 锁定屋面标高和牌匾构造线

**Files:**
- Modify: `src/model/roof.test.ts`
- Modify: `src/model/timber-frame.test.ts`

- [ ] **Step 1: Write the failing tests**

  将上层屋面基准预期改为 `13.5m`、正脊标高改为 `upperRidgeHeight - 2.5m`；将旧的高长方形牌匾断言改为近方形断言，并验证完整牌匾的上沿贴合二层斗拱最高点、下沿贴合转换梁架最高点。

- [ ] **Step 2: Run tests to verify RED**

  Run: `npm test -- --run src/model/timber-frame.test.ts src/model/roof.test.ts`

  Expected: FAIL because the current roof drop remains `1.5`, the plaque remains tall, and its lower edge is below the transfer frame.

- [ ] **Step 3: Implement the minimal roof and plaque geometry**

  In `roof.ts`, set `UPPER_ROOF_DROP = 2.5`. In `timber-frame.ts`, reduce the plaque parts to a compact near-square module, position it in front of the upper brackets, uniformly fit its complete tilted bounds between the transfer-frame top and upper-bracket top, then align its lower edge exactly to the transfer frame.

- [ ] **Step 4: Run focused tests to verify GREEN**

  Run: `npm test -- --run src/model/timber-frame.test.ts src/model/roof.test.ts`

  Expected: all focused tests pass.

### Task 2: 缩小并简化鸱吻

**Files:**
- Modify: `src/model/roof.test.ts`
- Modify: `src/model/roof.ts`

- [ ] **Step 1: Write the failing chiwen test**

  Assert that each chiwen contains one body, tail, head and abstract `chiwen-mouth`, contains no eye, pupil, whisker, horn, upper jaw, lower jaw or jaw hinge, and its world height is below `3.3m`.

- [ ] **Step 2: Run the test to verify RED**

  Run: `npm test -- --run src/model/roof.test.ts`

  Expected: FAIL because the current chiwen contains detailed facial parts and is too tall.

- [ ] **Step 3: Implement the simplified profile**

  Remove the detailed facial meshes, add one short flattened mouth mesh, reduce the head/snout emphasis, and change the group scale from roughly `1.3 × 1.24 × 1.3` to roughly `1.05 × 0.85 × 1.05` while preserving the seated base and mirrored placement.

- [ ] **Step 4: Run the focused tests to verify GREEN**

  Run: `npm test -- --run src/model/roof.test.ts src/model/timber-frame.test.ts`

  Expected: all focused tests pass.

### Task 3: 全量验证、视觉验收与推送

**Files:**
- Create: `artifacts/screenshots/plaque-roof-chiwen-front.jpg`
- Create: `artifacts/screenshots/plaque-roof-chiwen-oblique.jpg`
- Create: `artifacts/screenshots/plaque-roof-chiwen-low-angle.jpg`

- [ ] **Step 1: Run automated verification**

  Run: `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`.

  Expected: every command exits with code 0.

- [ ] **Step 2: Inspect browser views**

  Check front, oblique and low-angle views. Confirm plaque clearance and alignment, the one-metre roof drop, smaller abstract chiwen, camera controls, and an empty warning/error console.

- [ ] **Step 3: Commit and push**

  Commit with a Chinese message and push `master` to `origin/main`, then verify local and remote hashes match.
