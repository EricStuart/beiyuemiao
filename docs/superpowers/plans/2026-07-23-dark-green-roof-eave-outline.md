# Dark Green Roof and Eave Outline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give both roof levels dark-green base slopes, dark-yellow tiles, and ridge-green outermost tile rows around every eave.

**Architecture:** Add one dedicated roof-surface material so the base plane can be colored independently from tile instances. Keep the existing tile `InstancedMesh` objects and recolor only their row-zero instances with a compensated instance tint that renders as the glazed ridge green.

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

### Task 2: Recolor the existing outermost tile row

**Files:**
- Modify: `src/model/roof.ts`
- Test: `src/model/roof.test.ts`

- [ ] Add a failing test expecting no `eave-green-outline` objects and 118 ridge-green row-zero instances inside each existing roof tile mesh.
- [ ] Run the focused test and confirm the old outline object is still present.
- [ ] Store the source row on every tile placement and apply a compensated ridge-green instance tint when `row === 0`.
- [ ] Remove the separate eave outline group and its geometry factory.
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
