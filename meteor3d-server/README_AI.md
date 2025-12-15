# Meteor3D Server 工程说明

本文档旨在帮助 AI 编程助手快速理解 `meteor3d-server` 的工程结构、核心功能及技术栈。

## 1. 项目概述

`meteor3d-server` 是 Meteor3D 低代码 3D 编辑平台的后端服务。它主要负责：
- 3D 场景数据的存储与管理 (CRUD)。
- 3D 资产（模型、纹理、HDRI）的上传、存储与管理。
- **自动化资产处理流水线**：对上传的模型进行格式转换、压缩、优化和多级细节 (LOD) 生成。

## 2. 技术栈

- **Runtime**: Node.js
- **Web Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Queue System**: Bull (基于 Redis)
- **3D Processing**: 
  - `@gltf-transform/*`: glTF 模型处理核心库
  - `draco3dgltf`: Draco 几何压缩
  - `meshoptimizer`: 网格优化
  - `sharp`: 图像/纹理处理
  - `adm-zip`: ZIP 解压
- **External Tools** (需预装):
  - `FBX2glTF`: FBX 转 glTF
  - `toktx` (KTX-Software): 纹理转 KTX2 (可选)
重要！！！：需要支持nodejs版本 16.20.2 & 22.13.0

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
│   │   ├── assetController.js  # 资产上传、查询、状态获取、重新处理
│   │   └── sceneController.js  # 场景 CRUD
│   │
│   ├── models/             # Mongoose 数据模型
│   │   ├── Asset.js        # 资产 Schema (包含处理状态、输出文件路径、统计信息)
│   │   └── Scene.js        # 场景 Schema
│   │
│   ├── routes/             # API 路由定义
│   │   ├── assetRoutes.js  # /api/assets
│   │   └── sceneRoutes.js  # /api/scene
│   │
│   └── pipeline/           # 资产处理流水线核心模块
│       ├── index.js        # 流水线入口，编排处理步骤，队列任务处理器
│       ├── queue.js        # Bull 队列初始化
│       ├── utils/
│       │   └── ioUtils.js  # 共享的 NodeIO 配置 (注册 Draco/Extensions)
│       └── processors/     # 独立的处理步骤
│           ├── zipExtractor.js     # ZIP 解压与主模型查找
│           ├── formatConverter.js  # 格式转换 (FBX/OBJ -> GLB)
│           ├── sanitizer.js        # 模型清洗 (移除相机/空节点)
│           ├── dracoCompressor.js  # Draco 几何压缩
│           ├── textureOptimizer.js # 纹理转 KTX2 及多分辨率生成
│           ├── lodGenerator.js     # LOD (Level of Detail) 生成
│           └── boundsCalculator.js # 边界盒与统计信息计算
└── uploads/                # 静态资源存储 (自动生成)
    ├── raw/                # 原始上传文件
    ├── thumbnails/         # 缩略图
    ├── temp/               # 临时解压目录
    └── processed/          # 处理后的产物
        ├── models/         # 压缩后的 GLB
        ├── lods/           # LOD 版本
        └── textures/       # 优化后的纹理
```

## 4. 核心模块详解

### 4.1 资产处理流水线 (Asset Pipeline)

当用户上传 3D 模型（或 ZIP 包）时，系统会自动触发异步处理任务。

**流程步骤：**

1.  **Upload**: 文件上传至 `uploads/raw` (或 `uploads/models`)，状态标记为 `pending`，加入 Bull 队列。
2.  **Queue Process**: `src/pipeline/index.js` 接收任务。
3.  **Step 0: ZIP Extract**: 如果是 ZIP，解压并自动寻找主模型文件。
    *   **查找优先级**: `.gltf` > `.glb` > `.fbx` > `.obj` > `.stl`
    *   **注意**: ZIP 包内应包含模型引用的所有资源（如 `.bin`, 纹理图片），否则后续转换可能失败。
4.  **Step 1: Convert**: 将非 glTF 格式 (FBX, OBJ) 转换为 GLB。
    *   **FBX**: 使用 `FBX2glTF` (强制 `--binary` 输出单文件)。
    *   **OBJ**: 使用 `obj2gltf`。
5.  **Step 2: Sanitize**: 移除场景中的相机、灯光和无用节点。
6.  **Step 3: Draco**: 应用 Draco 压缩，大幅减小体积。
7.  **Step 4: Texture**: 提取纹理，生成多分辨率 (2k/1k/512) 和 KTX2 格式（如果配置支持）。
    *   **策略**: 纹理独立输出到 `uploads/processed/textures`，**不**直接替换 GLB 内部纹理。
    *   **目的**: 支持前端按需加载（"几何与纹理分离"策略）。
8.  **Step 5: LOD**: 生成 3 个级别的细节模型 (LOD0, LOD1, LOD2)。
    *   **说明**: LOD 模型仅简化网格，内部仍引用原始纹理。前端需配合 Step 4 的输出进行动态材质替换。
9.  **Step 6: Bounds**: 计算模型的 AABB 边界盒、包围球及面数统计。
10. **Finish**: 更新数据库状态为 `ready`，保存所有生成文件的路径和统计信息。
11. **Cleanup**: 清理临时解压目录。

### 4.2 数据模型 (Asset Schema)

`Asset` 模型扩展了以下字段以支持流水线：

- `processingStatus`: `pending` | `processing` | `ready` | `failed` | `skipped`
- `processedFiles`: 存储 `compressed`, `lod0`~`lod2`, `textures` 的路径。
- `bounds`: 预计算的 `box` (min/max) 和 `sphere` (center/radius)。
- `stats`: `triangleCount`, `vertexCount` 等。

## 5. 开发注意事项

- **Redis**: 必须启动 Redis 服务并在 `src/config/redis.js` 中配置正确连接。
- **Draco**: 读取或写入 Draco 压缩模型时，必须使用 `src/pipeline/utils/ioUtils.js` 中的 `createNodeIO`，它已预配置好解码器。
- **临时文件**: 流水线会在 `uploads/temp` 创建临时文件，正常结束后会自动清理，但调试模式下可能保留。
- **扩展性**: 新的处理步骤应作为独立的 processor 添加到 `src/pipeline/processors/` 并在 `index.js` 中注册。
