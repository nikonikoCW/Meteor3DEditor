# App Editor 包说明

> 本文档旨在帮助 AI 编程助手快速理解 `@meteor3d/app-editor` 项目的结构和功能。

## 项目概述

`app-editor` 是 Meteor3D 低代码平台的**应用编辑器**模块。它允许用户通过拖拽组件的方式，快速搭建包含 3D 场景、图表、按钮等元素的交互式 Web 应用，是一个典型的**低代码可视化编辑工具**。

### 核心能力

- 🧩 **拖拽式组件编排**：从左侧组件库拖拽组件到画布
- 🌍 **嵌入 3D 场景**：通过 `SceneWidget` 组件嵌入由 `scene-editor` 创建的 3D 场景
- 📊 **图表组件**：支持 ECharts 图表展示 (折线图/柱状图/饼图)
- � **Moveable 交互**：支持组件拖拽、8方向缩放、旋转、吸附对齐
- 📝 **属性编辑**：选中组件后，可在右侧属性面板实时修改属性
- 💾 **数据持久化**：支持应用的保存、加载、删除

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API + `<script setup>`) |
| 状态管理 | Pinia |
| 画布交互 | vue3-moveable (拖拽/缩放/旋转/吸附) |
| 图表 | ECharts |
| 3D 引擎 | `@meteor3d/core` (Three.js 封装) |
| 构建工具 | Vite 7 |
| 包管理 | pnpm workspace |

---

## 项目结构

```
packages/app-editor/
├── index.html                 # 入口 HTML
├── package.json               # npm 配置
├── vite.config.js             # Vite 构建配置
├── .env.development           # 开发环境变量 (API 地址)
├── .env.production            # 生产环境变量
├── public/
│   ├── draco/                 # Draco 解码器 (用于 GLTF 解压)
│   └── meteor-min.svg         # 网站 favicon
└── src/
    ├── main.js                # Vue 应用入口
    ├── App.vue                # 根组件 (路由切换)
    ├── config.js              # 环境配置 (API_BASE_URL)
    ├── assets/
    │   └── main.css           # 全局样式
    ├── core/
    │   └── widgetRegistry.js  # 组件注册表 (核心)
    ├── stores/
    │   └── appStore.js        # Pinia 状态管理 (含保存/加载)
    ├── services/
    │   └── appService.js      # 后端 API 调用
    ├── views/
    │   ├── AppListView.vue    # 应用列表页面
    │   └── AppEditorView.vue  # 编辑器主视图
    └── components/
        ├── header/
        │   └── EditorHeader.vue   # 顶部工具栏 (返回/标题/编辑开关/保存)
        ├── left/
        │   ├── LeftPanel.vue      # 左侧面板容器
        │   ├── ComponentTree.vue  # 组件树 (已添加组件列表)
        │   └── ComponentMenu.vue  # 组件库 (按分类展示)
        ├── canvas/
        │   └── AppCanvas.vue      # 画布 (Moveable 集成)
        ├── right/
        │   ├── RightPanel.vue     # 右侧面板容器 (Tab 切换)
        │   ├── PropertyPanel.vue  # 属性面板
        │   ├── DataPanel.vue      # 数据面板 (placeholder)
        │   └── InteractionPanel.vue # 交互面板 (placeholder)
        └── widgets/               # 可拖拽组件实现
            ├── SceneWidget.vue    # 3D 场景组件
            ├── EChartsWidget.vue  # ECharts 图表组件
            ├── ButtonWidget.vue   # 交互按钮组件
            ├── ImageWidget.vue    # 图片组件
            ├── TextWidget.vue     # 文本组件
            ├── ClockWidget.vue    # 时钟组件
            ├── LabelWidget.vue    # 3D 标签 (placeholder)
            └── TourWidget.vue     # 漫游路径 (placeholder)
```

---

## 核心模块说明

### 1. `widgetRegistry.js` - 组件注册表

支持按分类管理组件（scene/2d/3d），关键函数：

| 函数 | 说明 |
|------|------|
| `registerWidget(type, config, componentLoader)` | 注册组件类型 |
| `getWidgetDefinition(type)` | 获取组件定义 |
| `getRegisteredWidgets()` | 获取所有组件列表 |
| `getWidgetsByCategory()` | 按分类获取组件 (scene/2d/3d) |

### 2. `appStore.js` - 应用状态管理

| 状态/方法 | 说明 |
|-----------|------|
| `appId`, `appName` | 应用标识和名称 |
| `widgets` | 画布上的组件实例列表 |
| `selectedWidget` | 当前选中的组件 |
| `isEditMode` | 编辑/预览模式切换 |
| `saveApp()` | 保存应用到后端 |
| `loadApp(id)` | 从后端加载应用 |
| `newApp()` | 创建新应用 |

### 3. `AppCanvas.vue` - 画布组件

使用 `vue3-moveable` 实现：
- 拖放新组件 (`@drop`)
- 组件移动 (`@drag`, `@dragEnd`)
- 8方向缩放 (`@resize`, `@resizeEnd`)
- 旋转 (`@rotate`, `@rotateEnd`)
- 吸附对齐 (snappable + guidelines)

### 4. `AppListView.vue` - 应用列表

应用管理页面：
- 卡片式展示所有应用
- 创建新应用
- 编辑/删除现有应用

---

## 数据流

```
┌────────────────┐    拖拽     ┌─────────────────┐
│ ComponentMenu  │ ─────────▶ │   AppCanvas     │
│  (组件库)       │   drop     │   (画布)         │
└────────────────┘            └─────────────────┘
                                      │
                                      │ addWidget()
                                      ▼
                              ┌─────────────────┐
                              │    appStore     │ ◄──── saveApp() ────▶ 后端 API
                              │ (Pinia 状态)     │
                              └─────────────────┘
                                      │
                                      │ selectWidget()
                                      ▼
                              ┌─────────────────┐
                              │ PropertyPanel   │
                              │ (属性面板)       │
                              └─────────────────┘
```

---

## 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/app/list` | 获取应用列表 |
| GET | `/api/app/:id` | 获取应用详情 |
| POST | `/api/app` | 创建应用 |
| PUT | `/api/app/:id` | 更新应用 (全量保存) |
| DELETE | `/api/app/:id` | 删除应用 |

---

## 开发命令

```bash
# 开发模式
pnpm dev:app

# 构建生产版本
pnpm --filter @meteor3d/app-editor build
```

---

## 扩展指南

### 添加新的组件类型

1. 在 `src/components/widgets/` 创建新的 Vue 组件
2. 在 `widgetRegistry.js` 中注册：

```javascript
registerWidget('NewWidget', {
  label: '新组件',
  icon: '🆕',
  category: '2d',  // scene | 2d | 3d
  defaultSize: { width: 200, height: 100 },
  minSize: { width: 50, height: 30 },
  props: [
    { name: 'title', label: '标题', type: 'text', defaultValue: '默认标题' }
  ]
}, () => import('../components/widgets/NewWidget.vue'));
```

3. 组件会自动出现在左侧组件库对应分类中

---

## 已实现功能

- [x] 拖拽式组件添加
- [x] 组件移动/缩放/旋转 (vue3-moveable)
- [x] 吸附对齐和辅助线
- [x] 编辑/预览模式切换
- [x] 属性面板编辑
- [x] 应用保存/加载
- [x] 应用列表管理
- [x] 2D 组件 (ECharts/图片/文本/时钟/按钮)
- [x] 3D 场景嵌入

## 待实现功能

- [ ] 3D 标签/漫游组件 (目前为 placeholder)
- [ ] 数据面板 (数据源配置)
- [ ] 交互面板 (事件绑定)
- [ ] 组件层级管理 (z-index)
- [ ] 撤销/重做
