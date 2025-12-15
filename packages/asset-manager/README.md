# @meteor3d/asset-manager

Meteor3D 资产管理系统 - 独立的 3D 资产管理应用。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **资产上传** | 支持 GLTF/GLB 模型、贴图、HDRI 环境贴图 |
| **缩略图生成** | 上传模型时自动生成 3D 预览缩略图 |
| **资产分类** | 按类型筛选 (全部/模型/贴图/HDRI) |
| **资产下载** | 一键下载原始资产文件 |
| **资产删除** | 删除不需要的资产 |

---

## 支持的文件格式

| 类型 | 格式 |
|------|------|
| 模型 | `gltf.zip`,`fbx.zip`, `obj.zip`, `.glb` (支持 Draco 压缩) |
| 贴图 | `.jpg`, `.jpeg`, `.png` |
| 环境贴图 | `.hdr`, `.exr` |

---

## 文件结构

```
asset-manager/
├── index.html              # HTML 入口
├── package.json            # 包配置
├── vite.config.js          # Vite 构建配置 (端口 5175)
│
├── public/
│   ├── favicon.ico         # 网站图标
│   └── draco/              # Draco 解码器 (用于压缩模型)
│
└── src/
    ├── main.js             # Vue 应用入口
    ├── App.vue             # 根组件
    ├── config.js           # API 配置 (后端地址)
    │
    ├── views/
    │   └── AssetsView.vue  # 资产管理主视图
    │
    ├── components/
    │   ├── Message.vue         # 消息提示组件
    │   └── MessageContainer.vue # 消息容器 (Teleport)
    │
    ├── services/
    │   └── assetService.js # API 服务层 (CRUD 操作)
    │
    └── utils/
        ├── message.js          # 消息通知工具
        └── ThumbnailGenerator.js # 3D 模型缩略图生成器
```

---

## 运行命令

```bash
# 从项目根目录启动
pnpm dev:asset

# 或进入目录启动
cd packages/asset-manager
pnpm dev
```

访问地址: `http://localhost:5175/`

---

## 依赖

| 包 | 用途 |
|----|------|
| vue | 前端框架 |
| pinia | 状态管理 |
| three | 缩略图生成 (WebGL 渲染) |

---

## API 配置

后端 API 地址在 `src/config.js` 中配置：

```javascript
// 开发环境
const BASE_URL = 'http://localhost:3001';

// 生产环境
// const BASE_URL = 'http://pro-server.meteor3d.cn';
```
