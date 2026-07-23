# 灰白坡面、暗白灰瓦与黄琉璃小脊兽实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将屋顶坡面改为灰白色、普通筒瓦改为暗白灰色，并把末端走兽和中段小脊兽全部改为黄色琉璃，同时保持绿色边沿、屋脊与鸱吻不变。

**Architecture:** 基础颜色继续集中在 `materials.ts` 中管理，屋面顶点校色沿用现有目标色换算以保持绿色边沿。两类小脊兽只替换构件材质，不改变几何和定位；测试直接遍历实际 Three.js 场景对象，验证每个小脊兽网格材质和鸱吻材质边界。

**Tech Stack:** TypeScript 7、Three.js 0.185、Vite 8、Vitest 4。

---

### Task 1: 灰白坡面与暗白灰筒瓦

**Files:**
- Modify: `src/model/roof.test.ts`
- Modify: `src/model/materials.ts`

- [ ] **Step 1: 写入失败的材质测试**

将现有屋顶材质断言改为坡面 `0x92948e`、普通筒瓦 `0x7b7c76`，并断言筒瓦亮度略低于坡面；保留绿色边沿最终颜色 `0x2f543d` 的现有断言：

```ts
expect(materials.roofSurface.color.getHex()).toBe(0x92948e);
expect(materials.tile.color.getHex()).toBe(0x7b7c76);
const roofHsl = materials.roofSurface.color.getHSL({ h: 0, s: 0, l: 0 });
const tileHsl = materials.tile.color.getHSL({ h: 0, s: 0, l: 0 });
expect(tileHsl.l).toBeLessThan(roofHsl.l);
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL，坡面仍为 `0x4f534f`，普通筒瓦仍为 `0x44443f`。

- [ ] **Step 3: 实现确认的基础颜色**

在 `createBuildingMaterials` 中修改两种颜色：

```ts
const roofSurface = weathered(0x92948e, 0.95);
const tile = weathered(0x7b7c76, 0.93);
```

不修改 `diamondTile`、`glazedGreen`、`yellowGlaze`，也不恢复已删除的坡面辅助线。

- [ ] **Step 4: 运行屋顶测试并确认 GREEN**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: PASS，坡面和筒瓦颜色更新，绿色边沿校色仍为 `0x2f543d`。

- [ ] **Step 5: 提交颜色修改**

```powershell
git add -- src/model/materials.ts src/model/roof.test.ts
git commit -m "调整：屋顶改为灰白坡面与暗白灰瓦"
```

### Task 2: 全部小脊兽改为黄色琉璃

**Files:**
- Modify: `src/model/roof.test.ts`
- Modify: `src/model/roof.ts`

- [ ] **Step 1: 写入失败的脊兽材质测试**

在中段小脊兽和末端走兽现有测试中遍历每个分组，断言全部 `Mesh` 使用 `materials.yellowGlaze`；另外确认两个鸱吻的主体网格仍包含 `materials.glazedGreen`：

```ts
const meshes: Mesh[] = [];
ornament.traverse((child) => {
  if (child instanceof Mesh) meshes.push(child);
});
expect(meshes.length).toBeGreaterThan(0);
meshes.forEach((mesh) => expect(mesh.material).toBe(materials.yellowGlaze));
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: FAIL，两类小脊兽的大部分网格仍使用 `glazedGreen` 或 `gold`。

- [ ] **Step 3: 替换两类小脊兽材质**

在 `createMidRidgeOrnament` 中将 `base`、`body`、`head`、`crest`、`eye` 全部改用 `materials.yellowGlaze`；在 `createRidgeEndBeast` 中将 `base`、`body`、`head`、`snout`、`crest`、`tail` 全部改用 `materials.yellowGlaze`。不修改 `createChiwen`、正脊或斜脊材质。

- [ ] **Step 4: 运行屋顶测试并确认 GREEN**

Run: `npm test -- --run src/model/roof.test.ts`

Expected: PASS，小脊兽材质统一，数量、位置、朝向和贴合测试继续通过。

- [ ] **Step 5: 提交脊兽修改**

```powershell
git add -- src/model/roof.ts src/model/roof.test.ts
git commit -m "调整：小脊兽统一为黄色琉璃"
```

### Task 3: 完整验证、手机验收与远端推送

**Files:**
- Verify only

- [ ] **Step 1: 运行完整测试与生产构建**

Run: `npm test -- --run`

Expected: 所有测试通过，退出码 `0`。

Run: `npm run build`

Expected: TypeScript 与 Vite 构建成功，退出码 `0`。

Run: `git diff --check`

Expected: 无输出，退出码 `0`。

- [ ] **Step 2: 桌面视觉检查**

在 `1440x900` 打开隔离预览，确认灰白坡面、暗白灰瓦、绿色边沿、黄色小脊兽和绿色鸱吻的材质边界清晰，控制台无错误。

- [ ] **Step 3: 手机打开验证**

在 `390x844` 重新加载页面，确认文档宽度不超过视口、WebGL 画布尺寸非零、画面非空、模型和工具栏完整出现，控制台没有 error 或 warning。

- [ ] **Step 4: 合并并复验主分支**

将隔离分支快进合并到 `master`，清理工作树后在主分支重新运行 `npm test -- --run`、`npm run build` 和 `git diff --check`。

- [ ] **Step 5: 推送并核对远端**

Run: `git push origin master:main`

Expected: 推送成功。

Run: `git fetch origin main`，随后比较 `git rev-parse HEAD` 与 `git rev-parse origin/main`。

Expected: 两个提交哈希完全一致，主工作树干净。
