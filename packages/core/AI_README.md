# @meteor3d/core AI 开发者指南
本文档用于帮助 AI 编程助手快速理解此工程。

## 简介
`@meteor3d/core` 是 Meteor3D 项目的核心库，封装了 3D 场景管理、GIS 投影、数据持久化和性能统计等底层逻辑。它旨在提供一个独立、可复用的 3D 引擎基础层，供上层应用（如 `scene-editor`）调用。

## 核心模块

### 1. SceneManager (`src/SceneManager.js`)
**职责**: 负责 Three.js 场景的生命周期管理。
- **初始化**: 创建 Scene, Camera, Renderer, Lights, Controls (OrbitControls)。
- **渲染循环**: 管理 `requestAnimationFrame` 循环。
- **对象管理**: `addObject`, `removeObject`, `clearScene`。
- **GIS 支持**: 管理 `GisProjection` 实例，提供经纬度与世界坐标互转接口 (`lngLatToWorld`, `worldToLngLat`)。
- **影像底图**: `setBaseMap(url, bounds, size, visible)` 加载卫星影像作为地面纹理。
- **环境**: 加载 HDR 环境贴图 (`loadEnvironment`)。
- **辅助工具**: 网格辅助线 (`setGridHelper`)。

### 2. PersistenceManager (`src/PersistenceManager.js`)
**职责**: 负责场景数据的序列化与反序列化，以及与后端/数据库的交互协调。
- **序列化**: 将 Three.js 对象转换为 JSON 格式 (`serializeObject`)，支持增量保存（只保存修改过的属性）。
- **反序列化**: 将 JSON 数据恢复为 Three.js 对象 (`deserializeObject`)，自动处理 GLTF 模型加载和属性应用。
- **流程控制**: `loadScene` (加载整个场景), `saveScene` (保存整个场景)。
- **依赖**: 依赖 `DBManager` 进行实际的数据存储。

### 3. DBManager (`src/DBManager.js`)
**职责**: 数据存储层抽象。
- **API 交互**: 负责与后端 API 通信（如保存场景元数据）。
- **本地缓存**: (可能) 使用 IndexedDB 缓存大文件或离线数据（具体视实现而定）。

### 4. GisProjection (`src/GisProjection.js`)
**职责**: 轻量级 GIS 投影工具。
- **坐标系**: 仅支持 WGS84。
- **转换**: 提供经纬度 (Lng/Lat) 与 局部 ENU (East-North-Up) 坐标系之间的相互转换。
- **原理**: 基于参考中心点，将地球表面近似为局部平面进行计算。

### 5. StatsManager (`src/StatsManager.js`)
**职责**: 性能监控。
- **指标**: 显示 FPS (帧率) 和 MS (渲染耗时)。
- **实现**: 封装了 `stats.js` 库。

### 6. TriangleStatsManager (`src/TriangleStatsManager.js`)
**职责**: 几何体统计。
- **指标**: 统计场景中的总三角形数量和实际渲染的三角形数量。
- **实时性**: 支持实时更新统计数据。

## 工具类 (`src/utils/`)

- **ThumbnailGenerator.js**: 前端生成 3D 模型缩略图的工具。
- **message.js**: 简单的消息提示工具。

## 文件结构

```
packages/core/
├── src/
│   ├── utils/
│   │   ├── ThumbnailGenerator.js
│   │   └── message.js
│   ├── DBManager.js          # 数据库/API 管理
│   ├── GisProjection.js      # GIS 投影计算
│   ├── PersistenceManager.js # 场景持久化
│   ├── SceneManager.js       # 3D 场景核心
│   ├── StatsManager.js       # 性能统计
│   └── TriangleStatsManager.js # 三角面统计
├── package.json
└── AI_README.md              # 本文件
```

## 关键概念与工作流

### GIS 坐标系统
- **启用**: 通过 `SceneManager.setGisConfig(config)` 启用。
- **配置**: `config` 包含 `center` (参考点), `enable` (是否启用), `bounds` (范围), `baseMapUrl` (底图路径), `showBaseMap` (是否显示底图)。
- **转换**:
  - `lngLatToWorld(lng, lat, height)` -> `Vector3 (x=East, y=Up, z=North)`
  - `worldToLngLat(vector3)` -> `{ lng, lat, height }`
- **底图**: `setBaseMap(url, bounds, size, visible)` 加载/隐藏卫星影像底图。

### 场景保存/加载
1. **加载**: `PersistenceManager.loadScene(id)` -> `DBManager.getSceneData` -> `SceneManager.clearScene` -> `deserializeObject` -> `SceneManager.addObject`。
2. **保存**: `PersistenceManager.saveScene()` -> `SceneManager.objects` -> `serializeObject` -> `DBManager.saveScene`。

## 开发者提示
- 修改核心逻辑时，请确保不破坏 `scene-editor` 的现有功能。
- 所有 Three.js 相关的底层操作应优先在 `SceneManager` 中封装，而不是在 UI 组件中直接操作。
- `gisConfig` 的 `enable` 属性用于软删除 GIS 配置，`clearGisConfig` 方法用于执行此操作。
