# 斗拱组数与柱网对应 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按实物观察将一层正面调整为26组、侧面调整为17组，将二层正面调整为22组、侧面调整为13组。

**Architecture:** 保留 `addBracketSet` 的单组几何，只修正 `createTimberFrame` 中的柱网采样和柱间布点。用一个小型坐标辅助函数生成每个柱间的中点或三等分点，正背和左右共用同一规则。

**Tech Stack:** TypeScript, Three.js, Vitest, Vite.

---

### Task 1: 锁定斗拱数量与对应位置

**Files:**
- Modify: `src/model/timber-frame.test.ts`

- [ ] **Step 1: Write failing tests**

将现有立面数量断言更新为一层 `{ front: 26, rear: 26, left: 17, right: 17 }`、二层 `{ front: 22, rear: 22, left: 13, right: 13 }`，并分别断言柱上与柱间角色数量。增加二层柱上斗拱与一层内侧柱位对应的坐标断言。

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL，当前一层为 `19/13`，二层为 `15/9`。

### Task 2: 按柱间生成斗拱坐标

**Files:**
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: Implement minimal coordinate helper**

添加辅助函数：每间需1组时返回中点，需2组时返回三分之一和三分之二点。

- [ ] **Step 2: Apply the four elevation rules**

一层正背的最外两间使用1组，内部七间使用2组；一层左右的最外两间使用1组，内部四间使用2组。二层四个立面的每个柱间均使用2组。

- [ ] **Step 3: Align upper axes**

以 `xAxis.slice(1, -1)` 和 `zAxis.slice(1, -1)` 作为二层柱上斗拱坐标，保证与一层内侧柱位对应。

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: PASS.

### Task 3: 全量验证与交付

**Files:**
- Create: `artifacts/screenshots/bracket-counts-front.jpg`
- Create: `artifacts/screenshots/bracket-counts-side.jpg`

- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`.
- [ ] 在浏览器检查正面与右侧斗拱密度、对称性、屋顶和牌匾接触关系，保存截图。
- [ ] 使用中文提交信息提交，并执行 `git push origin master:main`。
