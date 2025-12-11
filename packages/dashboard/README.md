# Dashboard 工程说明

> 本文档用于帮助 AI 编程助手快速理解此工程。

## 概述

Dashboard 是 Meteor3D SaaS 平台的**统一入口**，负责展示平台介绍和导航到各子系统。

## 功能

- 展示平台品牌和介绍信息
- 提供三个子系统的入口卡片：
  - **3D 场景编辑器** → `http://localhost:5173` (scene-editor)
  - **资产管理器** → `http://localhost:5175` (asset-manager)
  - **应用编辑器** → `http://localhost:5174` (app-editor)

## 文件结构

```
dashboard/
├── package.json          # 包配置 (@meteor3d/dashboard)
├── vite.config.js        # Vite 配置 (端口 5172)
├── index.html            # 入口 HTML
└── src/
    ├── main.js           # 应用入口 (Vue + Pinia + Router)
    ├── App.vue           # 根组件
    ├── router/
    │   └── index.js      # 路由配置 (仅 '/' -> HomeView)
    └── views/
        └── HomeView.vue  # 主页视图
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.5.25 | 前端框架 |
| Vite | ^7.2.4 | 构建工具 |
| vue-router | ^4.6.3 | 路由管理 |
| Pinia | ^3.0.4 | 状态管理 |

## 运行命令

```bash
# 从 monorepo 根目录运行
pnpm dev:dashboard   # 启动开发服务器 (http://localhost:5172)
```

## 导航逻辑

`HomeView.vue` 中使用绝对 URL 跳转到各子系统：

```javascript
const PORTS = {
  'scene-editor': 5173,
  'asset-manager': 5175,
  'app-editor': 5174
}

const navigateTo = (app) => {
  window.location.href = `http://localhost:${PORTS[app]}`
}
```

## 注意事项

1. **独立运行**：Dashboard 可独立于其他子系统运行
2. **跨系统跳转**：使用 `window.location.href` 而非 `router.push`
3. **未来规划**：可添加用户登录、项目列表管理等功能
