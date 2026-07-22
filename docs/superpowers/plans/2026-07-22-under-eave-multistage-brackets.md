# 德宁之殿檐下多级斗拱与梁枋 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首层和二层檐下斗拱改为单排四级叠涩铺作，补齐连续横梁，并把牌匾改成上下长、左右窄的竖向矩形。

**Architecture:** 保持现有 Three.js 程序化生成边界。`addBracketSet` 负责一个方向和一个柱位的四级斗拱单元，四级子组用 `stage` 元数据暴露收分；`createTimberFrame` 负责四面梁架、单排矩阵和牌匾尺寸。Vitest 直接读取真实 Three.js 几何包围盒，验证层级、梁架连续性、屋面边界和牌匾比例。

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: 建立四级斗拱单元的失败测试

**Files:**
- Modify: `src/model/timber-frame.test.ts`

- [ ] **Step 1: 替换旧的 tier 排列断言为单元内部 stage 断言**

将旧测试 `builds a continuous multi-layer upper bracket band below the upper eave` 改为断言二层只有一排 48 组：

```ts
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
    expect(new Box3().setFromObject(set).min.y).toBeGreaterThan(12.25);
    expect(new Box3().setFromObject(set).max.y).toBeLessThan(DENING_HALL.upperEaveHeight);
  });
});
```

- [ ] **Step 2: 添加首层四级斗拱断言**

```ts
it('uses the same four-stage profile for lower bracket sets', () => {
  const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
  const lowerBracket = brackets.children.find(
    (child) => child.userData.level === 'lower' && child.userData.kind === 'bracket',
  );
  expect(lowerBracket).toBeDefined();
  expect(lowerBracket!.userData.stageCount).toBe(4);
  expect(lowerBracket!.children.filter((child) => child.userData.kind === 'bracket-stage')).toHaveLength(4);
  expect(new Box3().setFromObject(lowerBracket!).max.y).toBeLessThan(DENING_HALL.lowerEaveHeight);
});
```

- [ ] **Step 3: 添加梁架和二层矩阵方向失败断言**

```ts
it('exposes lower support, upper transfer, and upper eave beam frames', () => {
  const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
  expect(grid.getObjectByName('首层斗栱承托梁架')).toBeDefined();
  expect(grid.getObjectByName('二层斗栱转换梁架')).toBeDefined();
  expect(grid.getObjectByName('二层斗栱承檐梁架')).toBeDefined();
  [
    grid.getObjectByName('首层斗栱承托梁架'),
    grid.getObjectByName('二层斗栱转换梁架'),
    grid.getObjectByName('二层斗栱承檐梁架'),
  ].forEach((frame) => expect(frame!.children).toHaveLength(4));
});
```

- [ ] **Step 4: 添加牌匾竖向比例失败断言**

```ts
it('uses a tall narrow plaque with heavier top and bottom frames', () => {
  const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
  const plaque = grid.children.find((child) => child.userData.kind === 'plaque')!;
  const board = plaque.getObjectByName('牌匾绿色底板')!;
  const bounds = new Box3().setFromObject(board);
  const size = bounds.getSize(new Vector3());
  expect(size.y / size.x).toBeGreaterThan(1.3);
  expect(size.y / size.x).toBeLessThan(1.42);
  expect(plaque.getObjectByName('牌匾上下边框')?.userData.thickness).toBeGreaterThan(
    plaque.getObjectByName('牌匾左右边框')?.userData.thickness,
  );
});
```

- [ ] **Step 5: Run the focused tests and verify the new assertions fail**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL because the current implementation exposes 144 upper bracket groups with `tier`, lacks the three named beam frames, and the plaque board is wider than tall.

### Task 2: Implement the reusable four-stage bracket profile

**Files:**
- Modify: `src/model/timber-frame.ts:41-95`

- [ ] **Step 1: Replace the tier parameter with stage metadata**

Change `addBracketSet` to accept no `tier` argument and set:

```ts
set.userData.stageCount = 4;
```

Keep `level`, `role`, `side`, and `inward` metadata unchanged so existing side and direction tests continue to work.

- [ ] **Step 2: Generate four nested stage groups with monotonic dimensions**

Inside `addBracketSet`, replace the current fixed child geometry with these stage definitions:

```ts
const stages = [
  { stage: 1, width: 1.2, depth: 0.78, y: 0.12 },
  { stage: 2, width: 1.55, depth: 1.12, y: 0.43 },
  { stage: 3, width: 1.95, depth: 1.62, y: 0.76 },
  { stage: 4, width: 2.45, depth: 2.24, y: 1.10 },
] as const;

stages.forEach(({ stage, width, depth, y }) => {
  const stageGroup = new Group();
  stageGroup.name = `斗栱第${stage}层`;
  stageGroup.position.y = y;
  stageGroup.userData.kind = 'bracket-stage';
  stageGroup.userData.stage = stage;
  stageGroup.userData.width = width;
  const dou = beam(width * 0.42, 0.22, Math.min(depth * 0.5, 0.78), materials.paintedBlue);
  const transverse = beam(width, 0.22, 0.34, materials.timber);
  const projecting = beam(0.34, 0.22, depth, materials.darkTimber);
  const bearer = beam(width * 0.92, 0.20, 0.38, materials.paintedGreen);
  transverse.position.y = 0;
  projecting.position.y = 0.12;
  bearer.position.y = 0.25;
  stageGroup.add(dou, transverse, projecting, bearer);
  set.add(stageGroup);
});
```

Apply the existing `role === 'intercolumn'` scale to the whole set after stages are added, keeping supplementary side sets slightly narrower without changing the stage ordering.

- [ ] **Step 3: Run focused timber tests and verify the stage assertions pass**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: the new stage profile tests pass; the old upper tier-count tests are already replaced in Task 1.

### Task 3: Rebuild one-row upper matrix and add continuous beam frames

**Files:**
- Modify: `src/model/timber-frame.ts:250-330`
- Modify: `src/model/create-dening-hall.test.ts`

- [ ] **Step 1: Replace the three upper tier configurations with one matrix**

Generate only one set per position at `upperBracketBaseY = 13.05`:

```ts
for (const x of upperX) {
  addBracketSet(brackets, x, upperBracketBaseY, upperFront, materials, 'upper', false, 'column', 'front');
  addBracketSet(brackets, x, upperBracketBaseY, upperRear, materials, 'upper', false, 'column', 'rear');
}
for (let index = 0; index < upperX.length - 1; index += 1) {
  const left = upperX[index];
  const right = upperX[index + 1];
  if (left === undefined || right === undefined) continue;
  const midpoint = (left + right) / 2;
  addBracketSet(brackets, midpoint, upperBracketBaseY, upperFront, materials, 'upper', false, 'intercolumn', 'front');
  addBracketSet(brackets, midpoint, upperBracketBaseY, upperRear, materials, 'upper', false, 'intercolumn', 'rear');
}
for (const z of upperZ) {
  addBracketSet(brackets, upperLeft, upperBracketBaseY, z, materials, 'upper', true, 'column', 'left');
  addBracketSet(brackets, upperRight, upperBracketBaseY, z, materials, 'upper', true, 'column', 'right');
}
for (let index = 0; index < upperZ.length - 1; index += 1) {
  const rear = upperZ[index];
  const front = upperZ[index + 1];
  if (rear === undefined || front === undefined) continue;
  const midpoint = (rear + front) / 2;
  addBracketSet(brackets, upperLeft, upperBracketBaseY, midpoint, materials, 'upper', true, 'intercolumn', 'left');
  addBracketSet(brackets, upperRight, upperBracketBaseY, midpoint, materials, 'upper', true, 'intercolumn', 'right');
}
```

- [ ] **Step 2: Add the three named four-sided beam frames**

Extract a helper that adds four beams to a named group. Use the following vertical centers:

```ts
addFrame('二层斗栱转换梁架', upperBracketBaseY - 0.22, 0.42);
addFrame('二层斗栱承檐梁架', upperBracketBaseY + 1.48, 0.38);
```

For the lower frame use `lowerBracketBaseY = outerTop + 0.58` and the full `xAxis`/`zAxis` perimeter. Each frame must contain front, rear, left, and right beams and have no gap at the corners.

- [ ] **Step 3: Keep upper enclosure and upper columns absent**

Do not reintroduce `上层檐下围护` or any upper `column`. Update the assembly test to assert 48 upper brackets, three named frames, and no upper enclosure.

- [ ] **Step 4: Run assembly and timber tests**

Run: `npm test -- --run src/model/timber-frame.test.ts src/model/create-dening-hall.test.ts`

Expected: all focused tests pass with 48 upper bracket sets and three four-sided frame groups.

### Task 4: Resize the plaque to a vertical narrow rectangle

**Files:**
- Modify: `src/model/timber-frame.ts:160-194, 311-324`
- Modify: `src/model/timber-frame.test.ts`

- [ ] **Step 1: Change plaque dimensions and names**

Use a board width of `2.8`, height of `3.8`, and depth of `0.28`. Set `board.userData.aspect = 'vertical'`. Name the two horizontal frame meshes `牌匾上下边框` and the two vertical frame meshes `牌匾左右边框`; set their `userData.thickness` values to `0.32` and `0.20` respectively.

- [ ] **Step 2: Recenter trim, pendants, hanger beam, and rods**

Move the trim to the new board edges, narrow the hanger beam to `4.6`, and place rods at `x = ±0.9`. Keep the plaque at the existing front-facing `plaqueZ` and in the same vertical interval between the eaves.

- [ ] **Step 3: Run plaque-focused tests**

Run: `npm test -- --run src/model/timber-frame.test.ts -t "plaque"`

Expected: plaque placement, no lettering, independent hanger, and vertical aspect tests all pass.

### Task 5: Full verification and browser low-angle acceptance

**Files:**
- Modify: `artifacts/screenshots/under-eave-front.jpg`
- Modify: `artifacts/screenshots/under-eave-side.jpg`
- Modify: `artifacts/screenshots/under-eave-aerial.jpg`

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Expected: all tests pass, typecheck exits 0, Vite build succeeds, and only line-ending warnings (if any) appear in `git diff --check`.

- [ ] **Step 2: Inspect the local Three.js page**

Open `http://127.0.0.1:5173/`. Capture the default front view, the left-side view, and the aerial view. Use the front and side views to inspect the under-eave structure, and the aerial view to confirm the plaque and beam frames remain aligned with both roofs. Verify that:

- both levels show one continuous row of four-stage brackets;
- the lower support beam and the upper transfer/eave beams are visible from below;
- stage widths increase upward without floating gaps;
- the plaque is visibly taller than wide and remains independent;
- no console error or warning is emitted.

- [ ] **Step 3: Save screenshots and inspect them**

Save screenshots to the three paths above and use image inspection to confirm the construction is readable at 1280×720 or larger.

- [ ] **Step 4: Commit the implementation**

```powershell
git add src/model/timber-frame.ts src/model/timber-frame.test.ts src/model/create-dening-hall.test.ts artifacts/screenshots/under-eave-front.jpg artifacts/screenshots/under-eave-side.jpg artifacts/screenshots/under-eave-aerial.jpg docs/superpowers/plans/2026-07-22-under-eave-multistage-brackets.md
git commit -m "完善：重构檐下多级斗拱与梁枋"
```

- [ ] **Step 5: Push and verify the remote**

```powershell
git push origin master:main
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git ls-remote --heads origin main
```

Expected: local `HEAD`, `origin/main`, and `ls-remote` all show the same commit, and the worktree is clean.
