# Rectangular Ridge and Natural Light Cycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the upper main ridge cylinder with a taller rectangular prism and animate natural sunlight and shadows on a continuous daylight loop.

**Architecture:** Keep ridge geometry changes inside `roof.ts`. Put sunlight path calculations in a pure runtime module returning numeric state, then have `viewer.ts` adapt that state to Three.js lights during sunny rendering.

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: Replace the upper main ridge geometry

**Files:**
- Modify: `src/model/roof.ts`
- Test: `src/model/roof.test.ts`

- [ ] Change the existing ridge test to require a `BoxGeometry` main ridge, reject a `CylinderGeometry` main ridge, and require a vertical size of at least 1.2.
- [ ] Run `npm test -- --run src/model/roof.test.ts` and confirm it fails on the current cylinder.
- [ ] Replace the main ridge cylinder with `new BoxGeometry(dimensions.ridgeLength + 1.2, 1.2, 0.52)` and position its centre so the bottom remains seated.
- [ ] Run the focused roof test and confirm it passes.

### Task 2: Add a pure natural-light cycle

**Files:**
- Create: `src/runtime/natural-light-cycle.ts`
- Create: `src/runtime/natural-light-cycle.test.ts`
- Modify: `src/runtime/viewer.ts`

- [ ] Add failing tests requiring a 90-second closed cycle, positive sun height, and distinct quarter-cycle direction and intensity.
- [ ] Run `npm test -- --run src/runtime/natural-light-cycle.test.ts` and confirm the module is missing.
- [ ] Implement `evaluateNaturalLightCycle(elapsedMs)` with numeric position, intensity, fill intensity, color, and phase outputs.
- [ ] Run the focused light-cycle test and confirm it passes.
- [ ] Track lighting mode and cycle start in `viewer.ts`, update sunny light state each frame, and expose phase and sun position through diagnostics.
- [ ] Run all unit tests and `npm run build`.

### Task 3: Verify the rendered result

**Files:**
- Verify: `src/model/roof.ts`
- Verify: `src/runtime/natural-light-cycle.ts`
- Verify: `src/runtime/viewer.ts`

- [ ] Run `npm test -- --run`, `npm run build`, and `git diff --check`.
- [ ] Capture desktop front and side screenshots and confirm the top ridge is rectangular and vertically taller.
- [ ] Compare runtime light diagnostics at two times and confirm the sun position changed.
- [ ] Capture a 390x844 mobile screenshot and confirm a nonblank canvas with no console warnings.
