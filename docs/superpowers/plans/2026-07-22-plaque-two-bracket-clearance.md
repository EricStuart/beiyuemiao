# 牌匾双斗拱尺度与檐口避让 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 放大牌匾到中央两组斗拱的尺度，消除上沿瓦面穿模，并让下沿贴住转换横梁。

**Architecture:** 在 `roof.ts` 暴露与上层屋面深度公式一致的前檐 Z 计算函数，避免木构代码复制魔法数。`timber-frame.ts` 根据中央两组正面斗拱的合并边界缩放牌匾，再分别沿 Y 对齐横梁、沿 Z 移到檐口外侧。

**Tech Stack:** TypeScript, Three.js, Vitest, Vite.

---

### Task 1: 写入牌匾尺度、横梁接触和檐口避让回归

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/roof.test.ts`

- [ ] **Step 1: Write the failing tests**

  在木构测试中选择正面最靠近中心的两组二层斗拱，将其 `Box3` 合并宽度与牌匾宽度比较，要求比值为 `0.85–0.95`；继续要求牌匾下沿与转换梁顶面误差不超过 `0.03m`，并要求牌匾 `min.z` 大于上层前檐 Z 至少 `0.06m`。在屋面测试中验证前檐计算函数与 `createRoofs` 的上层屋面包围尺寸一致。

- [ ] **Step 2: Verify RED**

  Run: `npm test -- --run src/model/timber-frame.test.ts src/model/roof.test.ts`

  Expected: current plaque width ratio is too small and its rear surface remains inside the upper eave footprint.

### Task 2: 实现双斗拱尺度与前檐避让

**Files:**
- Modify: `src/model/roof.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: Implement the eave helper**

  新增 `getUpperRoofFrontEaveZ(data)`，返回 `(data.planDepth.value * 0.68 + 7) / 2`，并让上层屋面深度由该函数的两倍生成。

- [ ] **Step 2: Implement plaque fitting**

  合并中央两组正面斗拱的边界，以其宽度的 `0.9` 倍为目标牌匾宽度；统一缩放牌匾，沿 Y 令下沿等于转换梁顶面，沿 Z 令牌匾后表面位于上层前檐外 `0.08m`。按最终边界更新悬挂横梁和吊杆。

- [ ] **Step 3: Verify GREEN**

  Run: `npm test -- --run src/model/timber-frame.test.ts src/model/roof.test.ts`

  Expected: focused tests pass.

### Task 3: 全量验证、浏览器验收与推送

**Files:**
- Create: `artifacts/screenshots/plaque-two-bracket-front.png`
- Create: `artifacts/screenshots/plaque-two-bracket-oblique.png`
- Create: `artifacts/screenshots/plaque-two-bracket-low-angle.png`

- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`.
- [ ] 检查正面近景、侧前方和低机位，确认牌匾上沿不穿瓦面、下沿贴横梁、整体约为两组斗拱宽度。
- [ ] 使用中文提交信息提交并推送 `master` 到 `origin/main`，校验本地与远程哈希一致。
