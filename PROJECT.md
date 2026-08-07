# Meteor3D 工程说明

> 本文档面向项目维护者和 AI 编程助手，用于快速建立对 Meteor3D 当前代码结构、运行链路和开发约束的准确理解。
>
> 文档描述以当前源码为准。`plan/` 目录中的文件属于设计方案或实施记录，不代表所有内容均已落地。

## 1. 项目定位

Meteor3D 是一个基于 Three.js、Vue 3 和 Node.js 的低代码 3D 场景可视化平台，采用 pnpm Monorepo 管理前端包。

平台围绕以下工作流构建：

1. 在资产管理器中上传、转换和优化 3D 资产。
2. 在场景编辑器中组合资产，配置 GIS、材质、相机和环境效果。
3. 将场景对象及元数据保存到后端 MongoDB。
4. 通过 `@meteor3d/core` 加载场景，供应用编辑器、AI 场景助手或第三方页面使用。
5. 在应用编辑器中叠加图表、文字、标签、天气、相机和特效组件，形成可交互的数据可视化应用。

项目当前以 WebGL 版本为主线，同时保留一个功能较少的 WebGPU 实验分支。

## 2. 总体架构

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Meteor3D 平台                                  │
├──────────────────┬──────────────────┬──────────────────┬────────────────┤
│  asset-manager   │  scene-editor    │   app-editor     │    ai-scene    │
│  资产上传与管理   │  三维场景搭建     │  低代码应用搭建    │  AI 场景交互    │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴───────┬────────┘
         │                  │                  │                 │
         │                  └─────────┬────────┘                 │
         │                            ▼                          │
         │                  ┌──────────────────┐                 │
         │                  │ @meteor3d/core   │◀────────────────┘
         │                  │ WebGL 核心 SDK    │
         │                  └─────────┬────────┘
         │                            │
         ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ meteor3d-server                                                        │
│ Express API / MongoDB / Redis + Bull / 文件处理 / AI Tool Calling       │
└────────┬───────────────────────────────┬────────────────────────────────┘
         │                               │
         ▼                               ▼
┌──────────────────┐          ┌──────────────────────────────────────────┐
│ MongoDB          │          │ 本地上传目录 / 处理产物 / 又拍云          │
│ Scene / Object   │          │ GLB / LOD / 纹理 / 缩略图 / GIS 底图     │
│ Asset / App      │          └──────────────────────────────────────────┘
└──────────────────┘
```

### 核心数据流

```text
资产上传
  → 格式转换与模型优化
  → 资产元数据入库
  → 场景编辑器拖入资产
  → Core 建立 Three.js 对象和 BID 映射
  → PersistenceManager 序列化
  → 场景对象与场景元数据入库
  → loadScene() 恢复场景
  → App Editor / AI Scene / 第三方页面消费
```

## 3. 子工程清单

| 目录 | 包名 | 定位 | 状态 |
|---|---|---|---|
| `packages/core` | `@meteor3d/core` | WebGL 渲染、场景持久化和对外 SDK | 主线核心 |
| `packages/scene-editor` | `@meteor3d/scene-editor` | 可视化 3D 场景编辑器 | 主线应用 |
| `packages/asset-manager` | `@meteor3d/asset-manager` | 资产上传、处理、注册和管理 | 主线应用 |
| `packages/app-editor` | `@meteor3d/app-editor` | 低代码大屏和交互应用编辑器 | 主线应用 |
| `packages/ai-scene` | `@meteor3d/ai-scene` | 自然语言查询和控制 3D 场景 | 功能开发中 |
| `packages/dashboard` | `@meteor3d/dashboard` | 平台入口和 SDK API 页面 | 辅助应用 |
| `packages/docs` | `@meteor3d/docs` | VitePress SDK 文档站 | 文档应用 |
| `packages/core-webgpu` | `@meteor3d/core-webgpu` | WebGPU SceneManager 原型 | 实验性 |
| `packages/scene-editor-webgpu` | `@meteor3d/scene-editor-webgpu` | WebGPU 编辑器原型 | 实验性 |
| `meteor3d-server` | `meteor3d-server` | Express 后端、数据库、AI 和资产流水线 | 独立服务 |

`meteor3d-server` 当前不在 `pnpm-workspace.yaml` 的 `packages/*` 范围内，需要独立安装依赖。

## 4. 技术栈

### 前端与 Core

| 技术 | 用途 |
|---|---|
| Vue 3 | 编辑器和平台页面，使用 Composition API |
| Vite | 开发服务器和前端构建 |
| Pinia | 编辑器状态管理 |
| Vue Router | 页面与场景路由 |
| Three.js | WebGL/WebGPU 三维渲染基础 |
| 3d-tiles-renderer | 3D Tiles 加载与调度 |
| three-mesh-bvh | BVH 构建和加速射线检测 |
| Spark | Gaussian Splat 加载和渲染 |
| Tween.js | 相机动画和导航 |
| ECharts | 应用编辑器图表组件 |
| CodeMirror | JSON、JavaScript、HTML/CSS 等代码编辑 |
| vue3-moveable | 应用画布组件拖动、缩放和旋转 |
| VitePress | SDK 文档站 |

当前主线包要求较新的 Node.js。以 `scene-editor/package.json` 为准：Node.js `^20.19.0` 或 `>=22.12.0`。

### 后端与资产处理

| 技术 | 用途 |
|---|---|
| Node.js + Express 5 | HTTP API 和静态文件服务 |
| MongoDB + Mongoose | 场景、对象、资产和应用数据 |
| Multer | 上传文件和缩略图 |
| Redis + Bull | 资产异步处理队列、重试和状态管理 |
| glTF Transform | GLB 清洗、压缩、简化和结构处理 |
| Draco / Meshoptimizer | 几何压缩和网格优化 |
| Sharp | 缩略图、纹理和 GIS 底图处理 |
| FBX2glTF | FBX 到 GLB 的格式转换 |
| Python CAD 脚本 | STEP/STP/IGS/IGES 转换 |
| OpenAI 兼容 SDK | AI 对话、SSE 输出和 Function Calling |
| 又拍云 SDK | 原文件、压缩文件和缩略图上云 |

## 5. 目录结构

```text
Meteor3D/
├── package.json                     # Monorepo 根脚本
├── pnpm-workspace.yaml              # packages/* 工作区定义
├── pnpm-lock.yaml
├── README.md
├── PROJECT.md                       # 本文档
├── plan/                            # 设计方案、重构计划和实施记录
│
├── packages/
│   ├── core/                        # @meteor3d/core
│   │   ├── index.js                 # 公共导出入口
│   │   ├── scripts/build.js         # SDK 构建脚本
│   │   └── src/
│   │       ├── SceneManager.js
│   │       ├── PersistenceManager.js
│   │       ├── DBManager.js
│   │       ├── BidRegistry.js
│   │       ├── GeoCoordinateSystem.js
│   │       ├── TileMapManager.js
│   │       ├── RaycastManager.js
│   │       ├── CameraControlManager.js
│   │       ├── CameraNavigationManager.js
│   │       ├── HighlightManager.js
│   │       ├── OutlineManager.js
│   │       ├── LabelManager.js
│   │       ├── RainManager.js
│   │       ├── SnowManager.js
│   │       ├── VFXManager.js
│   │       ├── LineManager.js
│   │       ├── StatsManager.js
│   │       ├── TriangleStatsManager.js
│   │       ├── loadScene.js
│   │       ├── controls/            # Orbit/Ghost 相机控制
│   │       ├── effects/             # Shield/Scan 等特效
│   │       └── utils/
│   │
│   ├── scene-editor/                # WebGL 场景编辑器
│   │   └── src/
│   │       ├── components/          # 视口、场景树、属性/材质/GIS/天气面板
│   │       ├── core/                # 输入、变换、历史、Command、预览管理
│   │       ├── stores/              # Pinia 编辑状态
│   │       ├── services/            # scene/asset API
│   │       ├── router/
│   │       └── views/
│   ├── asset-manager/               # 资产管理器
│   ├── app-editor/                  # 应用编辑器
│   ├── ai-scene/                    # AI 场景助手
│   ├── dashboard/                   # 平台入口
│   ├── docs/                        # VitePress 文档
│   ├── core-webgpu/                 # WebGPU Core 原型
│   └── scene-editor-webgpu/         # WebGPU 编辑器原型
│
└── meteor3d-server/
    ├── app.js                       # Express 入口
    ├── bin/FBX2glTF.exe
    ├── pyScript/step_to_glb.py
    └── src/
        ├── config/                  # MongoDB、Redis、Multer
        ├── models/                  # Scene、SceneObject、Asset、App
        ├── controllers/             # scene、asset、app、chat
        ├── routes/                  # /api/scene、assets、app、chat
        ├── services/                # GIS 底图与又拍云
        └── pipeline/
            ├── index.js             # 流水线编排
            ├── queue.js             # Bull 队列
            ├── processors/          # 各处理步骤
            └── utils/
```

## 6. Core SDK

### 6.1 SceneManager

`SceneManager` 是运行时中枢，负责：

- 创建 Three.js Scene、PerspectiveCamera 和 WebGLRenderer。
- 维护渲染循环和资源生命周期。
- 管理 Orbit 和 Ghost 两种相机模式。
- 提供相机聚焦、视角读写和 Tween 动画导航。
- 管理场景顶层可交互对象和 BID 映射。
- 管理 GIS 坐标、网格和影像瓦片底图。
- 更新 3D Tiles、Gaussian Splat 及其他动态内容。
- 提供普通射线检测、地面射线检测和 BVH 调试。
- 管理标签、描边、高亮、雨雪、VFX 和流动线。
- 统计 FPS、三角面、Draw Call 和纹理显存。
- 通过事件系统通知点击、场景就绪和控制模式变化。

### 6.2 BID 与节点身份

BID 是 Meteor3D 的持久化业务节点 ID，用来解决 Three.js UUID 和模型节点在重新加载后不稳定的问题。

- `BidRegistry` 维护运行时映射。
- 资产流水线为 GLB 节点注入稳定身份并生成 `nodeManifest`。
- 场景保存记录顶层对象 BID、资产版本和内部节点绑定。
- 应用组件和 SDK API 使用 BID 定位对象，而不是依赖临时 UUID。
- GLB 重新处理后，可以利用稳定节点信息继续恢复业务绑定。

修改对象创建、克隆、导入或反序列化逻辑时，必须同步考虑 BID 的注册、恢复和释放。

### 6.3 PersistenceManager

`PersistenceManager` 负责场景数据与 Three.js 对象之间的转换：

- 序列化和反序列化顶层场景对象。
- 保存基础几何体、GLB、3D Tiles 和 Gaussian Splat。
- 保存位置、旋转、缩放、显隐和材质数据。
- 记录 GLB 内部节点的增量修改及被删除的资产源节点。
- 序列化并恢复节点绑定和全局节点图。
- 恢复资产 ID、资产版本 ID 和 BID。
- 配置 Draco 解码器。
- 保存和加载环境、相机、GIS 等场景元数据。

### 6.4 DBManager

`DBManager` 是后端场景 API 客户端，不是 IndexedDB 封装。

当前主要采用整场景批量保存：

```text
PersistenceManager.saveScene()
  → DBManager.saveScene()
  → POST /api/scene/save
  → MongoDB Scene + SceneObject
```

`saveObject`、`getObject` 和 `deleteObject` 等单对象接口当前没有完整实现，不应作为新功能的主要持久化入口。

### 6.5 GIS 系统

GIS 由三部分组成：

- `GeoCoordinateSystem`：WGS84 与 Three.js 局部世界坐标互转。
- `GisUtils`：Web Mercator、瓦片索引和坐标工具。
- `TileMapManager`：加载并显示影像瓦片或后端生成的底图。

当前采用以场景中心为浮动原点的局部坐标，Three.js 坐标约定为 X 向东、Y 向上、负 Z 向北。

### 6.6 loadScene 对外入口

第三方页面、应用编辑器和 AI 场景助手通过 `loadScene()` 加载场景：

```javascript
import { loadScene } from '@meteor3d/core';

const instance = await loadScene({
  sceneId: 'scene-id',
  serverUrl: 'http://localhost:3001',
  container: document.getElementById('viewer'),
  config: {
    dracoPath: '/draco/',
    fitCamera: true,
    autoResize: true
  }
});
```

加载过程包括创建运行时、请求场景、恢复环境/GIS/相机、反序列化对象、恢复节点图、调整相机并返回 Meteor3DInstance 公共 API。

## 7. 场景编辑器

场景编辑器通过 `Viewport.vue` 组合 `@meteor3d/core` 和编辑器专用管理器。

### 已实现能力

- 场景创建、列表、删除和加载。
- 精品案例标记、场景分类和封面上传。
- GLB/GLTF、3D Tiles、Gaussian Splat 和基础几何体拖入。
- 场景树、节点选择和显隐管理。
- 位移、旋转、缩放及 Command 模式撤销/重做。
- 材质颜色、粗糙度、金属度、发光、混合和深度配置。
- 环境贴图、相机远裁切面和初始视角。
- Orbit/Ghost 相机模式和移动速度配置。
- GIS 中心、范围、网格和影像底图。
- 雨雪、FPS、三角面、Draw Call 和 BVH 调试。
- 标签、扫描和护盾等可视化预览。
- GLB 内部节点修改、删除和 BID 持久化。

编辑器管理器通过 `window.editor` 暴露给部分面板组件，这是当前实现中的全局桥接方式。新增功能时应注意组件卸载和监听器释放。

## 8. 资产管理与处理流水线

### 8.1 支持的资产入口

直接上传白名单包括：

- 模型：`.gltf`、`.glb`、`.obj`、`.fbx`、`.stl`
- 压缩包：`.zip`
- CAD：`.step`、`.stp`、`.igs`、`.iges`
- 图片和纹理：`.jpg`、`.jpeg`、`.png`
- 环境贴图：`.hdr`

此外支持注册外部 3D Tiles `tileset.json` 和 Gaussian Splat URL。

### 8.2 GLB 流水线

模型资产通过 Redis/Bull 异步处理：

```text
Step 0  ZIP 解压（按需）
Step 1  OBJ/FBX/STL 等格式转换为 GLB
Step 2  清洗和验证，移除不需要的相机与灯光
Step 2.5 注入稳定节点身份并生成 nodeManifest
Step 3  Draco 压缩
Step 4  纹理优化和多分辨率产物
Step 5  LOD 生成
Step 6  边界盒、包围球和模型统计
```

资产状态包括 `pending`、`processing`、`ready`、`failed` 和 `skipped`。Bull 配置包含失败重试、指数退避和 stalled job 检测。

### 8.3 资产输出

`Asset` 文档可以保存原始文件、压缩 GLB、LOD0/1/2、多尺寸纹理、缩略图、边界和统计、`assetVersionId`、`nodeManifest`，以及又拍云 URL。

## 9. 应用编辑器

应用编辑器用于在二维画布中组合 3D 场景和可视化组件。

### 画布与持久化

- 自定义画布宽高和背景。
- 组件拖动、缩放和旋转。
- 编辑与预览模式。
- 组件选择、层级和启用状态。
- 通过 MongoDB 保存 App 文档。
- 编辑状态变更后每 10 秒自动保存。

### 组件注册表

`widgetRegistry.js` 当前注册：

- 基础组件：Scene、ECharts、Button、Image、Text、Clock、Panel。
- 3D 逻辑组件：Label3D、Tour、Stats、Outline、Highlight、Camera、Rain、Snow、Shield、Scan、CameraControl。

组件通过配置声明默认尺寸、最小尺寸、属性面板和可调用动作，再通过动态 import 加载 Vue 实现。

组件可通过“源组件事件 → 目标组件 → enable/disable/toggle”建立联动。3D 逻辑组件通过 App Store 中的 SceneWidget Core 实例控制同一场景。

数据编辑支持普通属性表单、JSON、标签数据、CodeMirror，以及 ECharts option 和代码模式。ECharts 代码模式使用 `new Function`，目前不是安全隔离沙箱，不应运行不可信来源的代码。

## 10. AI 场景助手

`ai-scene` 加载场景后，将用户消息和场景节点数据发送到 `/api/chat/stream`。

### 运行流程

1. 前端通过 `loadScene()` 加载场景。
2. 前端提取场景树、BID 和空间信息。
3. 服务端通过 SSE 返回状态、文本增量和工具调用。
4. 服务端查询工具直接读取场景数据。
5. 客户端工具调用由浏览器执行 Core SDK API。
6. 模型根据工具结果继续推理并生成总结。

### 当前工具能力

- 控制雨、雪和清空天气。
- 高亮或描边目标对象。
- 总览或聚焦相机。
- 开关性能统计。
- 创建和清除流动线。
- 查询场景对象和节点详情。

当前 AI 前端仍使用 Meteor3DInstance 的 `_internal` 获取完整场景树，属于内部耦合。修改 Core 内部结构时需要同步检查 `ai-scene`。

## 11. WebGPU 实验分支

`core-webgpu` 和 `scene-editor-webgpu` 是独立原型，目前提供 WebGPURenderer、OrbitControls、TransformControls、GLB/GLTF、HDR、3D Tiles、基础几何体拖入和对象选择。

该分支没有完整复用 WebGL 主线的持久化、GIS、BID、特效和应用 API。开发主线功能时不要默认两套实现已经等价。

## 12. 后端 API 与数据模型

### API 路由

| 前缀 | 主要职责 |
|---|---|
| `/api/scene` | 场景列表、创建、保存、加载、删除、初始视角、封面、精品状态和 GIS 底图 |
| `/api/assets` | 上传、CAD 上传、列表、下载、删除、状态、重处理、缩略图、URL 注册和上云 |
| `/api/app` | 应用列表、创建、读取、更新和删除 |
| `/api/chat` | 普通对话和 SSE 流式 AI Agent |

`/uploads` 通过 Express 静态目录提供本地文件。

### MongoDB 模型

- `Scene`：场景名称、封面、精品状态、环境、相机、GIS、节点图和对象数量。
- `SceneObject`：对象 BID、资产引用、节点绑定、变换、材质和内部节点修改。
- `Asset`：来源、处理状态、派生文件、统计、边界、节点清单和云存储 URL。
- `App`：画布、组件、位置、尺寸、数据、启用状态和交互规则。

## 13. 环境配置

### 前端

各前端默认连接 `http://localhost:3001`，可通过 Vite 环境变量覆盖：

```dotenv
VITE_API_BASE_URL=http://localhost:3001
```

### 后端

后端通过 `dotenv` 读取环境变量。常用配置包括：

```dotenv
PORT=3001
MONGODB_URI=mongodb://user:password@127.0.0.1:27017/meteor3d
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_CONNECT_TIMEOUT_MS=10000
REDIS_KEEP_ALIVE_MS=30000
PYTHON_COMMAND=python
```

AI 和又拍云相关变量以对应控制器、服务及部署环境为准。不要把生产密钥提交到仓库。

完整本地运行还需要 MongoDB、Redis，以及对应格式的资产转换工具；CAD 上传需要 Python 和相应 CAD 转换依赖。

## 14. 安装与运行

### 安装依赖

```bash
# 前端工作区
pnpm install

# 后端不属于当前 pnpm workspace，需要独立安装
cd meteor3d-server
npm install
```

### 启动前端

```bash
pnpm dev:dashboard      # 固定端口 5172
pnpm dev:scene          # 默认 Vite 端口通常为 5173
pnpm dev:app            # 固定端口 5174
pnpm dev:asset          # 固定端口 5175
pnpm dev:ai-scene       # 未固定端口，由 Vite 选择
pnpm dev:docs
pnpm dev:scene-webgpu   # 固定端口 5176
```

### 启动后端

```bash
cd meteor3d-server
npm run dev
```

后端默认使用端口 3001。MongoDB 连接失败会直接终止进程；Redis 不可用时资产队列会持续尝试重连。

### 构建

```bash
pnpm build:core
pnpm build:scene
pnpm build:app
pnpm build:asset
pnpm build:dashboard
pnpm build:ai-scene
pnpm build:docs
pnpm build:all
```

## 15. 开发注意事项

1. **Core 是主线共享层**：场景编辑器、应用编辑器和 AI 场景助手都依赖 `@meteor3d/core`，修改公共行为时需要检查三个消费者。
2. **BID 不等同于 UUID**：跨保存和资产版本恢复的业务绑定必须使用 BID。
3. **场景以批量方式保存**：当前保存会替换场景下的对象集合，不要假定单对象 API 已完整实现。
4. **场景对象与资产不是同一概念**：Asset 描述可复用资源，SceneObject 描述资源在具体场景中的实例和修改。
5. **资源 URL 可能来自本地或云端**：处理 URL 时要兼容绝对地址、`/uploads` 相对地址和又拍云地址。
6. **3D Tiles 与普通 GLB 坐标语义不同**：地理参考 Tileset 需要保留自身变换，不能直接套用普通模型居中逻辑。
7. **Gaussian Splat 变换能力有限**：编辑器对其 TransformControls 做了特殊处理。
8. **注意释放资源**：销毁视图时应释放动画帧、ResizeObserver、事件监听、Three.js 资源、BVH、后处理和加载器。
9. **AI 输出当前使用 HTML 渲染**：接入不可信模型或外部内容时需要增加 HTML 清洗。
10. **ECharts 代码执行不是安全沙箱**：只能用于可信应用配置。
11. **WebGPU 是实验分支**：除非任务明确要求，否则功能开发和修复应优先修改 WebGL 主线。
12. **规划文档不是实现证明**：判断功能是否存在时，优先检查源码、路由、模型和包清单。

## 16. 当前工程限制

- 后端目前没有统一的用户认证、资源权限和租户隔离。
- CORS 当前为开放配置。
- 场景保存的删除和重新插入尚未使用 MongoDB 事务。
- 自动化测试覆盖不足，后端 `npm test` 尚未配置有效测试。
- CI 主要用于仓库同步，没有构建、lint 和测试门禁。
- 仓库存在 npm 与 pnpm 多份锁文件，需要避免依赖版本继续漂移。
- AI 场景助手仍依赖 Core 的 `_internal` 实现细节。
- 场景切换部分流程仍通过页面刷新完成。

新增基础设施或改变数据协议时，应同步更新本节，避免 AI 或维护者把限制误判为已解决能力。

## 17. 推荐阅读顺序

1. 根目录 `package.json` 和 `pnpm-workspace.yaml`。
2. `packages/core/index.js`。
3. `packages/core/src/SceneManager.js`。
4. `packages/core/src/PersistenceManager.js`。
5. `packages/core/src/BidRegistry.js`。
6. `packages/core/src/loadScene.js`。
7. `packages/scene-editor/src/components/Viewport.vue`。
8. `packages/scene-editor/src/stores/editorStore.js`。
9. `packages/app-editor/src/core/widgetRegistry.js` 和 `stores/appStore.js`。
10. `meteor3d-server/app.js`、路由、模型和控制器。
11. `meteor3d-server/src/pipeline/index.js`。
12. `packages/ai-scene/src/views/AiPreview.vue` 和服务端 `chatController.js`。

这样可以先理解运行时，再理解持久化、编辑器组合和后端数据协议。
