# Faded Yellow Tiles And Diamond Recolor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将普通屋面瓦改为褪色偏黄琉璃色，删除中央菱形独立面片，并将左右坡面瓦片列数减半。

**Architecture:** 保留现有 `TilePlacement`、坡面法线和实例瓦几何。普通瓦与菱形瓦继续由同一批位置数据分区生成；仅删除叠加的菱形底面，并在位置采样阶段为左右坡面选择一半列数。

**Tech Stack:** TypeScript, Three.js, Vite, Vitest

---

### Task 1: 褪色黄琉璃瓦材质

**Files:**
- Modify: `src/model/roof.test.ts:14-24`
- Modify: `src/model/materials.ts:35-45`

- [ ] **Step 1: 写入失败的材质测试**

```ts
it('uses faded yellow-green field tiles with darker aged ribs', () => {
  const materials = createBuildingMaterials(DENING_HALL);
  expect(materials.tile.color.getHex()).toBe(0x82794a);
  expect(materials.tileRib.color.getHex()).toBe(0x5a5737);
  expect(materials.diamondTile.color.getHex()).toBe(0x2f543d);
  expect(materials.tile.roughness).toBeGreaterThan(0.85);
});
```

- [ ] **Step 2: 运行测试确认旧暗绿色导致失败**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL，收到普通瓦 `0x1d4436`、瓦棱 `0x143126`。

- [ ] **Step 3: 修改材质色值**

```ts
const tile = weathered(0x82794a, 0.93);
tile.side = DoubleSide;
const tileRib = weathered(0x5a5737, 0.92);
```

- [ ] **Step 4: 运行材质测试确认通过**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: PASS。

### Task 2: 菱形区域仅改瓦片实例颜色

**Files:**
- Modify: `src/model/roof.test.ts:38-53`
- Modify: `src/model/roof.ts:263-292, 587-603`

- [ ] **Step 1: 将屋顶测试改为禁止独立菱形面片**

```ts
const diamondPatch = upper.getObjectByName('二层中央菱形绿瓦底');
expect(diamondPatch).toBeUndefined();
expect(diamond!.userData.kind).toBe('green-diamond-tiles');
expect(diamond!.userData.instanceCount).toBeGreaterThan(20);
```

- [ ] **Step 2: 运行测试确认独立面片仍存在**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL，`diamondPatch` 当前有定义。

- [ ] **Step 3: 删除独立菱形面片生成函数和调用**

删除 `createGreenDiamondPatch(...)`，并将上层屋顶逻辑保留为：

```ts
if (greenDiamond) {
  const greenPlacements = placements.filter(isGreenDiamond);
  const diamond = createInstancedTiles(
    greenPlacements,
    materials.diamondTile,
    '二层中央菱形绿瓦',
    'green-diamond-tiles',
  );
  diamond.userData.face = 'front';
  diamond.userData.maskRatioHalf = 0.21;
  group.add(diamond);
}
```

- [ ] **Step 4: 运行屋顶测试确认无叠加面片**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: PASS。

### Task 3: 左右坡面瓦片列数减半

**Files:**
- Modify: `src/model/roof.test.ts:27-38`
- Modify: `src/model/roof.ts:175-212, 581-590`

- [ ] **Step 1: 写入失败的侧面密度测试**

```ts
it('uses half-density tile columns on both side slopes', () => {
  const roofs = createRoofs(DENING_HALL, createBuildingMaterials(DENING_HALL), 'high');
  roofs.children.forEach((roof) => {
    expect(roof.userData.tilePlacementCounts).toEqual({
      front: 546,
      back: 546,
      left: 280,
      right: 280,
    });
  });
});
```

- [ ] **Step 2: 运行测试确认当前四面密度相同**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL，当前没有 `tilePlacementCounts`，左右坡面仍使用完整列数。

- [ ] **Step 3: 按坡面选择列数并记录诊断计数**

在 `collectTilePlacements` 中使用：

```ts
const baseColumns = quality === 'high' ? 38 : quality === 'medium' ? 28 : 18;
for (const side of ['front', 'back', 'left', 'right'] as const) {
  const columns = side === 'left' || side === 'right'
    ? Math.max(1, Math.floor(baseColumns / 2))
    : baseColumns;
  // 保留现有 row/column 采样代码，并继续使用 column <= columns 包含两端边瓦。
}
```

在 `createRoof` 中记录：

```ts
group.userData.tilePlacementCounts = placements.reduce<Record<RoofSide, number>>(
  (counts, placement) => {
    counts[placement.side] += 1;
    return counts;
  },
  { front: 0, back: 0, left: 0, right: 0 },
);
```

- [ ] **Step 4: 运行屋顶测试确认侧面密度减半**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: PASS。

### Task 4: 完整验证与发布

**Files:**
- Verify: `src/model/materials.ts`
- Verify: `src/model/roof.ts`
- Verify: `src/model/roof.test.ts`

- [ ] **Step 1: 运行完整自动化验证**

Run: `npm test -- --run`

Expected: 15 个测试文件全部通过。

Run: `npm run build`

Expected: TypeScript 检查与 Vite 生产构建成功。

Run: `git diff --check`

Expected: 无空白错误。

- [ ] **Step 2: 运行桌面与手机视觉验证**

在 GitHub Pages 子路径结构下打开生产包，检查：普通瓦为褪色偏黄旧琉璃色；中央菱形由绿色瓦组成且无叠加面片；左右坡面瓦列明显稀疏；桌面与 `390x844` 手机视口均无控制台错误。

- [ ] **Step 3: 提交实现**

```powershell
git add src/model/materials.ts src/model/roof.ts src/model/roof.test.ts
git commit -m "调整：褪色黄瓦与侧面瓦片密度"
```

- [ ] **Step 4: 推送并验证线上部署**

Run: `git push origin master:main`

Expected: 推送成功，GitHub Pages 工作流完成，线上生产资源返回 JavaScript/CSS 正确 MIME 类型。
