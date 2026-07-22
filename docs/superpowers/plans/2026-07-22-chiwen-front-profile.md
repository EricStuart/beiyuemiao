# 鸱吻正面造型调整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按德宁殿鸱吻正面照片重做高背、卷尾、龙首与张口轮廓，并保持左右镜像和贴脊约束。

**Architecture:** 保留 `createChiwen` 作为唯一入口，用 `ExtrudeGeometry` 生成主体，用 `TubeGeometry` 生成卷尾和须饰，用基础网格生成背鳍、头部、颌、角和眼部。组件使用 `userData.kind` 标记，方便结构测试和后续调整。

**Tech Stack:** TypeScript, Three.js, Vitest, Vite.

---

### Task 1: 锁定参考造型结构

**Files:**
- Modify: `src/model/roof.test.ts`

- [ ] **Step 1: Write failing tests**

断言每件 `chiwen` 包含 `chiwen-body`、`chiwen-tail`、至少6件 `chiwen-back-scale`、`chiwen-head`、`chiwen-upper-jaw`、`chiwen-lower-jaw`、2件 `chiwen-horn`、`chiwen-eye`和 `chiwen-pupil`。断言上下颌 Y 间距大于 0.18，卷尾高于头部，整体高宽比大于 1.35，左右包围盒尺寸相等。

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL，现有鸱吻缺少卷尾、成排背鳍、独立龙首标记和分离上下颌。

### Task 2: 重做鸱吻几何

**Files:**
- Modify: `src/model/roof.ts`

- [ ] **Step 1: Replace the body profile**

重画挤出主体，使外背高耸、内侧胸部收紧，几何厚度继续沿 Z 轴展开。

- [ ] **Step 2: Add the curled tail and dorsal scales**

用 S 形 `CatmullRomCurve3` 和 `TubeGeometry` 生成卷尾，末端加圆形卷首；添加6至8件递减的背鳍网格。

- [ ] **Step 3: Build the dragon head**

在主体下部生成绿色头额、金色吻部、分离上下颌、两角、浅色眼球、深色瞳孔和两条简化须饰。

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: PASS.

### Task 3: 回归与视觉验收

**Files:**
- Create: `artifacts/screenshots/chiwen-front-profile.jpg`
- Create: `artifacts/screenshots/chiwen-oblique-profile.jpg`
- Create: `artifacts/screenshots/chiwen-side-profile.jpg`

- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`.
- [ ] 浏览器检查正面的卷尾、高背、张口和龙首可辨识性，并确认斜视与侧视不呈现平面化。
- [ ] 使用中文提交信息提交，并执行 `git push origin master:main`。
