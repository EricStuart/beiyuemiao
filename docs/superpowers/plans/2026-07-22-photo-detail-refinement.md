# 德宁之殿实拍细节完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依据三张实拍细节图完善“凸”字形高台基、构件落地、正面牌匾、二层斗拱、正脊装饰和鸱吻，同时保持 25.6m 总高。

**Architecture:** 继续使用现有 Three.js 程序化模型工厂，按台基、木构、屋顶三个既有模块分别实现。所有照片推断比例通过命名节点和 `userData` 暴露给几何测试，Canvas 牌匾仅负责渲染文字，核心尺寸不依赖浏览器 DOM。

**Tech Stack:** TypeScript、Three.js、Vite、Vitest、浏览器三视角截图验收。

---

## 文件结构

- Modify: `src/model/foundations.ts`：下沉庭院地面，生成主体台基、前凸月台、台阶与转折栏杆。
- Modify: `src/model/foundations.test.ts`：验证 2.9m 可见高度和“凸”字形平面关系。
- Modify: `src/model/timber-frame.ts`：完善上层斗拱，增加正面牌匾，统一柱墙落地元数据。
- Modify: `src/model/timber-frame.test.ts`：验证柱墙落地、牌匾位置和上层斗拱密度。
- Modify: `src/model/roof.ts`：生成上层正脊装饰带和有轮廓的鸱吻。
- Modify: `src/model/roof.test.ts`：验证两个上层鸱吻与正脊端部贴合。
- Create: `artifacts/screenshots/photo-detail-front.jpg`：正面验收图。
- Create: `artifacts/screenshots/photo-detail-side.jpg`：侧面验收图。
- Create: `artifacts/screenshots/photo-detail-aerial.jpg`：鸟瞰验收图。

### Task 1: “凸”字形高台基

**Files:**
- Modify: `src/model/foundations.test.ts`
- Modify: `src/model/foundations.ts`

- [ ] **Step 1: 写可见高度与平面轮廓的失败测试**

测试遍历 `userData.kind` 为 `platform-main`、`platform-terrace` 和 `courtyard-ground` 的节点，并断言：

```ts
expect(platformTop - groundY).toBeCloseTo(2.9, 5);
expect(terraceBounds.max.z).toBeGreaterThan(mainBounds.max.z);
expect(terraceBounds.min.x).toBeGreaterThan(mainBounds.min.x);
expect(terraceBounds.max.x).toBeLessThan(mainBounds.max.x);
expect(mainBounds.max.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
expect(terraceBounds.max.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
```

- [ ] **Step 2: 运行测试并确认因节点不存在而失败**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: FAIL，提示找不到命名台基或无法读取包围盒。

- [ ] **Step 3: 实现下沉地面、主体与前凸月台**

在 `createFoundations` 中使用固定照片推断可见高度：

```ts
const visiblePlatformHeight = 2.9;
const groundY = data.platformHeight - visiblePlatformHeight;
const terraceWidth = 15.6;
const terraceDepth = 5.8;
```

主体和月台分别生成砖墙、石带与顶帽；月台中心位于主体正面外侧，顶面与 `data.platformHeight` 对齐。台阶起点改为月台前缘，栏杆沿主体前缘和月台两侧转折，并在正中入口断开。所有层设置稳定的 `name` 与 `userData.kind`。

- [ ] **Step 4: 运行台基测试并确认通过**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: PASS。

### Task 2: 柱墙落地与正面牌匾

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 写柱墙最低点和牌匾位置的失败测试**

遍历首层柱及围护板，验证最低点统一为台基顶面；查找 `userData.kind === 'plaque'` 并断言位于上层正面中央：

```ts
expect(bounds.min.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
expect(plaque.position.x).toBeCloseTo(0, 5);
expect(plaque.position.z).toBeGreaterThan(0);
expect(plaque.position.y).toBeGreaterThan(DENING_HALL.lowerEaveHeight);
expect(plaque.position.y).toBeLessThan(DENING_HALL.upperEaveHeight);
```

- [ ] **Step 2: 运行测试并确认牌匾缺失导致失败**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL，牌匾节点数量为 0。

- [ ] **Step 3: 实现独立牌匾组**

增加 `createPlaque`，用有厚度的绿色底板、深色外框、金色内边与两侧垂花组成牌匾。浏览器环境使用 `CanvasTexture` 绘制“德宁之殿”，测试环境使用同尺寸金色装饰板回退。牌匾组设置：

```ts
plaque.name = '德宁之殿牌匾';
plaque.userData.kind = 'plaque';
plaque.position.set(0, 15.0, upperFront + 0.48);
```

复核首层柱、围护板和室内地板底面均以 `platformTop` 为最低点。

- [ ] **Step 4: 运行木构测试并确认落地与牌匾通过**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: PASS。

### Task 3: 连续多层二层斗拱

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 写上层斗拱数量、层次与标高失败测试**

断言正背面柱头铺作与补间铺作合计至少 `30` 组，每组包含至少 `7` 个构件，且包围盒位于上层梁枋与上檐之间：

```ts
expect(upperBrackets.length).toBeGreaterThanOrEqual(30);
upperBrackets.forEach((set) => {
  expect(set.children.length).toBeGreaterThanOrEqual(7);
  const bounds = new Box3().setFromObject(set);
  expect(bounds.min.y).toBeGreaterThan(15.5);
  expect(bounds.max.y).toBeLessThan(DENING_HALL.upperEaveHeight);
});
```

- [ ] **Step 2: 运行测试并确认旧单层斗拱失败**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL，旧模型只有柱头铺作且每组 4 个构件。

- [ ] **Step 3: 扩展上层斗拱并加入补间铺作**

上层铺作增加底斗、双层横拱、前后昂、承檐枋等构件；正背面每相邻柱之间各加一组缩小的补间铺作：

```ts
for (let index = 0; index < upperX.length - 1; index += 1) {
  const midpoint = ((upperX[index] ?? 0) + (upperX[index + 1] ?? 0)) / 2;
  addBracketSet(brackets, midpoint, upperTop + 0.5, upperFront, materials, 'upper', false, 'intercolumn');
  addBracketSet(brackets, midpoint, upperTop + 0.5, upperRear, materials, 'upper', false, 'intercolumn');
}
```

- [ ] **Step 4: 运行木构测试并确认通过**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: PASS。

### Task 4: 正脊装饰带与鸱吻

**Files:**
- Modify: `src/model/roof.test.ts`
- Modify: `src/model/roof.ts`

- [ ] **Step 1: 写上层鸱吻数量与贴合关系失败测试**

遍历 `userData.kind === 'chiwen'` 节点，断言只有上层屋顶包含两件，左右镜像且底部与正脊相接：

```ts
expect(upperChiwen).toHaveLength(2);
expect(lowerChiwen).toHaveLength(0);
expect(left.position.x).toBeCloseTo(-right.position.x, 5);
expect(new Box3().setFromObject(left).min.y).toBeLessThanOrEqual(upperRidgeTop + 0.1);
```

- [ ] **Step 2: 运行测试并确认旧抽象装饰缺少标记而失败**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL，找不到 `chiwen` 节点。

- [ ] **Step 3: 用挤出轮廓实现鸱吻并增加正脊装饰带**

用 `Shape` 和 `ExtrudeGeometry` 建立底座、躯干、头部、上卷吻部与尾部的连续侧向轮廓，左右端通过 `scale.x` 镜像。上层正脊沿长度增加交替的绿色琉璃底座和金色小饰块；下层仅保留现有简洁端饰。每个鸱吻设置：

```ts
chiwen.name = side < 0 ? '西侧鸱吻' : '东侧鸱吻';
chiwen.userData.kind = 'chiwen';
chiwen.userData.level = 'upper';
```

- [ ] **Step 4: 运行屋顶测试并确认通过**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: PASS。

### Task 5: 全量验证与浏览器验收

**Files:**
- Create: `artifacts/screenshots/photo-detail-front.jpg`
- Create: `artifacts/screenshots/photo-detail-side.jpg`
- Create: `artifacts/screenshots/photo-detail-aerial.jpg`

- [ ] **Step 1: 运行完整自动化验证**

Run: `npm test -- --run`

Expected: 全部测试通过。

Run: `npm run typecheck`

Expected: 退出码 0。

Run: `npm run build`

Expected: Vite 生产构建成功。

Run: `git diff --check`

Expected: 无错误。

- [ ] **Step 2: 浏览器检查正面视角**

打开 `http://127.0.0.1:5173/`，确认牌匾可辨识、中央入口保留、二层斗拱为连续多层结构，保存 `photo-detail-front.jpg`。

- [ ] **Step 3: 浏览器检查侧面视角**

切换左侧视角，确认台基砖墙增高、石帽与栏杆连续、柱墙无悬空，保存 `photo-detail-side.jpg`。

- [ ] **Step 4: 浏览器检查鸟瞰视角**

切换鸟瞰视角，确认主体台基与中央前凸月台构成“凸”字形，鸱吻贴合正脊，保存 `photo-detail-aerial.jpg`。

- [ ] **Step 5: 提交并推送**

```powershell
git add src/model/foundations.ts src/model/foundations.test.ts src/model/timber-frame.ts src/model/timber-frame.test.ts src/model/roof.ts src/model/roof.test.ts artifacts/screenshots/photo-detail-front.jpg artifacts/screenshots/photo-detail-side.jpg artifacts/screenshots/photo-detail-aerial.jpg docs/superpowers/plans/2026-07-22-photo-detail-refinement.md
git commit -m "完善：依据实拍补充台基斗拱牌匾与鸱吻"
git push origin master:main
```

Expected: 本地 `HEAD`、`origin/main` 与远端 `refs/heads/main` 指向同一提交。
