# Meteor3D API 文档实现计划

> 使用 VitePress 构建 SceneManager API 文档

---

## 概述

- **框架**: VitePress 1.5+
- **语言**: 中文
- **范围**: 仅 SceneManager 类 API 文档
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
2. 设置导航栏
3. 设置侧边栏结构
4. 配置社交链接（GitHub）

---

### 步骤 3: 编写首页

**目标**: 创建文档首页

**文件**: `index.md`

**内容**:
- 标题和简介
- 快速开始链接
- API 文档入口

---

### 步骤 4: 编写 SceneManager API 文档

**目标**: 完整的 SceneManager 类 API 文档

**文件**: `api/scene-manager.md`

**方法列表**:

| 分类 | 方法 | 描述 |
|------|------|------|
| **构造函数** | `constructor(canvas)` | 初始化场景管理器 |
| **场景操作** | `addObject(object)` | 添加对象到场景 |
| | `removeObject(object)` | 从场景移除对象 |
| | `clearScene()` | 清空场景 |
| **相机控制** | `fitCameraToScene()` | 聚焦相机到场景 |
| | `onWindowResize(width, height)` | 处理窗口尺寸变化 |
| **环境** | `loadEnvironment(url)` | 加载 HDR 环境贴图 |
| **GIS 功能** | `setGisConfig(config)` | 配置 GIS 投影 |
| | `clearGisConfig()` | 清除 GIS 配置 |
| | `lngLatToWorld(lng, lat, height)` | 经纬度转世界坐标 |
| | `worldToLngLat(worldPos)` | 世界坐标转经纬度 |
| | `setBaseMap(url, bounds, size, visible)` | 设置卫星底图 |
| | `emitGisConfigUpdated()` | 触发 GIS 配置更新事件 |
| **辅助工具** | `setGridHelper(visible, length, width)` | 设置网格辅助线 |
| **性能统计** | `enableStats()` | 启用性能监视器 |
| | `disableStats()` | 禁用性能监视器 |
| | `toggleStats(show)` | 切换性能监视器 |
| | `isStatsEnabled()` | 获取监视器状态 |
| **三角形统计** | `toggleTriangleStats(show, callback, interval)` | 切换三角形统计 |
| | `setTriangleStatsCallback(callback, interval)` | 设置统计回调 |
| | `getTriangleStats()` | 获取三角形统计 |
| | `isTriangleStatsEnabled()` | 获取统计状态 |
| | `markTriangleStatsDirty()` | 标记统计缓存为脏 |

---

### 步骤 5: 更新 monorepo 配置

**目标**: 集成到工作流

**操作**:
1. 在根 `package.json` 添加脚本:
   ```json
   {
     "scripts": {
       "dev:docs": "pnpm --filter @meteor3d/docs dev",
       "build:docs": "pnpm --filter @meteor3d/docs build"
     }
   }
   ```

---

### 步骤 6: 验证与测试

**目标**: 确保文档站正常运行

**验证项**:
- [ ] 首页渲染正确
- [ ] 导航和侧边栏正常
- [ ] SceneManager 文档完整
- [ ] 代码高亮正常
- [ ] 搜索功能可用

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
| `packages/docs/api/scene-manager.md` | SceneManager API 文档 |

---

## 预计时间

| 步骤 | 时间 |
|------|------|
| 步骤 1: 项目初始化 | 10 分钟 |
| 步骤 2: VitePress 配置 | 10 分钟 |
| 步骤 3: 首页 | 5 分钟 |
| 步骤 4: SceneManager 文档 | 30 分钟 |
| 步骤 5-6: 集成与验证 | 10 分钟 |

**总计: 约 1 小时**

---

## 执行顺序

```
步骤 1 → 步骤 2 → 步骤 3 → 步骤 4 → 步骤 5 → 步骤 6
```

确认后可逐步执行。
