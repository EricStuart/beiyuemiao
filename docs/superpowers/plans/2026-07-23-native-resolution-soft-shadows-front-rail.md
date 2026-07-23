# 原生高画质、柔化动态阴影与正面栏杆补段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 左右主台基正面栏杆各向中心补一档，同时让所有设备固定使用原生像素比、高精度模型和柔和但清晰移动的正面阳光阴影。

**Architecture:** 栏杆仍由 `foundations.ts` 的参数化构件生成，新补段复用既有连接柱，仅创建横板和中心端柱。设备能力模块只负责固定选择 `high`，新增纯函数渲染配置模块负责原生像素比和高画质阴影参数，`viewer.ts` 消费该配置；自然光循环继续由纯函数生成，便于对亮度、正面角度和闭环运动做确定性测试。

**Tech Stack:** TypeScript 7、Three.js 0.185、Vite 8、Vitest 4。

---

### Task 1: 正面台基栏杆左右补段

**Files:**
- Modify: `src/model/foundations.test.ts`
- Modify: `src/model/foundations.ts`

- [ ] **Step 1: 写入失败的几何测试**

在 `foundations.test.ts` 中查找 `front-center-extension` 分组，断言左右各一组、每组一块 `platform-balustrade-board` 和一个 `platform-balustrade-post`，并用 `Box3` 验证补段外端与既有正面栏杆内端相接、内端朝中心延伸：

```ts
it('adds one shared-post railing bay toward the center on both front sides', () => {
  const materials = createBuildingMaterials(DENING_HALL);
  const { group } = createFoundations(DENING_HALL, materials);
  const extensions = group.children.filter(
    (child) => child.userData.kind === 'front-center-extension',
  );
  expect(extensions).toHaveLength(2);
  extensions.forEach((extension) => {
    expect(extension.children.filter((child) => child.userData.kind === 'platform-balustrade-board')).toHaveLength(1);
    expect(extension.children.filter((child) => child.userData.kind === 'platform-balustrade-post')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: FAIL，`front-center-extension` 数量为 `0`。

- [ ] **Step 3: 实现共享连接柱的标准补段**

扩展 `addStraightBalustrade`，支持分别省略起点或终点立柱；根据既有正面栏杆长度和柱数计算标准柱间距。保留原栏杆，左右各调用一次补段生成，左侧省略外侧起点柱、右侧省略外侧终点柱，使每个新分组只有中心端柱：

```ts
const frontPostCount = Math.max(2, Math.ceil(mainFrontSegment / 4));
const frontBayLength = mainFrontSegment / frontPostCount;

addStraightBalustrade(
  group,
  side < 0 ? 'front-center-left' : 'front-center-right',
  'x',
  frontBayLength,
  side * (sideFlightOuterX - frontBayLength / 2),
  mainFrontZ,
  data.platformHeight,
  materials.stone,
  'front-center-extension',
  side < 0,
  side > 0,
);
```

- [ ] **Step 4: 运行栏杆测试并确认 GREEN**

Run: `npm test -- --run src/model/foundations.test.ts`

Expected: PASS，所有台基与栏杆测试通过。

- [ ] **Step 5: 提交栏杆修改**

```powershell
git add -- src/model/foundations.ts src/model/foundations.test.ts
git commit -m "修复：补齐正面台基楼梯两侧栏杆"
```

### Task 2: 所有设备固定原生高画质

**Files:**
- Modify: `src/runtime/capabilities.test.ts`
- Modify: `src/runtime/capabilities.ts`
- Create: `src/runtime/render-quality.test.ts`
- Create: `src/runtime/render-quality.ts`
- Modify: `src/runtime/viewer.ts`

- [ ] **Step 1: 写入固定高画质与原生像素比失败测试**

将 `capabilities.test.ts` 改为表格测试，断言手机、平板和桌面配置均返回 `high`。新建 `render-quality.test.ts`，断言 `createHighQualityRenderSettings(3.5)` 保留 `pixelRatio: 3.5`，并返回抗锯齿、阴影启用、`2048` 阴影贴图和 `PCFSoftShadowMap`。

```ts
expect(selectQuality({ width: 390, pixelRatio: 3, deviceMemory: 2 })).toBe('high');
expect(createHighQualityRenderSettings(3.5)).toMatchObject({
  antialias: true,
  shadows: true,
  pixelRatio: 3.5,
  shadowMapSize: 2048,
  shadowMapType: PCFSoftShadowMap,
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- --run src/runtime/capabilities.test.ts src/runtime/render-quality.test.ts`

Expected: FAIL，手机仍返回 `low`，且 `render-quality.ts` 尚不存在。

- [ ] **Step 3: 实现纯渲染配置并接入 Viewer**

`selectQuality` 忽略档案内容并固定返回 `high`。新模块返回原生像素比和高画质阴影配置：

```ts
import { PCFSoftShadowMap } from 'three';

export function createHighQualityRenderSettings(devicePixelRatio: number) {
  return {
    antialias: true,
    shadows: true,
    pixelRatio: Math.max(1, devicePixelRatio || 1),
    shadowMapSize: 2048,
    shadowMapType: PCFSoftShadowMap,
  } as const;
}
```

`viewer.ts` 使用该配置设置 `WebGLRenderer`、`shadowMap.enabled`、`shadowMap.type`、`setPixelRatio`、太阳投影开关和贴图尺寸，不再根据 `quality` 分支降级。

- [ ] **Step 4: 运行画质测试并确认 GREEN**

Run: `npm test -- --run src/runtime/capabilities.test.ts src/runtime/render-quality.test.ts`

Expected: PASS，所有设备均为 `high`，原生像素比未截断。

- [ ] **Step 5: 提交画质修改**

```powershell
git add -- src/runtime/capabilities.ts src/runtime/capabilities.test.ts src/runtime/render-quality.ts src/runtime/render-quality.test.ts src/runtime/viewer.ts
git commit -m "调整：所有设备固定原生高画质"
```

### Task 3: 柔化并增强移动阴影

**Files:**
- Modify: `src/runtime/natural-light-cycle.test.ts`
- Modify: `src/runtime/natural-light-cycle.ts`
- Modify: `src/runtime/viewer.ts`

- [ ] **Step 1: 写入更柔和光照范围失败测试**

保留正面 `25°` 范围、周期闭合和左右往返断言，将直射光范围收窄到 `3.05-3.30`，半球补光范围收窄到 `1.65-1.85`；额外断言四分之一周期与四分之三周期的太阳横坐标符号相反，确保投影确实移动。

```ts
expect(sample.intensity).toBeGreaterThanOrEqual(3.05);
expect(sample.intensity).toBeLessThanOrEqual(3.3);
expect(sample.fillIntensity).toBeGreaterThanOrEqual(1.65);
expect(sample.fillIntensity).toBeLessThanOrEqual(1.85);
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- --run src/runtime/natural-light-cycle.test.ts`

Expected: FAIL，现有直射光 `3.65-3.90`、补光 `2.35-2.50` 超出新范围。

- [ ] **Step 3: 实现柔和亮度与清晰移动投影**

保持原有 `90s`、正面 `25°` 循环路径和暖色轻微变化，将亮度调整为：

```ts
intensity: 3.05 + frontness * 0.25,
fillIntensity: 1.65 + frontness * 0.2,
```

同时将 `viewer.ts` 初始半球光和太阳光强度同步到新循环起始值，避免首帧跳变；设置适度 `shadow.normalBias`，减少高分辨率阴影在瓦片上的自阴影条纹。

- [ ] **Step 4: 运行光照测试并确认 GREEN**

Run: `npm test -- --run src/runtime/natural-light-cycle.test.ts`

Expected: PASS，循环闭合、太阳左右移动且始终位于正面亮区。

- [ ] **Step 5: 提交光照修改**

```powershell
git add -- src/runtime/natural-light-cycle.ts src/runtime/natural-light-cycle.test.ts src/runtime/viewer.ts
git commit -m "调整：柔化正面动态光影"
```

### Task 4: 完整验证与浏览器验收

**Files:**
- Verify only

- [ ] **Step 1: 运行完整测试**

Run: `npm test -- --run`

Expected: 所有测试文件、所有测试均 PASS，退出码 `0`。

- [ ] **Step 2: 运行生产构建与差异检查**

Run: `npm run build`

Expected: TypeScript 和 Vite 构建成功，退出码 `0`。

Run: `git diff --check`

Expected: 无输出，退出码 `0`。

- [ ] **Step 3: 桌面视口视觉检查**

在 `1440x900` 打开本地 Vite 页面，确认画布实际像素尺寸与设备像素比一致、左右补段各一板一柱、阴影边缘柔和且随循环移动、控制台无错误。

- [ ] **Step 4: 手机视口视觉检查**

在 `390x844`、高设备像素比环境打开页面，确认诊断画质为 `HIGH`、没有横向溢出、画布非空且模型可旋转。

- [ ] **Step 5: 核对 Git 状态**

Run: `git status --short --branch`

Expected: 工作树干净，仅显示当前分支相对远端的提交状态。
