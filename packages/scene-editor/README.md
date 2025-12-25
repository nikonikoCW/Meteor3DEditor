# @meteor3d/scene-editor

> 本文档帮助 AI 编程助手快速理解 scene-editor 项目。

## 项目概述

`@meteor3d/scene-editor` 是 Meteor3D SaaS 平台的 **3D 场景编辑器**，用于可视化搭建 3D 场景。

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.5.25 | 前端框架 (Composition API + JavaScript) |
| Vite | ^7.2.4 | 构建工具 |
| Three.js | ^0.181.2 | 3D 渲染引擎 |
| Pinia | ^3.0.4 | 状态管理 |
| vue-router | ^4.6.3 | 路由管理 |

---

## 文件结构

```
scene-editor/
├── index.html              # HTML 入口
├── package.json            # 包配置
├── vite.config.js          # Vite 构建配置 (端口 5173)
│
├── public/
│   ├── draco/                  # Draco 解码器
│   └── meteor-min.svg          # Logo
│
└── src/
    ├── main.js             # Vue 应用入口
    ├── App.vue             # 根组件
    ├── config.js           # API 配置 (后端地址)
    │
    ├── views/                  # 页面视图
    │   ├── EditorView.vue          # 编辑器主页面
    │   ├── ScenesView.vue          # 场景列表 (支持分页)
    │   └── AboutView.vue           # 关于页面
    │
    ├── components/             # Vue 组件
    │   ├── Viewport.vue            # 3D 视口
    │   ├── SceneTree.vue           # 场景树
    │   ├── TreeNode.vue            # 树节点
    │   ├── PropertiesPanel.vue     # 属性面板
    │   ├── LibraryPanel.vue        # 资产库面板
    │   ├── Toolbar.vue             # 工具栏 (含批量导入)
    │   ├── BatchLoaderDialog.vue   # 批量导入弹窗 (JSON格式提示+复制)
    │   ├── GisSettingsPanel.vue    # GIS 设置面板 (包含影像底图)
    │   ├── MapSelectorDialog.vue   # 地图范围选择弹窗
    │   ├── SceneSettingsPanel.vue  # 场景设置面板
    │   ├── MaterialPanel.vue       # 材质面板
    │   ├── Navigation.vue          # 导航组件
    │   ├── Message.vue             # 消息提示
    │   ├── MessageContainer.vue    # 消息容器
    │   └── icons/                  # 图标组件目录
    │
    ├── stores/                 # Pinia 状态仓库
    ├── router/                 # Vue Router 路由
    ├── services/               # API 服务层
    │   ├── assetService.js         # 资产 API 服务
    │   └── sceneService.js         # 场景 API 服务
    │
    ├── core/                   # 内部核心逻辑
    ├── utils/                  # 工具函数
```

---

## 运行命令

```bash
# 从项目根目录启动 (端口 5173)
pnpm dev:scene

# 或进入目录启动
cd packages/scene-editor
pnpm dev
```

---

## API 配置

后端 API 地址在 `src/config.js` 中配置：

```javascript
// 通过环境变量配置
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const API_BASE_URL = `${BASE_URL}/api`;
export const ASSET_BASE_URL = BASE_URL;
```

---

## 核心依赖

- **@meteor3d/core**: 共享核心库 (SceneManager, PersistenceManager, GisProjection)
- **后端 API**: `meteor3d-server` (资产 CRUD, 场景 CRUD, 底图生成)

---

## GIS 影像底图功能

`GisSettingsPanel.vue` 支持在配置 GIS 后自动生成卓贴地图影像底图：

| 功能 | 说明 |
|------|------|
| 自动生成 | 配置/调整 GIS 范围后后端自动下载天地图瓦片拼接 |
| 显示开关 | “显示影像地图”开关控制底图可见性 |
| 持久化 | 底图 URL 和显示状态保存在 `gisConfig` 中 |
| 加载恢复 | 重新进入场景时自动恢复底图显示 |

---

## IDE 推荐配置

- [VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- 推荐使用 Chromium 浏览器 + Vue.js devtools 扩展

---

## 场景列表分页

`ScenesView.vue` 支持分页加载场景列表：

| 功能 | 说明 |
|------|------|
| 分页显示 | 上一页/下一页/页码导航 |
| 每页数量 | 可选择 5/10/20/30 条 |
| 总数统计 | 显示总场景数 |

---

## 批量导入功能

`Toolbar.vue` 中的 **批量导入** 按钮，支持从 JSON 文件批量生成模型：

| 功能 | 说明 |
|------|------|
| JSON 格式提示 | 悬停帮助图标显示格式说明 |
| 复制示例 | 一键复制 JSON 模板到剪贴板 |
| 模型选择 | 从资产库选择要使用的模型 |
| GIS 坐标 | 自动将经纬度转换为场景坐标 |
