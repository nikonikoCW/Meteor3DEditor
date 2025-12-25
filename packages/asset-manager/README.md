# @meteor3d/asset-manager

Meteor3D 资产管理系统 - 独立的 3D 资产管理应用。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **资产上传** | 支持 GLTF/GLB 模型、ZIP 模型包、贴图、HDRI 环境贴图 |
| **缩略图生成** | GLB 上传时立即生成，ZIP 包处理完成后延迟生成 |
| **缩略图补全** | 页面加载时自动检测并生成缺失的缩略图 |
| **资产分类** | 按类型筛选 (全部/模型/贴图/HDRI) |
| **资产下载** | 一键下载原始资产文件 |
| **资产删除** | 删除资产及其所有关联文件 |
| **分页列表** | 支持每页 5/10/20/30 条，上一页/下一页导航 |

---

## 支持的文件格式

| 类型 | 格式 |
|------|------|
| 模型 | `.glb`, `.gltf.zip`, `.fbx.zip`, `.obj.zip` (支持 Draco 压缩) |
| 贴图 | `.jpg`, `.jpeg`, `.png` |
| 环境贴图 | `.hdr`, `.exr` |

---

## 缩略图生成机制

```
用户上传 GLB ──────────────────────────> 前端立即生成缩略图 ──> 随文件一起上传

用户上传 ZIP ──> 后端转换为 GLB ──> 处理完成 (ready) ──> 前端从 LOD2 生成缩略图 ──> 上传更新

页面加载 ──> 检测 thumbnail=null 的模型 ──> 静默逐个生成并上传
```

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
    │   └── assetService.js # API 服务层
    │
    └── utils/
        ├── message.js          # 消息通知工具
        └── ThumbnailGenerator.js # 3D 模型缩略图生成器
```

---

## API 服务 (assetService.js)

| 函数 | 说明 |
|------|------|
| `uploadAsset(file, thumbnail)` | 上传资产 |
| `getAssets(type, page, pageSize)` | 获取资产列表 (支持分页) |
| `deleteAsset(id)` | 删除资产 |
| `downloadAsset(id, filename)` | 下载资产 |
| `getProcessingStatus(id)` | 获取处理状态 |
| `waitForProcessing(id)` | 轮询等待处理完成 |
| `reprocessAsset(id)` | 重新处理 |
| `uploadThumbnail(id, blob)` | **上传缩略图** (延迟生成) |
| `getAssetsWithoutThumbnail()` | **获取缺少缩略图的模型** |

---

## ThumbnailGenerator.js

| 方法 | 说明 |
|------|------|
| `generate(file)` | 从 File 对象生成缩略图 (用于 GLB 上传) |
| `generateFromUrl(url)` | **从 URL 生成缩略图** (用于处理完成后的延迟生成) |
| `dispose()` | 清理 WebGL 资源 |

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
// 通过环境变量配置
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const API_BASE_URL = `${BASE_URL}/api`;
export const ASSET_BASE_URL = BASE_URL;
```
