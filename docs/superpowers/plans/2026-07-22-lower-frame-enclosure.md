# Lower Frame and Enclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shorten the lower timber frame to the documented corridor-column height, keep its brackets below the lower roof, complete all four lower enclosure walls, and leave the central front bay open.

**Architecture:** Keep timber-frame construction in `timber-frame.ts`, but add semantic names and `userData` to lower columns, brackets, panels, and mullions so geometry can be tested without relying on child order. Build the lower enclosure from the existing inner hall axes: seven facade bays and four depth bays.

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: Constrain the lower timber-frame height

**Files:**
- Create: `src/model/timber-frame.test.ts`
- Modify: `src/model/timber-frame.ts`

- [ ] **Step 1: Write the failing height test**

Create the timber frame, select meshes with `userData.level === 'lower'` and `userData.kind === 'column'`, and assert their minimum and maximum bounds:

```ts
it('uses the documented 4.89 metre height for lower perimeter columns', () => {
  const { grid } = createTimberFrame(DENING_HALL, createBuildingMaterials(DENING_HALL));
  const columns = grid.children.filter(
    (child) => child instanceof Mesh && child.userData.level === 'lower' && child.userData.kind === 'column',
  );
  expect(columns.length).toBeGreaterThan(0);
  columns.forEach((column) => {
    const bounds = new Box3().setFromObject(column);
    expect(bounds.min.y).toBeCloseTo(DENING_HALL.platformHeight, 5);
    expect(bounds.max.y).toBeLessThanOrEqual(
      DENING_HALL.platformHeight + DENING_HALL.corridorColumnHeight.value + 0.25,
    );
  });
});
```

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL because lower columns do not yet expose semantic metadata.

- [ ] **Step 2: Implement the documented lower-frame level**

Set:

```ts
const outerTop = platformTop + data.corridorColumnHeight.value;
```

Extend `addColumn` and `addPerimeterColumns` with an optional level argument. For lower columns assign:

```ts
column.name = '首层柱';
column.userData.level = 'lower';
column.userData.kind = 'column';
```

Keep inner lower columns at `outerTop + 0.25` and leave upper columns unchanged.

- [ ] **Step 3: Add and verify the lower-bracket roof-clearance test**

Assign every lower bracket-set group:

```ts
set.name = '首层斗栱';
set.userData.level = 'lower';
set.userData.kind = 'bracket';
```

Test each lower bracket bounding box:

```ts
expect(new Box3().setFromObject(bracket).max.y).toBeLessThan(DENING_HALL.lowerEaveHeight);
```

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: both lower-frame tests PASS.

### Task 2: Complete the lower enclosure and central entrance

**Files:**
- Modify: `src/model/timber-frame.ts`
- Modify: `src/model/timber-frame.test.ts`

- [ ] **Step 1: Write the failing enclosure test**

Collect meshes with `userData.kind === 'enclosure-panel'` and assert:

```ts
expect(sideCounts).toEqual({ front: 6, rear: 7, left: 4, right: 4 });
expect(frontPanels.some((panel) => panel.userData.bay === 3)).toBe(false);
```

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: FAIL because the current model has only unlabelled front panels and no central entrance.

- [ ] **Step 2: Add a lower-enclosure group and panel helper**

Create a `lowerEnclosure` group with `name = '首层围护'`. Add each panel with:

```ts
panel.name = '首层围护板';
panel.userData.kind = 'enclosure-panel';
panel.userData.side = side;
panel.userData.bay = bay;
```

Create horizontal facade panels for front and rear, and depth-oriented panels for left and right. Reuse the existing door and dark-timber materials and four-part mullion spacing.

- [ ] **Step 3: Leave the front central bay open**

For the seven front facade bays, skip bay index `3`. Generate all seven rear bays and all four bays on each side.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/model/timber-frame.test.ts`

Expected: all timber-frame tests PASS.

### Task 3: Verify, render, and deliver

**Files:**
- Create: `artifacts/screenshots/lower-frame-front.jpg`
- Create: `artifacts/screenshots/lower-frame-side.jpg`
- Create: `artifacts/screenshots/lower-frame-aerial.jpg`

- [ ] **Step 1: Run complete automated verification**

Run: `npm test -- --run; npm run typecheck; npm run build; git diff --check`

Expected: all tests pass, TypeScript exits with code `0`, Vite builds successfully, and the diff check reports no whitespace errors.

- [ ] **Step 2: Verify three rendered views**

Open `http://127.0.0.1:5173/` in a fresh browser tab and capture front, side, and aerial views. Confirm the central front entrance is open, both side walls are continuous, and no lower column or bracket appears above the lower roof tiles.

- [ ] **Step 3: Commit and push**

```powershell
git add src/model/timber-frame.ts src/model/timber-frame.test.ts artifacts/screenshots/lower-frame-front.jpg artifacts/screenshots/lower-frame-side.jpg artifacts/screenshots/lower-frame-aerial.jpg docs/superpowers/plans/2026-07-22-lower-frame-enclosure.md
git commit -m "修改：调整首层木构并补齐围护墙"
git push origin master:main
```

Verify `git rev-parse HEAD`, `git rev-parse origin/main`, and `git ls-remote --heads origin main` return the same hash.
