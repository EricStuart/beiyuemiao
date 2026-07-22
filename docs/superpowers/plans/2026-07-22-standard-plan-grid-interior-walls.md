# 标准平面柱网与内墙 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按用户提供的标准俯视图校准 9 间 × 6 进柱网，并补充前五后一区域留空的殿身外墙和正面敞开的 C 字形内墙。

**Architecture:** 保留 `createAxisCoordinates` 的总跨度缩放机制，只替换 `DENING_HALL` 中的像素测量权重。围护继续由分段 Mesh 组成，外墙通过跳过指定 bay 形成真实空洞；C 字形内墙作为独立 Group 使用同一墙板生成函数，便于测试分段数量、方向和落地标高。

**Tech Stack:** TypeScript、Three.js、Vitest、Vite、浏览器多视角检查。

---

## 文件职责

- `src/data/building.ts`：保存标准俯视图测得的东西、南北柱距相对权重。
- `src/model/grid.test.ts`：验证权重、镜像对称、柱线数量和总跨度。
- `src/model/timber-frame.ts`：生成外墙空洞与 C 字形内墙。
- `src/model/timber-frame.test.ts`：验证外墙分段、空洞范围、C 字墙方向、无门扇以及墙体落地。
- `artifacts/screenshots/`：保存俯视、正面、背面和斜视验收截图。

### Task 1: 校准像素测量柱网

**Files:**
- Modify: `src/model/grid.test.ts`
- Modify: `src/data/building.ts`

- [ ] **Step 1: 写入失败的柱距权重测试**

在 `src/model/grid.test.ts` 中增加：

```ts
it('uses the mirrored pixel-traced spacing from the standard plan', () => {
  expect(DENING_HALL.bayWidths).toEqual([
    24.95, 33.05, 34.9, 33.85, 33.5, 33.85, 34.9, 33.05, 24.95,
  ]);
  expect(DENING_HALL.depthWidths).toEqual([
    24.4, 31.55, 32, 32, 31.55, 24.4,
  ]);

  DENING_HALL.bayWidths.forEach((width, index, widths) => {
    expect(width).toBeCloseTo(widths[widths.length - 1 - index]!, 6);
  });
  DENING_HALL.depthWidths.forEach((width, index, widths) => {
    expect(width).toBeCloseTo(widths[widths.length - 1 - index]!, 6);
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --run src/model/grid.test.ts`

Expected: FAIL，现有 `bayWidths` 和 `depthWidths` 与标准平面像素权重不一致。

- [ ] **Step 3: 替换建筑数据中的权重**

在 `src/data/building.ts` 中改为：

```ts
bayWidths: [24.95, 33.05, 34.9, 33.85, 33.5, 33.85, 34.9, 33.05, 24.95],
depthWidths: [24.4, 31.55, 32, 32, 31.55, 24.4],
```

- [ ] **Step 4: 运行柱网测试确认 GREEN**

Run: `npm test -- --run src/model/grid.test.ts`

Expected: PASS，柱线仍为 10 × 7，总跨度断言保持通过。

- [ ] **Step 5: 提交柱网调整**

```powershell
git add src/data/building.ts src/model/grid.test.ts
git commit -m "调整：按标准平面校准柱网比例"
```

### Task 2: 外墙前五后一留空

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 把现有外墙测试改成新分段数量**

将外墙测试命名改为 `encloses all four sides with five front and one rear openings`，断言：

```ts
expect(sideCounts).toEqual({ front: 2, rear: 6, left: 4, right: 4 });
expect(frontPanels.map((panel) => panel.userData.bay).sort()).toEqual([0, 6]);
expect(rearPanels.map((panel) => panel.userData.bay).sort()).toEqual([0, 1, 2, 4, 5, 6]);
const doorObjects: string[] = [];
grid.traverse((child) => {
  if (child.userData.kind === 'door-leaf'
    || child.name.includes('门扇')
    || child.name.includes('门框')) {
    doorObjects.push(child.name);
  }
});
expect(doorObjects).toHaveLength(0);
```

- [ ] **Step 2: 运行外墙测试确认 RED**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL，当前正面只跳过中央一间，背面没有开口。

- [ ] **Step 3: 修改外墙 bay 跳过规则**

在 `createTimberFrame` 的外墙循环中使用：

```ts
const frontOpeningBays = new Set([1, 2, 3, 4, 5]);
const rearOpeningBay = 3;

if (!frontOpeningBays.has(bay)) {
  addEnclosurePanel(
    lowerEnclosure,
    'front',
    bay,
    left,
    right,
    hallFront - 0.05,
    platformTop,
    enclosureHeight,
    materials,
  );
}
if (bay !== rearOpeningBay) {
  addEnclosurePanel(
    lowerEnclosure,
    'rear',
    bay,
    left,
    right,
    hallRear + 0.05,
    platformTop,
    enclosureHeight,
    materials,
  );
}
```

不增加任何门扇、门框或填充 Mesh。

- [ ] **Step 4: 运行外墙测试确认 GREEN**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: 外墙分段断言通过，现有斗拱和牌匾测试继续通过。

- [ ] **Step 5: 提交外墙开口**

```powershell
git add src/model/timber-frame.ts src/model/timber-frame.test.ts
git commit -m "完善：调整殿身前后墙开口"
```

### Task 3: 增加正面敞开的 C 字形内墙

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 写入失败的 C 字形墙测试**

在 `src/model/timber-frame.test.ts` 中增加：

```ts
it('adds a grounded C-shaped inner enclosure with an open front', () => {
  const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
  const inner = grid.getObjectByName('内槽 C 字形围护');
  const panels: Mesh[] = [];
  inner?.traverse((child) => {
    if (child instanceof Mesh && child.userData.kind === 'inner-enclosure-panel') {
      panels.push(child);
    }
  });

  const counts = { front: 0, rear: 0, left: 0, right: 0 };
  panels.forEach((panel) => {
    counts[panel.userData.side as keyof typeof counts] += 1;
    expect(new Box3().setFromObject(panel).min.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
  });

  expect(inner).toBeDefined();
  expect(counts).toEqual({ front: 0, rear: 5, left: 2, right: 2 });
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL，当前不存在 `内槽 C 字形围护`。

- [ ] **Step 3: 让墙板生成函数支持内外墙类型**

在 `addEnclosurePanel` 现有参数列表末尾增加：

```ts
kind = 'enclosure-panel',
panelName = '首层围护板',
mullionName = '首层围护竖棂',
```

把面板和竖棂的元数据赋值替换为：

```ts
panel.name = panelName;
panel.userData.kind = kind;

const mullionKind = kind === 'inner-enclosure-panel'
  ? 'inner-enclosure-mullion'
  : 'enclosure-mullion';

mullion.name = mullionName;
mullion.userData.kind = mullionKind;
```

其余 `BoxGeometry` 尺寸、位置和 `side`、`bay` 元数据保持原函数现状。

- [ ] **Step 4: 生成 C 字形内墙**

在外墙完成后增加 `innerEnclosure`：

```ts
const innerEnclosure = new Group();
innerEnclosure.name = '内槽 C 字形围护';
const innerLeft = xAxis[2]!;
const innerRight = xAxis[7]!;
const innerRear = zAxis[2]!;

for (let bay = 2; bay < 7; bay += 1) {
  addEnclosurePanel(
    innerEnclosure,
    'rear',
    bay - 2,
    xAxis[bay]!,
    xAxis[bay + 1]!,
    innerRear,
    platformTop,
    enclosureHeight,
    materials,
    'inner-enclosure-panel',
    '内槽后墙',
    '内槽后墙竖棂',
  );
}

for (let bay = 2; bay < 4; bay += 1) {
  addEnclosurePanel(
    innerEnclosure,
    'left',
    bay - 2,
    zAxis[bay]!,
    zAxis[bay + 1]!,
    innerLeft,
    platformTop,
    enclosureHeight,
    materials,
    'inner-enclosure-panel',
    '内槽左墙',
    '内槽左墙竖棂',
  );
  addEnclosurePanel(
    innerEnclosure,
    'right',
    bay - 2,
    zAxis[bay]!,
    zAxis[bay + 1]!,
    innerRight,
    platformTop,
    enclosureHeight,
    materials,
    'inner-enclosure-panel',
    '内槽右墙',
    '内槽右墙竖棂',
  );
}

grid.add(innerEnclosure);
```

不创建 `front` 面板，因此 C 字开口朝向正面。

- [ ] **Step 5: 运行 C 字墙测试确认 GREEN**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: C 字墙分段、落地标高和正面敞开断言通过。

- [ ] **Step 6: 提交内墙**

```powershell
git add src/model/timber-frame.ts src/model/timber-frame.test.ts
git commit -m "完善：增加正面敞开的C形内墙"
```

### Task 4: 全量验证与浏览器验收

**Files:**
- Create: `artifacts/screenshots/standard-plan-top.png`
- Create: `artifacts/screenshots/standard-plan-front.png`
- Create: `artifacts/screenshots/standard-plan-rear.png`
- Create: `artifacts/screenshots/standard-plan-oblique.png`

- [ ] **Step 1: 运行完整自动化验证**

```powershell
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Expected: 所有命令退出码为 0。

- [ ] **Step 2: 浏览器检查四个视角**

在 `http://127.0.0.1:5173/` 检查并保存：

- 俯视：台基在最外层，柱网位于台基内侧；C 字墙正面敞开。
- 正面：中央五间无遮挡，左右各保留一间墙体。
- 背面：只有正中一间无遮挡。
- 斜视：外墙、内墙和柱子全部落在台基顶面，没有悬空或重叠闪烁。

- [ ] **Step 3: 检查移动端**

使用 `390 × 844` 视口加载页面并拖动旋转，确认没有控制台 warning/error。

- [ ] **Step 4: 提交验收截图**

```powershell
git add artifacts/screenshots/standard-plan-*.png
git commit -m "验证：补充标准平面多视角截图"
```

- [ ] **Step 5: 推送并验证部署**

```powershell
git push origin master:main
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
```

Expected: 本地 `HEAD` 与 `origin/main` 一致，GitHub Pages 工作流成功。
