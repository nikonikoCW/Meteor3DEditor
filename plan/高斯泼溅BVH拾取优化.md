# 高斯泼溅 BVH 拾取优化

## 1. 背景与现象

Meteor3D 场景中存在 Gaussian Splat 数据时，连续点击场景会出现严重掉帧，极端情况下 FPS 降至 0～1。相同点击操作在只有 GLB、HDR 或 3D Tiles 的场景中不会复现。

排查期间观察到一次编辑器点击会经过两条拾取链路：

1. `editor-selection`：编辑器选中对象。
2. `core-scene-click`：核心层生成 `scene-click` 事件及世界坐标。

高斯场景下两次查询平均分别约为 25～26 ms。连续点击会在主线程上不断执行高成本查询，事件堆积后挤占渲染时间，因此帧率迅速下降。

关闭 Gaussian Splat 拾取后，连续点击不再掉帧，说明性能瓶颈来自 Spark 原生拾取，而不是渲染、描边、内存或普通 Three.js Mesh 的 BVH。

## 2. 根因

Spark 的 `SplatMesh` 不是由普通三角形 `BufferGeometry` 表示的模型。其原生射线拾取需要检查大量高斯点，查询成本随 splat 数量增长。

`three-mesh-bvh` 加速的是三角形网格，不能直接给 `SplatMesh` 设置 `geometry.boundsTree`。因此不能简单地“给高斯点套一层 BVH”，必须先为高斯数据建立一个可供 Three.js 射线检测的代理 Mesh。

原始链路：

```text
鼠标点击
  ├─ 编辑器选择 raycast ──> Spark 遍历高斯点
  └─ scene-click raycast ─> Spark 再次遍历高斯点
```

优化链路：

```text
高斯加载完成
  ├─ Spark SplatMesh：只负责显示，关闭原生 raycast
  └─ 体素代理 Mesh：只负责拾取，构建 MeshBVH

鼠标点击 ──> BVH 代理 Mesh ──> selectionRoot ──> 选中 Gaussian Splat wrapper
```

## 3. 方案设计

### 3.1 生成体素代理

高斯初始化完成后，通过 `forEachSplat` 遍历一次数据：

1. 获取 SplatMesh 局部包围盒。
2. 根据最长边和 `resolution` 划分体素网格。
3. 忽略低于透明度阈值的 splat。
4. 使用 splat 最大缩放值估算影响半径。
5. 标记与 splat 相交的体素。
6. 将 X 轴相邻体素合并成长方体，减少代理 Mesh 的几何数量。
7. 合并所有长方体几何，交给现有 `RaycastManager` 建立 BVH。

默认参数与验证 HTML 保持一致：

| 参数 | 默认值 | 作用 |
| --- | ---: | --- |
| `resolution` | 36 | 最长边的体素划分数量；越高越精确，但构建和内存成本越高 |
| `minOpacity` | 0.12 | 过滤几乎不可见的 splat，减少空泛碰撞范围 |
| `radiusMultiplier` | 0.6 | 将 splat 缩放换算为体素覆盖半径 |

如果没有 splat 通过透明度过滤，则退化为整体包围盒代理，保证对象仍然能够被选中。

### 3.2 禁用 Spark 原生拾取

创建 `SplatMesh` 时设置：

```js
new SplatMesh({
    url,
    raycastable: false
});
```

这样递归射线检测经过 SplatMesh 时不会执行逐高斯点查询，只会继续检测其子级 BVH 代理。

### 3.3 代理的显示与选择行为

代理 Mesh 必须满足以下条件：

- `collider.visible` 保持为 `true`，保证 Three.js 射线检测和编辑器“忽略隐藏对象”逻辑不会排除它。
- `collider.material.visible = false`，保证代理不进入实际画面渲染。
- `collider.userData.selectionRoot` 指向 Gaussian Splat wrapper，命中代理后仍选择业务对象，而不是内部碰撞体。
- 代理作为 SplatMesh 子节点，自动继承高斯模型的平移、旋转和缩放。

### 3.4 最近交点优化

编辑器选择和核心 `scene-click` 都只使用第一个交点，因此为内部射线查询增加 `firstHitOnly` 选项。启用后，`three-mesh-bvh` 在每个 BVH Mesh 内只返回最近命中，避免生成不需要的全部三角形交点。

公共 `raycastObjects` 的默认行为保持不变；只有明确传入 `firstHitOnly: true` 的点击链路启用该优化。

## 4. 文件改动说明

### 核心功能

#### `packages/core/src/GaussianSplatCollider.js`

新增体素代理构建器，负责：

- 将 splat 栅格化为占用体素。
- 合并连续体素盒。
- 创建不可见、可射线检测的普通 Mesh。
- 写入体素数量、合并盒数量和体素尺寸等运行时信息。

这是本次方案的主要实现。

#### `packages/core/src/PersistenceManager.js`

- 创建 SplatMesh 时关闭 Spark 原生拾取。
- 高斯初始化完成后生成体素代理并挂载到 SplatMesh。
- 将代理的 `selectionRoot` 指向 Gaussian Splat wrapper。
- 全局节点图序列化时跳过内部代理，避免运行时碰撞对象写入场景数据。

### 配套处理

#### `packages/core/src/RaycastManager.js`

为 `raycast` 和 `raycastWithRay` 增加可选的 `firstHitOnly` 支持，并在查询完成后恢复 Raycaster 原状态，避免影响其他调用方。

#### `packages/core/src/SceneManager.js`

核心 `scene-click` 查询启用 `firstHitOnly`。

#### `packages/scene-editor/src/core/InputManager.js`

编辑器选中查询启用 `firstHitOnly`。

#### `packages/core/src/TriangleStatsManager.js`

统计场景总三角形和 Mesh 数量时排除内部碰撞代理，避免代理几何污染业务模型统计。

#### `packages/scene-editor/src/components/TreeNode.vue`

场景树过滤 `isInternalHelper` 节点，避免用户看到、选择、拖拽或删除运行时碰撞代理。

#### `packages/core/tests/gaussian-splat-collider.test.js`

覆盖以下行为：

- 代理不参与渲染，但仍可被 BVH 射线命中。
- 无 splat 通过透明度过滤时，能够生成包围盒后备代理。

## 5. 精度与性能取舍

该方案提供的是体素级近似拾取，不是逐 splat 精确拾取。

预期特性：

- 点击高斯物体可见区域时能够稳定选中整个 Gaussian Splat 业务对象。
- 命中点来自代理表面，可能与屏幕上单个高斯点的真实深度存在少量误差。
- 薄片、孔洞和边缘位置的误差最明显。
- `resolution` 越大，轮廓越精确，但加载阶段的代理生成、BVH 构建时间和内存占用会增加。

对于编辑器的“点击对象并选中整体模型”业务，体素代理比逐 splat 精确查询更符合性能需求。如果未来业务需要精确选中单个高斯点，应另行设计 GPU picking 或分层拾取，不能依赖当前代理方案。

## 6. 生命周期与数据边界

- 代理在高斯加载完成时创建，每个 Gaussian Splat 实例对应一个代理。
- 代理挂在 SplatMesh 下，跟随模型变换，无需每次移动或缩放后重建。
- SceneManager 添加对象时会为代理自动建立 BVH。
- 删除高斯对象时，现有资源释放流程会同时释放代理 geometry、material 和 boundsTree。
- 代理是纯运行时对象，不显示在场景树中，也不写入场景节点图。

## 7. 已完成的自动验证

执行结果：

```text
pnpm --filter @meteor3d/core test
13 tests passed

pnpm --filter @meteor3d/core build
build passed

pnpm --filter @meteor3d/scene-editor build
build passed
```

生产构建仍有原有的大 chunk 警告，但没有新增编译错误。

## 8. 手动验收清单

1. 加载包含大量 splat 的 Gaussian Splat 数据。
2. 确认首次加载完成后模型正常显示，场景中没有体素盒或线框。
3. 在模型可见区域单击，确认选中场景树中的 Gaussian Splat wrapper。
4. 在模型边缘、孔洞和薄片位置测试拾取精度。
5. 连续快速点击 100～200 次，观察 FPS 是否保持稳定。
6. 分别测试有 GLB、3D Tiles 和 Gaussian Splat 的混合场景，确认最近对象选择正确。
7. 平移、旋转、缩放 Gaussian Splat 后重新点击，确认代理与显示模型同步。
8. 保存并重新打开场景，确认没有 `GaussianSplatBVHCollider` 出现在场景树中。
9. 删除 Gaussian Splat，确认场景、统计及内存表现正常。

## 9. 后续可选优化

- 根据模型尺寸或 splat 数量动态选择体素分辨率。
- 将已生成的代理缓存到资产侧，避免每次加载都重新遍历 splat。
- 对超大数据将代理构建移至 Worker，降低首次加载时的主线程停顿。
- 合并编辑器选择与核心 `scene-click` 的重复射线查询，让一次点击共享同一份命中结果。
- 增加开发模式下的代理可视化开关，便于调试精度，但不进入普通用户界面。

## 10. 结论

本次优化不是把 BVH 直接应用到 Gaussian Splat，而是把“显示”和“拾取”拆开：Spark 继续负责高斯渲染，体素代理 Mesh 与 BVH 专门负责交互。这样将连续点击的成本从逐高斯点扫描转换为 BVH 树查询，是解决高斯场景点击掉帧的核心。
