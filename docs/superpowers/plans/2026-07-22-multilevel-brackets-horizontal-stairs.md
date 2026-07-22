# 德宁之殿多层斗拱与横向楼梯 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐首层侧斗拱，以三层四面斗拱替换二层墙面，独立悬挂牌匾，并将左右楼梯旋转为贴主台基前墙的横向楼梯。

**Architecture:** 保持现有 Three.js 工厂边界。木构模块通过 tier/side/role 元数据生成斗拱矩阵和牌匾吊架，台基模块通过 X 轴台阶与坡栏生成左右镜像楼梯；Vitest 直接验证数量、包围盒和轴向。

**Tech Stack:** TypeScript、Three.js、Vitest、Vite、浏览器三视角验收。

---

### Task 1: 首层左右侧斗拱

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 写失败测试**

```ts
expect(lowerSideCounts).toEqual({ left: 13, right: 13 });
expect(lowerSideSets.some((set) => set.userData.role === 'column')).toBe(true);
expect(lowerSideSets.some((set) => set.userData.role === 'intercolumn')).toBe(true);
```

- [ ] **Step 2: 运行 `npm test -- --run src/model/timber-frame.test.ts`，确认左右数量为 0**

- [ ] **Step 3: 沿 `zAxis` 在 `xAxis` 左右端生成 7 个完整铺作和 6 个补间铺作，侧面铺作旋转 90°并记录 side**

- [ ] **Step 4: 重跑木构测试，预期 PASS**

### Task 2: 二层三层斗拱替换墙面

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 写失败测试**

```ts
expect(upperEnclosureMeshes).toHaveLength(0);
expect(upperBrackets).toHaveLength(144);
expect(new Set(upperBrackets.map((set) => set.userData.tier))).toEqual(
  new Set(['lower', 'middle', 'upper']),
);
```

每个 tier 的方向数量必须为 `{ front: 15, rear: 15, left: 9, right: 9 }`。

- [ ] **Step 2: 运行木构测试，确认旧模型仍有围护且只有 48 组斗拱**

- [ ] **Step 3: 删除 `upperEnclosure` 生成逻辑，抽取 `addUpperBracketTier`，在 13.0m、14.25m、15.47m 三个标高生成四面斗拱矩阵；层间增加四面连续梁枋**

- [ ] **Step 4: 重跑木构测试，预期 PASS**

### Task 3: 独立牌匾吊架

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: 写失败测试**

```ts
expect(plaque.parent).toBe(grid);
expect(hangerBeams).toHaveLength(1);
expect(hangerRods).toHaveLength(2);
expect(plaqueBounds.min.z).toBeGreaterThan(frontBracketBounds.max.z);
```

- [ ] **Step 2: 运行木构测试，确认吊架节点不存在且牌匾与斗拱间距不足**

- [ ] **Step 3: 将牌匾向正面移动，增加 `plaque-hanger-beam` 横梁和两根 `plaque-hanger-rod` 吊杆，三者作为 grid 独立子节点**

- [ ] **Step 4: 重跑木构测试，预期 PASS**

### Task 4: 横向左右楼梯与坡栏

**Files:**
- Modify: `src/model/foundations.test.ts`
- Modify: `src/model/foundations.ts`

- [ ] **Step 1: 写失败测试**

```ts
expect(leftBounds.getSize(new Vector3()).x).toBeGreaterThan(leftBounds.getSize(new Vector3()).z * 3);
expect(rightBounds.getSize(new Vector3()).x).toBeGreaterThan(rightBounds.getSize(new Vector3()).z * 3);
expect(leftHighest.position.x).toBeGreaterThan(leftLowest.position.x);
expect(rightHighest.position.x).toBeLessThan(rightLowest.position.x);
```

同时验证左右楼梯低级落庭院、高级接月台，且各有两条 `stair-balustrade`。

- [ ] **Step 2: 运行 `npm test -- --run src/model/foundations.test.ts`，确认旧侧楼梯沿 Z 轴失败**

- [ ] **Step 3: 左右台阶改为沿 X 轴排列，Z 坐标贴主台基前缘；左侧由外向内升高，右侧镜像。坡栏端点同步改为 X 轴**

- [ ] **Step 4: 重跑台基测试，预期 PASS**

### Task 5: 验证与推送

**Files:**
- Create: `artifacts/screenshots/multilevel-brackets-front.jpg`
- Create: `artifacts/screenshots/multilevel-brackets-side.jpg`
- Create: `artifacts/screenshots/multilevel-brackets-aerial.jpg`

- [ ] **Step 1: 运行 `npm test -- --run`、`npm run typecheck`、`npm run build`、`git diff --check`，全部退出码为 0**

- [ ] **Step 2: 浏览器正面、左侧、鸟瞰验收三层斗拱、独立牌匾和横向楼梯，保存截图并检查控制台无错误**

- [ ] **Step 3: 提交并推送**

```powershell
git add src/model/timber-frame.ts src/model/timber-frame.test.ts src/model/foundations.ts src/model/foundations.test.ts docs/superpowers/plans/2026-07-22-multilevel-brackets-horizontal-stairs.md artifacts/screenshots/multilevel-brackets-front.jpg artifacts/screenshots/multilevel-brackets-side.jpg artifacts/screenshots/multilevel-brackets-aerial.jpg
git commit -m "完善：增加多层斗拱并调整侧楼梯"
git push origin master:main
```

Expected: 本地 `HEAD`、`origin/main` 和远端 `main` 哈希一致。
