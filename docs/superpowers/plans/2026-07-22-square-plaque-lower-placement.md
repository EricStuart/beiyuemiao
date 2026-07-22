# 正方形牌匾下移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将牌匾改为正方形并向下移动到上下屋面之间的安全净空。

**Architecture:** 继续复用上下屋面曲线函数，计算可用垂直净空；牌匾先按中央两组斗拱和净空得到统一边长，再以净空下边界定位，避免独立调节造成穿模。

**Tech Stack:** TypeScript, Three.js, Vitest, Vite.

---

### Task 1: 写正方形与上下屋面净空回归

**Files:**
- Modify: `src/model/timber-frame.test.ts`

- [ ] **Step 1: Write the failing assertions**

  将牌匾外轮廓宽高比改为 `0.95–1.05`；要求其中心 Y 低于转换梁顶面，并要求上沿低于上层屋面曲线、下沿高于下层屋面曲线至少 `0.05m`。

- [ ] **Step 2: Run RED**

  Run: `npm test -- --run src/model/timber-frame.test.ts`

  Expected: current横向牌匾比例和中心标高断言失败。

### Task 2: 实现统一边长和下移定位

**Files:**
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: Implement square fitting**

  计算中央两组斗拱宽度、上下屋面曲线在牌匾 Z 位置的净空，取 `min(pairWidth * 0.72, clearHeight - 0.1)` 作为统一 X/Y/Z 缩放边长；将牌匾下边界定位到下层屋面曲线 `+0.05m`，再更新吊杆和横梁。

- [ ] **Step 2: Run GREEN**

  Run: `npm test -- --run src/model/timber-frame.test.ts src/model/roof.test.ts`

  Expected: focused tests pass.

### Task 3: 全量验证、视觉检查和推送

**Files:**
- Create: `artifacts/screenshots/square-plaque-front.png`
- Create: `artifacts/screenshots/square-plaque-oblique.png`
- Create: `artifacts/screenshots/square-plaque-low-angle.png`

- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`.
- [ ] 检查正面、侧前方和低机位；确认牌匾为正方形且已下移。
- [ ] 中文提交并推送 `master` 到 `origin/main`，校验远程哈希。
