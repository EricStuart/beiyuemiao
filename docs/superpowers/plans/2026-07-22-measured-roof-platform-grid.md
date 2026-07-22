# 德宁之殿测绘比例与重檐闭合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按测绘尺寸重排柱网、台基、月台和楼梯，将下檐改成无横向正脊的截顶庑殿屋面，并修正梁架、斗拱和牌匾的接触关系。

**Architecture:** 建筑数据层分别保存柱网、主台基和月台尺寸；柱网、木构、屋顶和台基生成器只读取各自对应的尺寸。屋顶生成器扩展 `truncated` 类型，以矩形顶部边界替代下檐水平正脊。Vitest 直接检查真实 Three.js 包围盒、屋脊节点、角脊端点、柱网跨度、楼梯轴向和牌匾倾角。

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: 测绘尺寸与柱网数据

**Files:**
- Modify: `src/data/building.ts`
- Modify: `src/model/grid.ts`
- Modify: `src/model/grid.test.ts`

- [ ] **Step 1: 写测绘尺寸和柱网跨度失败测试**

在 `grid.test.ts` 增加：

```ts
it('uses the measured column grid and platform dimensions', () => {
  expect(DENING_HALL.planWidth.value).toBeCloseTo(44.03, 5);
  expect(DENING_HALL.planDepth.value).toBeCloseTo(25.98, 5);
  expect(DENING_HALL.platformWidth.value).toBeCloseTo(48.03, 5);
  expect(DENING_HALL.platformDepth.value).toBeCloseTo(31.77, 5);
  expect(DENING_HALL.terraceWidth.value).toBeCloseTo(25.10, 5);
  expect(DENING_HALL.terraceDepth.value).toBeCloseTo(19.86, 5);

  const x = createAxisCoordinates(DENING_HALL.bayWidths, DENING_HALL.planWidth.value);
  const z = createAxisCoordinates(DENING_HALL.depthWidths, DENING_HALL.planDepth.value);
  expect(x.at(-1)! - x[0]!).toBeCloseTo(44.03, 5);
  expect(z.at(-1)! - z[0]!).toBeCloseTo(25.98, 5);
  expect(x[1]! - x[0]!).toBeCloseTo(x.at(-1)! - x.at(-2)!, 5);
  expect(z[1]! - z[0]!).toBeCloseTo(z.at(-1)! - z.at(-2)!, 5);
});
```

- [ ] **Step 2: 运行测试并确认新字段缺失**

Run: `npm test -- --run src/model/grid.test.ts`

Expected: TypeScript/Vitest fails because `platformWidth`, `platformDepth`, `terraceWidth`, and `terraceDepth` do not exist and the current grid spans are `52.8 × 38.06m`.

- [ ] **Step 3: 扩展 BuildingData 并填入测绘值**

在 `BuildingData` 增加四个 `SourcedNumber` 字段：

```ts
platformWidth: SourcedNumber;
platformDepth: SourcedNumber;
terraceWidth: SourcedNumber;
terraceDepth: SourcedNumber;
```

将 `planWidth` 改为 `44.03m`、`planDepth` 改为 `25.98m`，四个新字段分别使用 `48.03m`、`31.77m`、`25.10m`、`19.86m`，证据级别使用 `secondary`，说明来自用户提供的平面测绘摘录。把四个字段加入 `validateBuildingData` 的正数校验。

- [ ] **Step 4: 运行柱网测试**

Run: `npm test -- --run src/model/grid.test.ts`

Expected: all grid tests pass with 9 facade bays, 6 depth bays, and measured total spans.

### Task 2: 主台基、月台和三向楼梯

**Files:**
- Modify: `src/model/foundations.test.ts`
- Modify: `src/model/foundations.ts`

- [ ] **Step 1: 写实测台基与月台失败测试**

```ts
it('uses the measured main platform and terrace footprints', () => {
  const { group } = createFoundations(DENING_HALL, createBuildingMaterials(DENING_HALL));
  const main = group.children.find((child) => child.userData.kind === 'platform-wall')!;
  const terrace = group.children.find((child) => child.userData.kind === 'platform-terrace')!;
  const terraceWall = terrace.children.find((child) => child.userData.kind === 'terrace-wall')!;
  const mainSize = new Box3().setFromObject(main).getSize(new Vector3());
  const terraceSize = new Box3().setFromObject(terraceWall).getSize(new Vector3());
  expect(mainSize.x).toBeCloseTo(48.03, 2);
  expect(mainSize.z).toBeCloseTo(31.77, 2);
  expect(terraceSize.x).toBeCloseTo(25.10, 2);
  expect(terraceSize.z).toBeCloseTo(19.86, 2);
});
```

- [ ] **Step 2: 写楼梯尺寸失败测试**

收集 `platform-step`，验证：

```ts
expect(front).toHaveLength(12);
expect(frontBounds.getSize(new Vector3()).x).toBeCloseTo(6.4, 1);
expect(frontBounds.getSize(new Vector3()).z).toBeCloseTo(5.5, 1);
expect(leftBounds.getSize(new Vector3()).x).toBeCloseTo(4.8, 1);
expect(leftBounds.getSize(new Vector3()).z).toBeCloseTo(3.0, 1);
expect(rightBounds.getSize(new Vector3()).x).toBeCloseTo(4.8, 1);
expect(rightBounds.getSize(new Vector3()).z).toBeCloseTo(3.0, 1);
```

- [ ] **Step 3: 运行基础测试并确认旧固定尺寸失败**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: FAIL because the current main platform derives from `planWidth + 7.2`, the terrace is `26 × 10m`, the front stair is `10.8m` wide, and each side flight is about `10m` long.

- [ ] **Step 4: 使用测绘字段重建台基和月台**

在 `createFoundations` 中使用：

```ts
const width = data.platformWidth.value;
const depth = data.platformDepth.value;
const terraceWidth = data.terraceWidth.value;
const terraceDepth = data.terraceDepth.value;
```

主体台基墙使用精确 `width × depth`；下层和中层只在其外侧分别放脚 `2.4m` 和 `1.1m`。为 `terraceWall` 设置 `userData.kind = 'terrace-wall'`。

- [ ] **Step 5: 重算楼梯和栏杆**

正面梯使用 `stairWidth = 6.4`、`stepCount = 12`、`stepDepth = 5.5 / 12`。侧梯使用 `sideFlightLength = 4.8`、`sideStairWidth = 3.0`、`sideStepRun = 4.8 / 12`，高端继续接月台后侧两角。所有主台基前栏、月台前栏、月台侧栏和坡栏开口由这些尺寸重新计算。

- [ ] **Step 6: 运行基础测试**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: measured platform, terrace, 12-step front stair, shortened side stairs, complete balustrades, and horizontal side-flight tests pass.

### Task 3: 无横向正脊的截顶下檐

**Files:**
- Modify: `src/model/roof.test.ts`
- Modify: `src/model/roof.ts`

- [ ] **Step 1: 写下檐无主脊和四角脊失败测试**

为屋脊节点增加 `userData.kind` 后，测试：

```ts
it('uses a truncated lower roof with four closed hip ridges and no main ridge', () => {
  const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'medium');
  const lower = roofs.children.find((child) => child.name === '下檐庑殿顶')!;
  const mainRidges: Object3D[] = [];
  const hipRidges: Object3D[] = [];
  lower.traverse((child) => {
    if (child.userData.kind === 'main-ridge') mainRidges.push(child);
    if (child.userData.kind === 'hip-ridge') hipRidges.push(child);
  });
  expect(mainRidges).toHaveLength(0);
  expect(hipRidges).toHaveLength(4);
  expect(lower.userData.roofForm).toBe('truncated-hip');
});
```

- [ ] **Step 2: 写截顶角脊端点与投影斜率测试**

扩展 `createHipRidgePoints`，对 `topWidth`、`topDepth` 维度断言每条下檐角脊首尾分别位于外檐角和顶部矩形角；新增 `projectHipSlope(points, axis)`，验证上下层对应角脊的 X/Y 和 Z/Y 投影斜率差小于 `0.03`。

- [ ] **Step 3: 运行屋顶测试并确认旧完整庑殿顶失败**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL because the current lower roof creates one main ridge and its hip ridges converge to a horizontal ridge instead of a rectangular upper boundary.

- [ ] **Step 4: 扩展 RoofDimensions 和屋面采样**

增加：

```ts
topWidth?: number;
topDepth?: number;
ridgeStyle?: 'truncated' | 'simple' | 'chiwen';
```

在屋面、瓦垄和角脊采样中统一使用：

```ts
const topHalfWidth = (dimensions.topWidth ?? dimensions.ridgeLength) / 2;
const topHalfDepth = (dimensions.topDepth ?? 0) / 2;
const extentX = halfWidth + (topHalfWidth - halfWidth) * t;
const extentZ = halfDepth + (topHalfDepth - halfDepth) * t;
```

当 `ridgeStyle === 'truncated'` 时，不创建主脊、主脊端部装饰和正脊带，只创建四条命名角脊。

- [ ] **Step 5: 使用新柱网生成上下屋顶**

下檐外轮廓使用 `planWidth + 9`、`planDepth + 9`，顶部矩形使用二层转换梁外包络，顶部标高约 `13.05m`。上檐 `baseY` 下调到承檐梁顶部附近约 `14.75m`，使斗拱紧贴屋面；上檐保持 `chiwen` 正脊。

- [ ] **Step 6: 运行屋顶测试**

Run: `npm test -- --run src/model/roof.test.ts src/model/roof-profile.test.ts`

Expected: lower roof has no main ridge, four hip ridges seat on the truncated surface, upper roof keeps one main ridge and two chiwen, and projection alignment tests pass.

### Task 4: 斗拱密度、梁架标高和牌匾倾角

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 写首层正背面斗拱密度失败测试**

```ts
it('fills the lower front and rear bays with intercolumn bracket sets', () => {
  const { brackets } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
  const lower = brackets.children.filter((child) => child.userData.level === 'lower');
  const counts = { front: 0, rear: 0, left: 0, right: 0 };
  lower.forEach((set) => { counts[set.userData.side as keyof typeof counts] += 1; });
  expect(counts).toEqual({ front: 19, rear: 19, left: 13, right: 13 });
  expect(lower.some((set) => set.userData.side === 'front' && set.userData.role === 'intercolumn')).toBe(true);
});
```

- [ ] **Step 2: 写牌匾向外倾斜失败测试**

```ts
expect(plaque.rotation.x).toBeCloseTo(Math.PI / 20, 3);
expect(plaque.userData.outwardTiltDegrees).toBe(9);
```

同时检查倾斜后的牌匾包围盒仍位于正面斗拱之外。

- [ ] **Step 3: 写梁架与屋面接触范围测试**

验证转换梁顶部接近 `13.05m`，承檐梁顶部接近上檐 `baseY`，首层斗拱最高点低于并接近下檐瓦面。允许接触覆盖范围为 `0.05m` 至 `0.15m`。

- [ ] **Step 4: 运行木构测试并确认密度、倾角和标高失败**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL because current front/rear each has 10 lower bracket sets, plaque rotation is zero, and frame elevations still target the old roof bases.

- [ ] **Step 5: 增加正背面补间铺作并调整梁架**

在 `xAxis` 相邻坐标中点，为首层正面和背面各增加 9 组 `intercolumn` 铺作。根据新下檐顶部和上檐 `baseY` 调整 `lowerBracketBaseY`、`upperBracketBaseY`、转换梁和承檐梁标高，使包围盒测试通过。

- [ ] **Step 6: 倾斜牌匾与吊架**

设置：

```ts
plaque.rotation.x = Math.PI / 20;
plaque.userData.outwardTiltDegrees = 9;
```

微调 `plaqueZ`、吊梁高度和吊杆长度，使顶部外倾后仍不穿上檐、底部不穿斗拱。

- [ ] **Step 7: 运行木构测试**

Run: `npm test -- --run src/model/timber-frame.test.ts src/model/create-dening-hall.test.ts`

Expected: lower bracket counts, plaque tilt, frame contact, upper no-wall/no-column, and assembly tests pass.

### Task 5: 资料面板、全量验证与浏览器验收

**Files:**
- Modify: `src/ui/app-ui.ts`
- Modify: `src/ui/app-ui.test.ts`
- Create: `artifacts/screenshots/measured-roof-front.jpg`
- Create: `artifacts/screenshots/measured-roof-side.jpg`
- Create: `artifacts/screenshots/measured-roof-aerial.jpg`
- Create: `artifacts/screenshots/measured-roof-eave.jpg`

- [ ] **Step 1: 更新资料面板失败测试和显示内容**

测试资料面板包含 `主台基 48.03 × 31.77 m`、`前出月台 25.10 × 19.86 m` 和 `柱网 44.03 × 25.98 m`。修改 `app-ui.ts`，将旧推定面阔/进深替换为柱网值，并新增台基、月台两项，证据标签使用“测绘”。

- [ ] **Step 2: 运行完整自动化验证**

Run:

```powershell
npm test -- --run
npm run typecheck
npm run build
git diff --check
```

Expected: all Vitest files pass, TypeScript exits 0, Vite build succeeds, and no whitespace error appears.

- [ ] **Step 3: 浏览器检查四个视角**

打开 `http://127.0.0.1:5173/`：

- 正面确认下檐横脊消失、首层斗拱加密、牌匾向外倾斜；
- 左侧确认上下角脊投影连续、斗拱和屋面无空气缝；
- 鸟瞰确认 `48.03 × 31.77m` 主台基和 `25.10 × 19.86m` 月台比例；
- 近檐观察确认四条下檐角脊闭合到转换梁，不悬空或穿瓦；
- 控制台无 error/warn。

- [ ] **Step 4: 保存并检查验收截图**

保存四张截图到上述路径，并逐张检查屋脊、瓦面、梁架、斗拱、牌匾、柱、台基、楼梯和栏杆。

- [ ] **Step 5: 提交与推送**

```powershell
git add src/data/building.ts src/model/grid.ts src/model/grid.test.ts src/model/foundations.ts src/model/foundations.test.ts src/model/roof.ts src/model/roof.test.ts src/model/timber-frame.ts src/model/timber-frame.test.ts src/model/create-dening-hall.test.ts src/ui/app-ui.ts src/ui/app-ui.test.ts docs/superpowers/plans/2026-07-22-measured-roof-platform-grid.md artifacts/screenshots/measured-roof-*.jpg
git commit -m "完善：按测绘比例闭合重檐屋脊与台基柱网"
git push origin master:main
```

- [ ] **Step 6: 核对远端**

Run:

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git ls-remote --heads origin main
```

Expected: worktree clean and all three hashes match.
