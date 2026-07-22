# Remove Roof Eave Band Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the independent green horizontal cylinders from the front and rear lower edges of both roof levels.

**Architecture:** Keep the existing roof surface, tile lines, ridge tubes, main ridge, and ornaments unchanged. Express the desired structure through `createRoofs`: each roof-level group has one direct `CylinderGeometry` mesh, the main ridge, instead of three direct cylinders.

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: Lock the roof-level structure with a regression test

**Files:**
- Modify: `src/model/roof.test.ts`
- Test: `src/model/roof.test.ts`

- [ ] **Step 1: Write the failing test**

Add imports for `CylinderGeometry`, `Mesh`, `DENING_HALL`, `createBuildingMaterials`, and `createRoofs`, then add:

```ts
it('keeps only the main ridge cylinder on each roof level', () => {
  const roofs = createRoofs(
    DENING_HALL,
    createBuildingMaterials(DENING_HALL),
    'high',
  );

  roofs.children.forEach((roofLevel) => {
    const directCylinders = roofLevel.children.filter(
      (child) => child instanceof Mesh && child.geometry instanceof CylinderGeometry,
    );
    expect(directCylinders).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL because each level currently contains the main ridge plus two eave-band cylinders, so the received length is `3`.

### Task 2: Remove the front and rear eave-band cylinders

**Files:**
- Modify: `src/model/roof.ts:197`
- Test: `src/model/roof.test.ts`

- [ ] **Step 1: Implement the minimal production change**

Delete this block from `createRoofLevel`:

```ts
const eaveBand = new Mesh(new CylinderGeometry(0.2, 0.25, dimensions.width + 0.8, 10), materials.glazedGreen);
eaveBand.rotation.z = Math.PI / 2;
eaveBand.position.set(0, dimensions.baseY + dimensions.eaveLift + 0.03, dimensions.depth / 2 + 0.1);
const rearBand = eaveBand.clone();
rearBand.position.z *= -1;
group.add(eaveBand, rearBand);
```

Keep `CylinderGeometry` imported because the main ridge still uses it.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: both roof tests PASS.

- [ ] **Step 3: Run complete automated verification**

Run: `npm test -- --run; npm run typecheck; npm run build; git diff --check`

Expected: all tests pass, TypeScript exits with code `0`, Vite builds successfully, and `git diff --check` reports no whitespace errors.

### Task 3: Verify the rendered roof and deliver

**Files:**
- Create: `artifacts/screenshots/roof-eave-band-removed-front.jpg`
- Create: `artifacts/screenshots/roof-eave-band-removed-aerial.jpg`

- [ ] **Step 1: Inspect the running app in a fresh browser tab**

Open `http://127.0.0.1:5173/`, wait for the Three.js scene, and capture front and aerial views. Confirm both roof levels have no independent green horizontal cylinder at the front or rear lower eave, while the main and diagonal ridges remain visible.

- [ ] **Step 2: Commit the implementation**

```powershell
git add src/model/roof.ts src/model/roof.test.ts artifacts/screenshots/roof-eave-band-removed-front.jpg artifacts/screenshots/roof-eave-band-removed-aerial.jpg docs/superpowers/plans/2026-07-22-remove-roof-eave-band.md
git commit -m "修改：移除屋檐底部横线"
```

- [ ] **Step 3: Push and verify the remote branch**

Run: `git push origin master:main`

Then verify `git rev-parse HEAD`, `git rev-parse origin/main`, and `git ls-remote --heads origin main` return the same commit hash.
