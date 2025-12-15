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
└── src/
    ├── main.js             # Vue 应用入口
    ├── App.vue             # 根组件
    ├── config.js           # API 配置 (后端地址)
    │
    ├── views/                  # 页面视图
    │   ├── HomeView.vue            # 首页
    │   ├── EditorView.vue          # 编辑器主页面
    │   └── ScenesView.vue          # 场景列表
    │
    ├── components/             # Vue 组件
    │   ├── Viewport.vue            # 3D 视口
    │   ├── SceneTree.vue           # 场景树
    │   ├── TreeNode.vue            # 树节点
    │   ├── PropertiesPanel.vue     # 属性面板
    │   ├── LibraryPanel.vue        # 资产库面板
    │   ├── Toolbar.vue             # 工具栏
    │   ├── GisSettingsPanel.vue    # GIS 设置面板
    │   └── SceneSettingsPanel.vue  # 场景设置面板
    │
    ├── stores/                 # Pinia 状态仓库
    ├── router/                 # Vue Router 路由
    ├── services/               # API 服务层
    │   └── assetService.js         # 资产 API 服务
    │
    └── utils/                  # 工具函数
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
- **后端 API**: `meteor3d-server` (资产 CRUD, 场景 CRUD)

---

## IDE 推荐配置

- [VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- 推荐使用 Chromium 浏览器 + Vue.js devtools 扩展
