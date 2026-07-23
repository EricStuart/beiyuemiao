# Dark Green Roof and Eave Outline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give both roof levels dark-green base slopes, dark-yellow tiles, and glazed-green outlines around every outer eave.

**Architecture:** Add one dedicated roof-surface material so the base plane can be colored independently from tile instances. Build four sampled `TubeGeometry` eave trims per roof level from the existing roof profile and reuse the glazed ridge material.

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: Separate roof-surface color

**Files:**
- Modify: `src/model/materials.ts`
- Test: `src/model/roof.test.ts`

- [ ] Add a failing material test expecting `roofSurface` to be `0x1a382c`, `tile` to remain `0x82794a`, and `glazedGreen` to remain `0x255942`.
- [ ] Run `npm test -- --run src/model/roof.test.ts` and confirm the missing `roofSurface` assertion fails.
- [ ] Add `roofSurface` to `BuildingMaterials`, instantiate it as a double-sided weathered material, and include it in `all`.
- [ ] Pass `materials.roofSurface` to `createRoofSurface`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Add four fitted eave outlines per roof

**Files:**
- Modify: `src/model/roof.ts`
- Test: `src/model/roof.test.ts`

- [ ] Add a failing test expecting both roof levels to contain one `eave-green-outline` group with four children using `materials.glazedGreen`.
- [ ] Run the focused test and confirm the outline group is missing.
- [ ] Implement sampled front, back, left, and right eave curves with `CatmullRomCurve3` and `TubeGeometry` at `t = 0`.
- [ ] Add the outline group to each roof level and attach side metadata for diagnostics.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Verify the complete result

**Files:**
- Verify: `src/model/materials.ts`
- Verify: `src/model/roof.ts`
- Verify: `src/model/roof.test.ts`

- [ ] Run `npm test -- --run` and expect all tests to pass.
- [ ] Run `npm run build` and expect Vite production output.
- [ ] Run `git diff --check` and expect no whitespace errors.
- [ ] Inspect desktop and 390x844 mobile screenshots, rotate to a side view, and confirm no console warnings or blank WebGL canvas.
