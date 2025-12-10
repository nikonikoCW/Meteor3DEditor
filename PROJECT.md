# Meteor3D 项目说明

> 本文档用于帮助 AI 编程助手快速理解此工程。

## 项目概述

Meteor3D 是一个 **低代码 3D 场景可视化编辑平台**，采用 pnpm monorepo 架构。主要用于构建 3D 场景编辑器和应用编辑器，支持模型拖拽、场景树管理、属性编辑、GIS 投影、持久化存储等功能。

---

## 平台规划

本平台是一个 SaaS 产品，包含以下核心模块：

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Meteor3D SaaS 平台                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │   场景编辑器     │  │   资产管理器     │  │      应用编辑器      │  │
│  │ (scene-editor)  │  │ (asset-manager) │  │    (app-editor)     │  │
│  │                 │  │                 │  │                     │  │
│  │  • 3D 场景搭建   │  │  • 资产上传     │  │  • 大屏项目开发      │  │
│  │  • 模型编辑      │  │  • 缩略图生成   │  │  • 场景组件嵌入      │  │
│  │  • 属性调整      │  │  • 分类筛选     │  │  • 数据可视化        │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
│           │                    │                      │             │
│           └────────────────────┼──────────────────────┘             │
│                                ▼                                    │
│               ┌─────────────────────────┐                           │
│               │    @meteor3d/core       │                           │
│               │    (核心 SDK)            │                           │
│               │                         │                           │
│               │  • 渲染逻辑 (Three.js)   │                           │
│               │  • GIS 投影管理          │                           │
│               │  • 场景序列化/反序列化    │                           │
│               │  • 可打包为独立 JS 文件   │                           │
│               └─────────────────────────┘                           │
│                                │                                    │
│                                ▼                                    │
│      ┌─────────────────────────────────────────────────────┐        │
│      │  第三方集成：引入 core.js + 场景ID + Server 地址即可渲染 │        │
│      └─────────────────────────────────────────────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1. 场景编辑器 (scene-editor)
- **用途**：3D 场景的可视化搭建
- **功能**：模型拖拽、属性编辑、场景树、GIS 配置
- **输出**：场景数据 (存储在后端 MongoDB)

### 2. 资产管理器 (asset-manager)
- **用途**：3D 资产的统一管理
- **功能**：资产上传、缩略图生成、分类筛选、下载删除
- **支持格式**：GLTF/GLB 模型、JPG/PNG 贴图、HDR/EXR 环境贴图

### 3. 应用编辑器 (app-editor)
- **用途**：大屏可视化项目开发
- **功能**：拖拽式页面搭建、数据绑定、**场景组件**
- **场景组件**：可直接加载场景编辑器搭建的场景 (通过场景 ID)

### 4. Core SDK (@meteor3d/core)
- **用途**：核心渲染与数据逻辑，供各编辑器共享
- **未来规划**：可独立打包为 `meteor3d-core.js`，第三方开发者只需：
  ```javascript
  import { loadScene } from 'meteor3d-core.js';
  loadScene({
    sceneId: 'xxx',
    serverUrl: 'https://api.meteor3d.com',
    container: document.getElementById('canvas')
  });
  ```

---

## 技术栈

### 前端 (packages/*)

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.5.25 | 前端框架 (Composition API + JavaScript) |
| Vite | ^7.2.4 | 构建工具 |
| Three.js | ^0.181.2 | 3D 渲染引擎 |
| Pinia | ^3.0.4 | 状态管理 |
| vue-router | ^4.6.3 | 路由管理 (scene-editor) |

### 后端 (meteor3d-server)

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | - | 运行时 |
| Express | ^5.2.1 | Web 框架 |
| MongoDB/Mongoose | ^9.0.0 | 数据库 ORM |
| Multer | ^2.0.2 | 文件上传 |

### 包管理

- **pnpm** + **workspace** 进行 monorepo 管理
- 工作区位于 `packages/*`

---

## 文件结构

```
Meteor3D/
├── package.json                 # Monorepo 根配置
├── pnpm-workspace.yaml          # pnpm 工作区配置
│
├── packages/
│   ├── core/                    # @meteor3d/core 共享核心库
│   │   ├── index.js             # 导出入口
│   │   └── src/
│   │       ├── SceneManager.js      # Three.js 场景/相机/渲染器管理
│   │       ├── PersistenceManager.js # 场景序列化/反序列化/IndexedDB 持久化
│   │       ├── DBManager.js         # IndexedDB 操作封装
│   │       ├── GisProjection.js     # GIS 坐标投影转换 (proj4)
│   │       └── utils/
│   │           ├── ThumbnailGenerator.js  # 3D 模型缩略图生成
│   │           └── message.js             # 消息通知工具
│   │
│   ├── scene-editor/            # @meteor3d/scene-editor 3D 场景编辑器
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── src/
│   │       ├── App.vue
│   │       ├── main.js
│   │       ├── config.js              # 配置 (API baseURL 等)
│   │       ├── components/            # Vue 组件
│   │       │   ├── Viewport.vue           # 3D 视口
│   │       │   ├── SceneTree.vue          # 场景树
│   │       │   ├── TreeNode.vue           # 树节点
│   │       │   ├── PropertiesPanel.vue    # 属性面板
│   │       │   ├── LibraryPanel.vue       # 资产库面板
│   │       │   ├── Toolbar.vue            # 工具栏
│   │       │   ├── GisSettingsPanel.vue   # GIS 设置面板
│   │       │   ├── SceneSettingsPanel.vue # 场景设置面板
│   │       │   └── ...                    # 其他组件
│   │       ├── views/                 # 页面视图
│   │       │   ├── HomeView.vue           # 首页
│   │       │   ├── EditorView.vue         # 编辑器主页面
│   │       │   └── ScenesView.vue         # 场景列表
│   │       ├── stores/                # Pinia 状态仓库
│   │       ├── router/                # Vue Router 路由
│   │       ├── services/              # API 服务层
│   │       └── utils/                 # 工具函数
│   │
│   ├── asset-manager/           # @meteor3d/asset-manager 资产管理器
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── src/
│   │       ├── App.vue
│   │       ├── main.js
│   │       ├── config.js              # API 配置
│   │       ├── views/
│   │       │   └── AssetsView.vue         # 资产管理视图
│   │       ├── components/
│   │       │   ├── Message.vue            # 消息提示
│   │       │   └── MessageContainer.vue   # 消息容器
│   │       ├── services/
│   │       │   └── assetService.js        # 资产 API 服务
│   │       └── utils/
│   │           ├── ThumbnailGenerator.js  # 缩略图生成
│   │           └── message.js             # 消息工具
│   │
│   └── app-editor/              # @meteor3d/app-editor 应用编辑器
│       ├── package.json
│       ├── vite.config.js
│       └── src/
│           ├── App.vue
│           ├── main.js
│           ├── config.js
│           ├── components/            # 组件目录
│           ├── views/                 # 视图目录
│           ├── stores/                # Pinia 状态仓库
│           └── core/                  # 核心模块
│
└── meteor3d-server/             # 后端服务
    ├── app.js                   # Express 入口
    ├── package.json
    └── src/
        ├── config/              # 配置 (数据库连接等)
        ├── models/              # Mongoose 数据模型
        │   ├── Asset.js             # 资产模型 (3D模型文件)
        │   ├── Scene.js             # 场景模型
        │   └── SceneObject.js       # 场景对象模型
        ├── controllers/         # 控制器层
        │   ├── assetController.js   # 资产 CRUD
        │   └── sceneController.js   # 场景 CRUD
        └── routes/              # 路由定义
            ├── assetRoutes.js
            └── sceneRoutes.js
```

---

## 核心功能模块

### 1. SceneManager (场景管理器)
- Three.js 场景初始化
- 相机、渲染器、轨道控制器管理
- 环境贴图加载 (HDR)
- 网格辅助线显示
- GIS 投影配置与坐标转换 (经纬度 ↔ 世界坐标)

### 2. PersistenceManager (持久化管理器)
- 场景对象序列化/反序列化
- GLTF 模型增量保存 (只保存修改的属性)
- IndexedDB 本地存储
- Draco 压缩支持

### 3. DBManager (数据库管理器)
- IndexedDB 操作封装
- 对象 CRUD 方法

### 4. GisProjection (GIS 投影)
- 基于 proj4 的坐标投影
- 支持 EPSG:4326 (WGS84) 与墨卡托投影互转

### 5. ThumbnailGenerator (缩略图生成器)
- 3D 模型自动生成缩略图
- 计算最佳相机角度和位置

---

## 运行命令

```bash
# 安装依赖
pnpm install

# 启动场景编辑器开发服务 (端口 5173)
pnpm dev:scene

# 启动资产管理器开发服务 (端口 5175)
pnpm dev:asset

# 启动应用编辑器开发服务 (端口 5174)
pnpm dev:app

# 启动后端服务 (端口 3001)
cd meteor3d-server && npm run dev

# 构建所有包
pnpm build:all
```

---

## 数据库配置

后端使用 MongoDB，默认连接配置：
- 用户名: `root`
- 密码: `123456`
- 数据库连接配置在 `meteor3d-server/src/config/` 目录

---

## 注意事项

1. **包依赖**: `scene-editor` 和 `app-editor` 都依赖 `@meteor3d/core`，通过 `workspace:*` 引用
2. **文件上传**: 上传的 3D 模型存储在 `meteor3d-server/uploads/` 目录
3. **GLTF 支持**: 支持 `.gltf` 和 `.glb` 格式，使用 Draco 解压缩
4. **GIS 功能**: 可设置场景中心锚点和范围，支持经纬度与世界坐标互转
