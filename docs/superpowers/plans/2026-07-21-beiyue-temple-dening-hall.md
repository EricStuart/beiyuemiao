# Beiyue Temple Dening Hall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive Three.js reconstruction viewer for the present-day Dening Hall at Quyang Beiyue Temple, with a parameterized nine-by-six bay structure, double-eaved hip roof, architectural inspection controls, and documented source confidence.

**Architecture:** Keep evidence-backed building parameters in a typed data module, generate each architectural system through focused geometry factories, and assemble those systems in a thin Three.js runtime. Keep camera state and UI state outside scene objects; the DOM UI calls a small viewer API, while Vitest covers parameter validation, grid generation, roof profiles, and view-state behavior.

**Tech Stack:** Vite 8.1.5, TypeScript 7.0.2, Three.js 0.185.1, Vitest 4.1.10, vanilla HTML/CSS, Playwright-compatible browser verification.

---

## File Map

- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`: project and build entrypoints.
- `public/reference/dening-hall-front.jpg`: user-provided front reference image.
- `src/data/building.ts`: dimensions, bay weights, visual palette, source-confidence metadata.
- `src/model/types.ts`: shared model layer and generated-building interfaces.
- `src/model/grid.ts`: bay coordinate and column-position calculations.
- `src/model/roof-profile.ts`: raised-eave and hip-roof profile calculations.
- `src/model/materials.ts`: reusable present-condition materials.
- `src/model/foundations.ts`: platform, stairs, balustrades, and courtyard ground.
- `src/model/timber-frame.ts`: columns, beams, doors, walls, and bracket-band geometry.
- `src/model/roof.ts`: lower and upper hip roofs, tile ribs, ridges, and ornaments.
- `src/model/create-dening-hall.ts`: building assembly and visibility-layer registry.
- `src/runtime/viewer.ts`: renderer, scene, lighting, cameras, controls, resize, and disposal.
- `src/runtime/view-presets.ts`: six camera targets and orbit/move transitions.
- `src/runtime/capabilities.ts`: quality selection and WebGL fallback logic.
- `src/ui/app-ui.ts`: toolbar, source drawer, dimensions, layer and lighting controls.
- `src/styles.css`: full-bleed responsive UI and error-state styles.
- `src/main.ts`: boot sequence and fatal-error boundary.
- `src/**/*.test.ts`: focused unit tests adjacent to pure modules.

## Task 1: Scaffold and Test Baseline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `src/smoke.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { APP_TITLE } from './main';

describe('application shell', () => {
  it('uses the Dening Hall title', () => {
    expect(APP_TITLE).toBe('德宁之殿');
  });
});
```

- [ ] **Step 2: Install dependencies and verify the test fails**

Run: `npm install && npm test -- --run`

Expected: FAIL because `src/main.ts` does not yet export `APP_TITLE`.

- [ ] **Step 3: Implement the minimal Vite shell**

Create scripts for `dev`, `build`, `test`, and `typecheck`; configure strict TypeScript with DOM libraries; add `#app`, `#scene`, and `#ui` roots; export `APP_TITLE = '德宁之殿'` from `src/main.ts` and render a temporary loading state.

- [ ] **Step 4: Verify the baseline**

Run: `npm test -- --run && npm run typecheck && npm run build`

Expected: one passing test, clean typecheck, and a generated `dist/` directory.

## Task 2: Evidence-Tagged Building Parameters and Grid

**Files:**
- Create: `src/data/building.ts`
- Create: `src/model/grid.ts`
- Create: `src/model/grid.test.ts`

- [ ] **Step 1: Write failing grid tests**

```ts
import { describe, expect, it } from 'vitest';
import { DENING_HALL } from '../data/building';
import { createAxisCoordinates, validateBuildingData } from './grid';

describe('Dening Hall grid', () => {
  it('creates ten column lines across nine facade bays', () => {
    expect(createAxisCoordinates(DENING_HALL.bayWidths)).toHaveLength(10);
  });

  it('creates seven column lines across six depth bays', () => {
    expect(createAxisCoordinates(DENING_HALL.depthWidths)).toHaveLength(7);
  });

  it('accepts the documented 25.6 metre height', () => {
    expect(() => validateBuildingData(DENING_HALL)).not.toThrow();
    expect(DENING_HALL.totalHeight.value).toBe(25.6);
  });
});
```

- [ ] **Step 2: Run tests and confirm missing-module failures**

Run: `npm test -- --run src/model/grid.test.ts`

Expected: FAIL because the data and grid modules do not exist.

- [ ] **Step 3: Implement typed parameters and validation**

Define `EvidenceLevel = 'documented' | 'secondary' | 'inferred'`, `SourcedNumber`, and `BuildingData`. Set facade bay weights to `[0.78, 0.9, 1, 1.08, 1.16, 1.08, 1, 0.9, 0.78]`, depth weights to `[0.82, 1, 1.08, 1.08, 1, 0.82]`, total height to 25.6, and expose inferred plan dimensions through one calibration object. Validate positive dimensions, exact bay counts, and matching evidence labels.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/model/grid.test.ts`

Expected: three passing tests.

## Task 3: Roof Profile and Continuous Hip-Roof Geometry

**Files:**
- Create: `src/model/roof-profile.ts`
- Create: `src/model/roof-profile.test.ts`
- Create: `src/model/roof.ts`
- Create: `src/model/types.ts`

- [ ] **Step 1: Write failing roof-profile tests**

```ts
import { describe, expect, it } from 'vitest';
import { sampleRaisedEaveProfile } from './roof-profile';

describe('raised eave roof profile', () => {
  it('rises monotonically from eave to ridge', () => {
    const points = sampleRaisedEaveProfile({ run: 10, rise: 5.2, eaveLift: 0.55 }, 12);
    expect(points[0].y).toBeCloseTo(0.55);
    expect(points.at(-1)?.y).toBeCloseTo(5.2);
    expect(points.every((point, index) => index === 0 || point.y >= points[index - 1].y)).toBe(true);
  });

  it('keeps the eave shallower than the upper slope', () => {
    const points = sampleRaisedEaveProfile({ run: 10, rise: 5.2, eaveLift: 0.55 }, 12);
    expect(points[1].y - points[0].y).toBeLessThan(points[11].y - points[10].y);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/model/roof-profile.test.ts`

Expected: FAIL because `sampleRaisedEaveProfile` is missing.

- [ ] **Step 3: Implement the pure profile and roof mesh generator**

Use a cubic profile with a small eave lift and increasing slope toward the ridge. Build each roof as one indexed buffer geometry with front, back, left, and right surfaces sharing corner samples; add separate instanced tile ribs, green-glazed edge bands, main ridge, hip ridges, ridge-end ornaments, and corner beasts. Expose lower and upper roof groups as the `roof` visibility layer.

- [ ] **Step 4: Run roof tests and typecheck**

Run: `npm test -- --run src/model/roof-profile.test.ts && npm run typecheck`

Expected: two passing tests and no TypeScript errors.

## Task 4: Platform, Timber Frame, Bracket Bands, and Assembly

**Files:**
- Create: `src/model/materials.ts`
- Create: `src/model/foundations.ts`
- Create: `src/model/timber-frame.ts`
- Create: `src/model/create-dening-hall.ts`
- Create: `src/model/create-dening-hall.test.ts`

- [ ] **Step 1: Write the failing assembly test**

```ts
import { describe, expect, it } from 'vitest';
import { createDeningHall } from './create-dening-hall';

describe('Dening Hall assembly', () => {
  it('registers every inspectable architectural layer', () => {
    const building = createDeningHall('medium');
    expect([...building.layers.keys()].sort()).toEqual(['brackets', 'full', 'grid', 'roof']);
    expect(building.metrics.facadeBays).toBe(9);
    expect(building.metrics.depthBays).toBe(6);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/model/create-dening-hall.test.ts`

Expected: FAIL because the assembly module is missing.

- [ ] **Step 3: Implement present-condition materials and building systems**

Create rough grey brick and stone materials, weathered red-brown timber, muted blue-green painted beams, grey roof tiles, and green glazed trim. Generate the platform, central stair, railings, all perimeter columns, inner-hall columns, beams, doors, infill walls, simplified but layered bracket sets, both roofs, and a minimal walkable interior floor. Return a root group, named layer groups, collision boxes, and metrics.

- [ ] **Step 4: Run model tests**

Run: `npm test -- --run src/model/create-dening-hall.test.ts && npm run typecheck`

Expected: the assembly test passes and Three.js types are clean.

## Task 5: Viewer Runtime, Camera Presets, and Quality Degradation

**Files:**
- Create: `src/runtime/capabilities.ts`
- Create: `src/runtime/capabilities.test.ts`
- Create: `src/runtime/view-presets.ts`
- Create: `src/runtime/viewer.ts`

- [ ] **Step 1: Write failing capability tests**

```ts
import { describe, expect, it } from 'vitest';
import { selectQuality } from './capabilities';

describe('quality selection', () => {
  it('uses low detail for narrow low-memory devices', () => {
    expect(selectQuality({ width: 390, pixelRatio: 3, deviceMemory: 2 })).toBe('low');
  });

  it('uses high detail for desktop devices', () => {
    expect(selectQuality({ width: 1440, pixelRatio: 1.5, deviceMemory: 8 })).toBe('high');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/runtime/capabilities.test.ts`

Expected: FAIL because `selectQuality` is missing.

- [ ] **Step 3: Implement renderer and view-state API**

Create a `DeningHallViewer` class with `setViewPreset`, `setLayer`, `setLighting`, `resetView`, `resize`, `start`, and `dispose`. Use `OrbitControls`, cap pixel ratio, configure two directional-light modes and contact-readable shadows, prevent camera distance from crossing the building, add click-to-walk ground targets, and listen for WebGL context loss/restoration. Define front, rear, left, right, aerial, and reset presets from the computed building bounds.

- [ ] **Step 4: Run runtime tests and typecheck**

Run: `npm test -- --run src/runtime/capabilities.test.ts && npm run typecheck`

Expected: two passing tests and no TypeScript errors.

## Task 6: Responsive UI, Sources, Dimensions, and Error Boundary

**Files:**
- Create: `src/ui/app-ui.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Copy: `C:/Users/123/Desktop/北岳庙/100v080000003barx0EA5.jpg` to `public/reference/dening-hall-front.jpg`

- [ ] **Step 1: Add a UI-state test**

Add a test that mounts the UI in JSDOM, clicks the layer button, and verifies that the provided `setLayer('grid')` callback is called exactly once.

- [ ] **Step 2: Run the UI test and verify failure**

Run: `npm test -- --run src/ui/app-ui.test.ts`

Expected: FAIL because the UI factory does not exist.

- [ ] **Step 3: Implement the full-bleed interface**

Build the title lockup, compact dimension chip, icon toolbar using familiar symbols with tooltips, preset menu, layer segmented control, lighting toggle, expandable source drawer, mobile bottom sheet, loading indicator, and fatal-error panel. Mark inferred dimensions explicitly and include the approved primary-source links. Wire UI callbacks to the viewer API and add reduced-motion handling.

- [ ] **Step 4: Complete the boot flow and reference asset**

Copy the user reference image, instantiate viewer then UI, remove loading only after the first nonblank frame, and catch boot failures into the fatal-error panel.

- [ ] **Step 5: Run tests and production checks**

Run: `npm test -- --run && npm run typecheck && npm run build`

Expected: all tests pass, typecheck succeeds, and Vite produces `dist/`.

## Task 7: Browser Visual Verification and Corrections

**Files:**
- Modify as required: `src/model/*.ts`, `src/runtime/*.ts`, `src/ui/*.ts`, `src/styles.css`
- Create: `artifacts/screenshots/desktop-front.png`
- Create: `artifacts/screenshots/desktop-aerial.png`
- Create: `artifacts/screenshots/mobile-front.png`

- [ ] **Step 1: Start the development server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite prints a local URL and remains running.

- [ ] **Step 2: Verify desktop rendering and interactions**

At 1440 × 900, capture the default front view, rotate to a side, activate aerial view, toggle grid and roof layers, open the source drawer, and inspect console errors. Confirm that the building occupies the primary viewport, the double-eaved roof is readable, and controls do not cover the facade.

- [ ] **Step 3: Verify mobile rendering**

At 390 × 844, capture the front view and source bottom sheet. Confirm safe-area spacing, no text overflow, usable touch controls, and a nonblank canvas.

- [ ] **Step 4: Run canvas-pixel checks**

Sample the rendered canvas at multiple points and confirm that it contains meaningful color variance rather than a clear-color-only frame. Record renderer information, draw calls, triangles, and texture count from the diagnostics hook.

- [ ] **Step 5: Fix findings and rerun checks**

Apply scoped corrections for any geometry clipping, blank rendering, unreadable roof silhouette, control overlap, or console error. Repeat the affected screenshot and interaction check after each correction.

- [ ] **Step 6: Final verification**

Run: `npm test -- --run && npm run typecheck && npm run build && git diff --check`

Expected: all automated checks pass, browser screenshots are nonblank and correctly framed, and the diff has no whitespace errors.
