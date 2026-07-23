# 屋顶坡面去线与暗灰黑瓦实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除上下两层屋顶坡面辅助线，并将普通瓦改为暗灰黑色，同时保持真实瓦片几何、绿色边沿、菱形绿瓦和屋脊不变。

**Architecture:** 继续使用现有 `InstancedMesh` 瓦片覆盖作为唯一坡面瓦片细节，移除额外 `LineSegments` 绘制路径。普通瓦颜色只在材料工厂中调整，实例绿色校色仍通过现有目标色与基础瓦色计算，避免绿色构件偏色。

**Tech Stack:** TypeScript 7、Three.js 0.185、Vite 8、Vitest 4。

---

### Task 1: 锁定无辅助线与暗灰黑普通瓦

**Files:**
- Modify: `src/model/roof.test.ts`
- Modify: `src/model/materials.ts`
- Modify: `src/model/roof.ts`

- [ ] **Step 1: 写入失败测试**

在屋顶材质测试中将普通瓦期望色改为 `0x44443f`，并断言其 HSL 亮度低于坡面基层。在屋顶几何测试中确认上下两层都没有 `LineSegments` 子对象：

```ts
expect(materials.tile.color.getHex()).toBe(0x44443f);
expect(materials.tile.color.getHSL({ h: 0, s: 0, l: 0 }).l)
  .toBeLessThan(materials.roofSurface.color.getHSL({ h: 0, s: 0, l: 0 }).l);

it('does not draw auxiliary lines across either roof slope', () => {
  const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
  roofs.children.forEach((roof) => {
    expect(roof.children.some((child) => child instanceof LineSegments)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL，普通瓦仍为 `0x74736c`，且每层屋顶仍包含一个 `LineSegments`。

- [ ] **Step 3: 实现暗灰黑瓦并删除辅助线**

在 `materials.ts` 中修改普通瓦颜色：

```ts
const tile = weathered(0x44443f, 0.93);
```

在 `roof.ts` 中删除 `createTileLines` 函数及 `group.add(createTileLines(...))` 调用，同时移除只供该函数使用的 `LineBasicMaterial`、`LineSegments` 和 `sampleRaisedEaveProfile` 导入。保留 `BufferGeometry` 与 `Float32BufferAttribute`，因为屋面网格仍使用它们。

- [ ] **Step 4: 运行屋顶测试并确认 GREEN**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: PASS，普通瓦变暗、辅助线消失，绿色边沿和菱形瓦现有测试继续通过。

- [ ] **Step 5: 提交实现**

```powershell
git add -- src/model/roof.test.ts src/model/materials.ts src/model/roof.ts
git commit -m "调整：移除屋顶坡面线并压暗瓦色"
```

### Task 2: 完整验证与视觉验收

**Files:**
- Verify only

- [ ] **Step 1: 运行完整测试**

Run: `npm test -- --run`

Expected: 所有测试通过，退出码 `0`。

- [ ] **Step 2: 运行生产构建与差异检查**

Run: `npm run build`

Expected: TypeScript 与 Vite 构建成功，退出码 `0`。

Run: `git diff --check`

Expected: 无输出，退出码 `0`。

- [ ] **Step 3: 检查桌面与手机视图**

分别在 `1440x900` 和 `390x844` 打开本地页面，确认上下两层坡面无辅助线，暗灰黑普通瓦仍能看清半圆几何，绿色边沿、菱形瓦与屋脊保持原色，并确认控制台无错误、画布非空、页面无横向溢出。

- [ ] **Step 4: 合并与推送**

将隔离分支快进合并到 `master`，在合并结果上重新运行完整测试与构建，然后推送 `master:main` 并核对本地 `HEAD` 与 `origin/main` 提交一致。
