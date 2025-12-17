# Meteor3D API 文档实现计划

> 使用 VitePress 构建完整的 API 文档站点

---

## 概述

- **框架**: VitePress 1.5+
- **语言**: 中文
- **范围**: 覆盖所有 @meteor3d/core 模块 API
- **部署**: 手动部署

---

## 步骤拆解

### 步骤 1: 初始化 VitePress 项目

**目标**: 在 monorepo 中创建 `packages/docs` 文档包

**操作**:
1. 创建 `packages/docs` 目录
2. 初始化 `package.json`
3. 安装 `vitepress` 依赖
4. 创建基础目录结构

**产出**:
```
packages/docs/
├── package.json
├── .vitepress/
│   └── config.js
├── index.md
└── public/
```

**命令**:
```bash
cd packages/docs
pnpm init
pnpm add -D vitepress
```

---

### 步骤 2: 配置 VitePress

**目标**: 配置导航、侧边栏、主题

**操作**:
1. 配置 `.vitepress/config.js`
2. 设置导航栏（指南、API、示例）
3. 设置侧边栏结构
4. 配置社交链接（GitHub）

**配置内容**:
```javascript
// .vitepress/config.js
export default {
  title: 'Meteor3D',
  description: '3D 场景可视化平台 API 文档',
  themeConfig: {
    nav: [...],
    sidebar: {...}
  }
}
```

---

### 步骤 3: 编写指南文档

**目标**: 编写入门指南

**文件**:
| 文件 | 内容 |
|------|------|
| `guide/index.md` | 快速开始 |
| `guide/installation.md` | 安装部署（UMD/ESM） |
| `guide/concepts.md` | 核心概念（场景、GIS、环境） |

---

### 步骤 4: 编写 loadScene API 文档

**目标**: 完整的 loadScene 函数文档

**文件**: `api/load-scene.md`

**内容**:
- 函数签名
- 参数表格（sceneId, serverUrl, container, config）
- config 配置项详解
- 返回值结构
- 完整示例代码
- 注意事项

---

### 步骤 5: 编写 SceneManager API 文档

**目标**: SceneManager 类完整 API

**文件**: `api/scene-manager.md`

**方法列表**:
| 分类 | 方法 |
|------|------|
| 构造函数 | `constructor(canvas)` |
| 场景操作 | `addObject`, `removeObject`, `clearScene` |
| 相机控制 | `fitCameraToScene`, `onWindowResize` |
| 环境 | `loadEnvironment(url)` |
| GIS | `setGisConfig`, `clearGisConfig`, `lngLatToWorld`, `worldToLngLat`, `setBaseMap` |
| 辅助工具 | `setGridHelper`, `emitGisConfigUpdated` |
| 性能统计 | `toggleStats`, `enableStats`, `disableStats`, `toggleTriangleStats`, `getTriangleStats` |

---

### 步骤 6: 编写 PersistenceManager API 文档

**目标**: PersistenceManager 类 API

**文件**: `api/persistence-manager.md`

**方法列表**:
| 方法 | 描述 |
|------|------|
| `constructor(sceneManager, editorStore, dbManager, options)` | 构造函数 |
| `static setDracoPath(path)` | 设置全局 Draco 路径 |
| `deserializeObject(data)` | 反序列化场景对象 |
| `loadGLTFModel(url)` | 加载 GLTF/GLB 模型 |
| `serializeObject(object)` | 序列化对象为 JSON |
| `saveScene(sceneData)` | 保存场景 |
| `loadScene(sceneId)` | 加载场景 |

---

### 步骤 7: 编写 GisProjection API 文档

**目标**: GIS 坐标转换工具文档

**文件**: `api/gis-projection.md`

**方法列表**:
| 方法 | 描述 |
|------|------|
| `constructor(options)` | 构造函数，设置中心点 |
| `lngLatToEcef(lng, lat, h)` | 经纬度转 ECEF 坐标 |
| `lngLatToEnu(lng, lat, h)` | 经纬度转 ENU 坐标 |
| `enuToLngLat(e, n, u)` | ENU 坐标转经纬度 |
| `offsetMetersToLngLat(east, north)` | 米偏移转经纬度 |

---

### 步骤 8: 编写其他模块文档

**目标**: 覆盖剩余模块

**文件**:
| 文件 | 模块 |
|------|------|
| `api/db-manager.md` | DBManager 数据管理 |
| `api/stats-manager.md` | StatsManager 性能监控 |
| `api/triangle-stats-manager.md` | TriangleStatsManager 三角形统计 |
| `api/types.md` | 类型定义与接口 |

---

### 步骤 9: 编写示例文档

**目标**: 实用代码示例

**文件**:
| 文件 | 内容 |
|------|------|
| `examples/basic.md` | 最简场景加载 |
| `examples/gis-scene.md` | GIS 坐标场景 |
| `examples/environment.md` | 环境贴图配置 |
| `examples/advanced.md` | 高级用法（添加对象、事件监听） |

---

### 步骤 10: 更新 monorepo 配置

**目标**: 集成到工作流

**操作**:
1. 更新 `pnpm-workspace.yaml`（如需要）
2. 在根 `package.json` 添加脚本:
   ```json
   {
     "scripts": {
       "dev:docs": "pnpm --filter @meteor3d/docs dev",
       "build:docs": "pnpm --filter @meteor3d/docs build"
     }
   }
   ```

---

### 步骤 11: 更新 Dashboard 入口

**目标**: HomeView 中 API 文档卡片跳转到文档站

**操作**:
- 开发环境: 跳转到 `http://localhost:5177`
- 生产环境: 跳转到部署后的文档 URL

---

### 步骤 12: 验证与测试

**目标**: 确保文档站正常运行

**验证项**:
- [ ] 首页渲染正确
- [ ] 导航和侧边栏正常
- [ ] 所有页面可访问
- [ ] 代码高亮正常
- [ ] 搜索功能可用
- [ ] 响应式布局正确

**命令**:
```bash
pnpm dev:docs      # 开发预览
pnpm build:docs    # 构建生产版本
```

---

## 文件清单

| 路径 | 描述 |
|------|------|
| `packages/docs/package.json` | 文档包配置 |
| `packages/docs/.vitepress/config.js` | VitePress 配置 |
| `packages/docs/index.md` | 首页 |
| `packages/docs/guide/index.md` | 快速开始 |
| `packages/docs/guide/installation.md` | 安装部署 |
| `packages/docs/guide/concepts.md` | 核心概念 |
| `packages/docs/api/index.md` | API 概览 |
| `packages/docs/api/load-scene.md` | loadScene 文档 |
| `packages/docs/api/scene-manager.md` | SceneManager 文档 |
| `packages/docs/api/persistence-manager.md` | PersistenceManager 文档 |
| `packages/docs/api/gis-projection.md` | GisProjection 文档 |
| `packages/docs/api/db-manager.md` | DBManager 文档 |
| `packages/docs/api/stats-manager.md` | StatsManager 文档 |
| `packages/docs/api/triangle-stats-manager.md` | TriangleStatsManager 文档 |
| `packages/docs/api/types.md` | 类型定义 |
| `packages/docs/examples/basic.md` | 基础示例 |
| `packages/docs/examples/gis-scene.md` | GIS 示例 |
| `packages/docs/examples/environment.md` | 环境贴图示例 |
| `packages/docs/examples/advanced.md` | 高级示例 |

---

## 预计时间

| 步骤 | 时间 |
|------|------|
| 步骤 1-2: 项目初始化 | 15 分钟 |
| 步骤 3: 指南文档 | 20 分钟 |
| 步骤 4: loadScene 文档 | 15 分钟 |
| 步骤 5: SceneManager 文档 | 30 分钟 |
| 步骤 6-8: 其他 API 文档 | 45 分钟 |
| 步骤 9: 示例文档 | 20 分钟 |
| 步骤 10-12: 集成与验证 | 15 分钟 |

**总计: 约 2.5-3 小时**

---

## 执行顺序

```
步骤 1 → 步骤 2 → 步骤 3 → 步骤 4 → 步骤 5 → 步骤 6 → 步骤 7 → 步骤 8 → 步骤 9 → 步骤 10 → 步骤 11 → 步骤 12
```

确认后可逐步执行，每完成一个步骤可以暂停检查。
