# 德宁之殿四面斗拱与大月台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除二层立柱和牌匾文字，补齐四面连续斗拱，并把台基改为带大月台、三向楼梯和整圈白色栏杆的“凸”字形结构。

**Architecture:** 延续现有 Three.js 程序化几何工厂。`timber-frame.ts` 负责二层檐下结构，`foundations.ts` 用命名路径节点生成月台、楼梯和栏杆；测试通过 `userData.kind/side/role` 验证构造数量、方向和标高。

**Tech Stack:** TypeScript、Three.js、Vitest、Vite、浏览器三视角截图验收。

---

## 文件结构

- Modify: `src/model/timber-frame.ts`：删除上层柱，生成四面斗拱，去除牌匾文字。
- Modify: `src/model/timber-frame.test.ts`：验证零上层柱、四面铺作与无字牌匾。
- Modify: `src/model/foundations.ts`：扩大月台，生成正面和左右楼梯，建立完整栏杆路径。
- Modify: `src/model/foundations.test.ts`：验证月台尺寸、三向楼梯和栏杆覆盖。
- Create: `artifacts/screenshots/upper-brackets-terrace-front.jpg`：正面验收。
- Create: `artifacts/screenshots/upper-brackets-terrace-side.jpg`：侧面验收。
- Create: `artifacts/screenshots/upper-brackets-terrace-aerial.jpg`：鸟瞰验收。

### Task 1: 二层零立柱与四面连续斗拱

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 写失败测试**

```ts
expect(upperColumns).toHaveLength(0);
expect(sideCounts).toEqual({ front: 15, rear: 15, left: 9, right: 9 });
for (const side of ['front', 'rear', 'left', 'right']) {
  expect(upperBrackets.some((set) => set.userData.side === side && set.userData.role === 'column')).toBe(true);
  expect(upperBrackets.some((set) => set.userData.side === side && set.userData.role === 'intercolumn')).toBe(true);
}
```

- [ ] **Step 2: 运行红灯测试**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL，上层仍有外围柱，左右侧斗拱数量为 0。

- [ ] **Step 3: 实现四面斗拱**

删除：

```ts
addPerimeterColumns(grid, upperX, upperZ, upperBottom, upperTop, 0.43, materials.timber, 'upper');
```

扩展 `addBracketSet` 参数，记录 `side`；正背面沿 `upperX` 生成 15 组，左右侧沿 `upperZ` 生成 9 组。侧面斗拱设置 `inward = true`，四角由端部完整铺作自然衔接。

- [ ] **Step 4: 运行绿灯测试**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: PASS。

### Task 2: 无字牌匾

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 写牌匾无文字失败测试**

```ts
const lettering: Object3D[] = [];
plaque.traverse((child) => {
  if (child.name.includes('字') || child.name.includes('文字')) lettering.push(child);
});
expect(lettering).toHaveLength(0);
```

- [ ] **Step 2: 运行测试并确认旧文字替身导致失败**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL，测试环境存在 `牌匾文字测试替身`。

- [ ] **Step 3: 删除文字生成代码与无用导入**

从 `createPlaque` 删除 Canvas、CanvasTexture、PlaneGeometry、MeshBasicMaterial 和金色测试替身，仅保留木框、绿色底板、金色内边与垂花。

- [ ] **Step 4: 运行木构测试**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: PASS。

### Task 3: 大月台与三向楼梯

**Files:**
- Modify: `src/model/foundations.test.ts`
- Modify: `src/model/foundations.ts`

- [ ] **Step 1: 写月台与楼梯失败测试**

```ts
expect(terraceBounds.max.x - terraceBounds.min.x).toBeGreaterThanOrEqual(25);
expect(terraceBounds.max.z - terraceBounds.min.z).toBeGreaterThanOrEqual(9.5);
expect(stairSides).toEqual(new Set(['front', 'left', 'right']));
expect(stepCounts).toEqual({ front: 10, left: 10, right: 10 });
```

每组台阶的最低级包围盒最低点等于庭院地面，最高级包围盒最高点等于台基顶面。

- [ ] **Step 2: 运行测试并确认旧月台尺寸与单楼梯失败**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: FAIL，旧月台约 15.9m × 6.1m 且仅有正面楼梯。

- [ ] **Step 3: 实现 26m × 10m 月台和左右镜像楼梯**

```ts
const terraceWidth = 26;
const terraceDepth = 10;
```

抽取 `addStairFlight`，为 `front` 生成沿 Z 方向的 10 级台阶，为 `left/right` 生成沿 X 方向的 10 级台阶。所有台阶设置 `kind = 'platform-step'`、`side` 和 `index`。

- [ ] **Step 4: 运行台基测试**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: 月台与三向楼梯测试 PASS。

### Task 4: 整圈栏杆

**Files:**
- Modify: `src/model/foundations.test.ts`
- Modify: `src/model/foundations.ts`

- [ ] **Step 1: 写栏杆覆盖失败测试**

```ts
expect(new Set(platformRails.map((rail) => rail.userData.side))).toEqual(
  new Set(['front', 'rear', 'left', 'right', 'terrace-front', 'terrace-left', 'terrace-right']),
);
expect(stairRails.filter((rail) => rail.userData.stairSide === 'front')).toHaveLength(2);
expect(stairRails.filter((rail) => rail.userData.stairSide === 'left')).toHaveLength(2);
expect(stairRails.filter((rail) => rail.userData.stairSide === 'right')).toHaveLength(2);
```

- [ ] **Step 2: 运行测试并确认旧栏杆覆盖不足**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: FAIL，旧模型只有主体前缘两段和主楼梯坡栏。

- [ ] **Step 3: 实现命名栏杆路径**

抽取 `addStraightBalustrade` 与 `addStairRailPair`。主体四边、月台三侧均生成栏板与栏柱，楼梯入口分段留口；三组楼梯各生成两条随坡栏杆。节点分别标记 `kind = 'platform-balustrade'` 和 `kind = 'stair-balustrade'`。

- [ ] **Step 4: 运行台基测试**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: PASS。

### Task 5: 全量验证、浏览器验收与推送

**Files:**
- Create: `artifacts/screenshots/upper-brackets-terrace-front.jpg`
- Create: `artifacts/screenshots/upper-brackets-terrace-side.jpg`
- Create: `artifacts/screenshots/upper-brackets-terrace-aerial.jpg`

- [ ] **Step 1: 运行完整验证**

Run: `npm test -- --run`

Run: `npm run typecheck`

Run: `npm run build`

Run: `git diff --check`

Expected: 全部退出码为 0。

- [ ] **Step 2: 浏览器三视角验收**

正面确认二层零立柱、无字牌匾和横向斗拱；左侧确认侧面斗拱、侧楼梯和栏杆；鸟瞰确认大月台、三向楼梯与整圈栏杆。保存三张截图并检查控制台无 WebGL 错误。

- [ ] **Step 3: 提交并推送**

```powershell
git add src/model/timber-frame.ts src/model/timber-frame.test.ts src/model/foundations.ts src/model/foundations.test.ts docs/superpowers/plans/2026-07-22-upper-brackets-terrace-balustrade.md artifacts/screenshots/upper-brackets-terrace-front.jpg artifacts/screenshots/upper-brackets-terrace-side.jpg artifacts/screenshots/upper-brackets-terrace-aerial.jpg
git commit -m "完善：补齐四面斗拱与台基栏杆楼梯"
git push origin master:main
```

Expected: 本地 `HEAD`、`origin/main` 和远端 `refs/heads/main` 哈希一致。
