# Meteor3D Server 工程说明

本文档旨在帮助 AI 编程助手快速理解 `meteor3d-server` 的工程结构、核心功能及技术栈。

## 1. 项目概述

`meteor3d-server` 是 Meteor3D 低代码 3D 编辑平台的后端服务。它主要负责：
- 3D 场景数据的存储与管理 (CRUD)。
- 3D 资产（模型、纹理、HDRI）的上传、存储与管理。
- **自动化资产处理流水线**：对上传的模型进行格式转换、KTX2 纹理压缩和 Meshopt 几何压缩。
- **缩略图延迟上传**：前端处理完成后上传缩略图。

## 2. 技术栈

- **Runtime**: Node.js
- **Web Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Queue System**: Bull (基于 Redis)
- **3D Processing**: 
  - `@gltf-transform/*`: glTF 模型处理核心库
  - `draco3dgltf`: 历史 Draco 资源解码
  - `meshoptimizer`: 网格优化
  - `sharp`: 图像/纹理处理
  - `adm-zip`: ZIP 解压
- **External Tools** (需预装):
  - `FBX2glTF`: FBX 转 glTF
  - `toktx` (KTX-Software): 有普通图片纹理时必需，安装见 ASSET_PIPELINE.md

> **重要**: 需要支持 Node.js 版本 16.20.2 & 22.13.0

## 3. 工程结构

```
meteor3d-server/
├── app.js                  # 应用入口，Express 配置，中间件，路由注册
├── package.json            # 依赖管理
├── src/
│   ├── config/             # 配置文件
│   │   ├── db.js           # MongoDB 连接
│   │   ├── redis.js        # Redis 连接配置
│   │   └── upload.js       # Multer 上传配置 (目录结构、文件过滤)
│   │
│   ├── controllers/        # 业务逻辑控制器
│   │   ├── assetController.js  # 资产上传、查询、删除、缩略图上传
│   │   └── sceneController.js  # 场景 CRUD、底图生成
│   │
│   ├── models/             # Mongoose 数据模型
│   │   ├── Asset.js        # 资产 Schema (包含处理状态、输出文件路径、统计信息)
│   │   └── Scene.js        # 场景 Schema
│   │
│   ├── routes/             # API 路由定义
│   │   ├── assetRoutes.js  # /api/assets
│   │   └── sceneRoutes.js  # /api/scene
│   │
│   ├── services/           # 业务服务
│   │   └── baseMapGenerator.js # GIS 底图生成服务 (天地图瓦片下载拼接)
│   │
│   └── pipeline/           # 资产处理流水线核心模块
│       ├── index.js        # 流水线入口，编排处理步骤，队列任务处理器
│       ├── queue.js        # Bull 队列初始化
│       ├── utils/
│       │   └── ioUtils.js  # 共享的 NodeIO 配置 (注册 Draco/Meshopt/Extensions)
│       └── processors/     # 独立的处理步骤
│           ├── zipExtractor.js     # ZIP 解压与主模型查找
│           ├── formatConverter.js  # 格式转换 (FBX/OBJ -> GLB)
│           ├── sanitizer.js        # 模型清洗 (移除相机/空节点)
│           ├── meshoptCompressor.js  # Meshopt 缓冲压缩
│           ├── textureOptimizer.js # 纹理编码 KTX2 并嵌入 GLB
│           └── boundsCalculator.js # 边界盒与统计信息计算
└── uploads/                # 静态资源存储 (自动生成)
    ├── models/             # 原始上传文件
    ├── thumbnails/         # 缩略图
    ├── temp/               # 临时解压目录
    └── processed/          # 处理后的产物
        ├── models/         # 压缩后的 GLB
```

## 4. API 接口

### 4.1 资产接口 `/api/assets`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/upload` | 上传资产 (支持 file + thumbnail 字段) |
| GET | `/` | 获取资产列表 (支持 ?type=model 过滤) |
| GET | `/:id` | 获取单个资产详情 |
| DELETE | `/:id` | 删除资产 (同时清理所有关联文件) |
| GET | `/:id/download` | 下载原始资产 |
| GET | `/:id/status` | 获取处理状态和 processedFiles |
| POST | `/:id/reprocess` | 重新处理资产 |
| POST | `/:id/thumbnail` | **上传缩略图** (用于延迟生成) |

### 4.3 场景接口 `/api/scene`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/list` | 获取场景列表 |
| POST | `/create` | 创建新场景 |
| DELETE | `/:id` | 删除场景 |
| POST | `/save` | 保存场景 |
| GET | `/load` | 加载场景 (需 sceneId 参数) |
| DELETE | `/clear` | 清空场景 |
| POST | `/basemap` | **生成 GIS 底图** (天地图瓦片拼接) |

### 4.2 资产删除逻辑

删除资产时会清理以下所有关联文件：
- 原始上传文件 (`filePath`)
- 缩略图 (`thumbnail`)
- 压缩模型 (`processedFiles.compressed`)

## 5. 资产处理流水线

当用户上传 3D 模型（或 ZIP 包）时，系统会自动触发异步处理任务。

**流程步骤：**

1. 上传并加入 Bull 队列。
2. ZIP 解压（按需），并转换为 GLB。
3. 清洗并注入稳定节点身份。
4. 将纹理编码为 KTX2 并嵌入 GLB。
5. 使用 Meshopt 压缩几何与动画等缓冲数据。
6. 计算边界和模型统计，更新状态为 ready。
7. 清理任务临时文件。

KTX2 工具安装、前端解码与回归命令见 [ASSET_PIPELINE.md](ASSET_PIPELINE.md)。

## 6. 数据模型 (Asset Schema)

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | String | 资产名称 |
| `type` | String | 类型: model/texture/hdri |
| `filePath` | String | 原始文件路径 |
| `thumbnail` | String | 缩略图 URL (可为 null) |
| `processingStatus` | String | pending/processing/ready/failed/skipped |
| `processedFiles.compressed` | String | 压缩后 GLB 路径 |
| `bounds` | Object | box (min/max) 和 sphere (center/radius) |
| `stats` | Object | triangleCount, vertexCount 等 |

## 7. 开发注意事项

- **Redis**: 必须启动 Redis 服务并在 `src/config/redis.js` 中配置正确连接。
- **Draco**: 读取或写入 Draco 压缩模型时，必须使用 `src/pipeline/utils/ioUtils.js` 中的 `createNodeIO`。
- **临时文件**: 流水线会在 `uploads/temp` 创建临时文件，正常结束后会自动清理。
- **扩展性**: 新的处理步骤应作为独立的 processor 添加到 `src/pipeline/processors/` 并在 `index.js` 中注册。
