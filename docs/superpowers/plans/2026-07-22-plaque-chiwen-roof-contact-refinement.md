# 牌匾、鸱吻与上下层脊兽避让 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 缩小并避让牌匾、内收鸱吻、继续下移上檐，并在一层四条斜脊中段补齐装饰。

**Architecture:** 延续 `roof.ts` 中共享的 `UPPER_ROOF_DROP`/`UPPER_ROOF_BASE_Y` 标高体系；牌匾几何仍由 `createPlaque` 独立生成，所有净空关系通过 `Box3` 回归测试约束。斜脊装饰复用同一工厂函数，根据屋顶形制写入 lower/upper 层级。

**Tech Stack:** TypeScript, Three.js, Vitest, Vite。

---

### Task 1: Write failing clearance and ornament tests

**Files:**
- Modify: `src/model/timber-frame.test.ts`
- Modify: `src/model/roof.test.ts`

- [ ] Add a plaque test asserting its backing board is narrower than `2.5m`, shorter than `3.2m`, and its complete world-space top is at least `0.1m` below `UPPER_ROOF_BASE_Y`.
- [ ] Change the upper roof contact test to assert `Math.abs(upperBracketMaxY - UPPER_ROOF_BASE_Y) <= 0.12` and the eave frame overlaps the bracket top.
- [ ] Add a chiwen test asserting each complete chiwen world-space X bounds remain inside the main-ridge bounds.
- [ ] Add a lower-roof test asserting exactly four `mid-ridge-ornament` groups with `userData.level === 'lower'`, paired to the four lower hip ridges and intersecting them.
- [ ] Run `npm test -- --run src/model/timber-frame.test.ts src/model/roof.test.ts`; verify failures are caused by the current large plaque, `UPPER_ROOF_DROP = 1.4`, outboard chiwen placement, and missing lower ornaments.

### Task 2: Implement the geometry refinements

**Files:**
- Modify: `src/model/timber-frame.ts`
- Modify: `src/model/roof.ts`

- [ ] Resize the plaque board to about `2.4 × 3.0m`, resize its four frame members and decorative strips proportionally, and derive its centre from `UPPER_ROOF_BASE_Y` so the complete plaque top remains below the roof base.
- [ ] Set `UPPER_ROOF_DROP = 1.5`, keeping the upper roof ridge and timber-frame alignment derived from that constant.
- [ ] Move each chiwen centre inward by at least `1.1m` from the nominal ridge end, preserving mirrored scale and the existing curled profile.
- [ ] Reuse `createMidRidgeOrnament` for both truncated lower and chiwen upper roofs; tag each ornament with `level`, `xSide`, and `zSide`.
- [ ] Run the two focused test files and verify all tests pass.

### Task 3: Verify, inspect, commit, and push

**Files:**
- Create: `artifacts/screenshots/plaque-chiwen-contact-front.jpg`
- Create: `artifacts/screenshots/plaque-chiwen-contact-side.jpg`
- Create: `artifacts/screenshots/plaque-chiwen-contact-aerial.jpg`

- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`; all must exit with code 0.
- [ ] Inspect front, right-side, and aerial views. Confirm the plaque has roof clearance, the upper eave touches the bracket band, both chiwen sit inside the main ridge, and both roof levels show four mid-ridge ornaments.
- [ ] Save the three screenshots, verify the browser console has no warnings/errors, commit with `完善：调整牌匾鸱吻避让并补齐一层脊兽`, and push using `git push origin master:main`.
