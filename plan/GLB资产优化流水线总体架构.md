# Meteor3D GLB 资产优化流水线总体架构

> 文档状态：架构方案记录，尚未表示全部实现完成  
> 记录日期：2026-07-31  
> 适用范围：`meteor3d-server`、`asset-manager`、`scene-editor`、`scene-editor-webgpu`

## 1. 背景

当前 Meteor3D 已具备 GLB 上传、Bull 队列处理、节点身份注入、Draco 压缩、纹理派生、LOD 生成、边界统计、缩略图和上云能力。

现有实现存在以下主要问题：

1. 直接上传的 GLB 会被清洗器和节点身份处理器原地改写，原始文件不是不可变备份。
2. 未检测源模型是否已经使用 Draco，重复压缩可能没有收益甚至增大文件。
3. `uploads/processed/textures` 中生成的多分辨率贴图没有重新写回 GLB，运行时不会使用。
4. LOD 虽然被生成，但编辑器目前默认只加载 `processedFiles.compressed`，没有真正进行动态 LOD 切换。
5. `compressed.glb` 与 `lod0.glb` 的职责重复。
6. 处理器存在失败降级，最终 `ready` 不一定意味着每项优化都成功。
7. 大型园区模型仍以单个 GLB 加载，三角面、Primitive、材质和 GPU 内存压力较大。
8. 节点 `assetNodeId`/BID 持久化必须贯穿清洗、LOD、纹理处理、压缩、重新处理和版本发布。

本方案定义目标架构、正式产物、中间文件、身份数据、处理顺序、发布规则、删除规则以及分阶段落地计划。

节点 BID 的详细语义继续以 [GLB节点BID持久化架构设计.md](./GLB节点BID持久化架构设计.md) 为准；本文重点描述它如何参与资产优化流水线。

---

## 2. 核心目标

用户上传一个原始 GLB 后，系统最终形成以下正式资产：

```text
assets/<assetId>/<assetVersionId>/
├── source/
│   └── original.glb
├── identity/
│   └── identity.glb
├── runtime/
│   ├── lod0.glb
│   ├── lod1.glb
│   └── lod2.glb
├── preview/
│   └── thumbnail.webp
└── manifest.json
```

各文件职责：

| 文件 | 是否长期保留 | 用途 |
|---|---|---|
| `original.glb` | 是 | 用户上传的不可变原始备份 |
| `identity.glb` | 是 | 已完成清洗并绑定稳定 `assetNodeId` 的内部身份基线 |
| `lod0.glb` | 是 | 近距离运行时模型 |
| `lod1.glb` | 是 | 中距离运行时模型 |
| `lod2.glb` | 是 | 远距离/首屏运行时模型 |
| `thumbnail.webp` | 是 | 资产管理器预览 |
| `manifest.json` | 是 | 身份映射、产物信息、统计、Hash 和质量报告 |
| 512/1K/2K 中间贴图 | 否 | 仅用于生成对应 LOD，写回 GLB 后删除 |
| 未压缩 LOD、中间 GLB | 否 | 仅用于处理，发布后删除 |
| 解压目录和验证缓存 | 否 | 任务完成或失败后清理 |

对于普通模型，最终不再单独保留 `compressed.glb`。完整精度、已完成纹理优化和最终几何压缩的 `lod0.glb` 就是它的替代品。

---

## 3. 不可破坏的架构约束

### 3.1 原始文件不可变

`original.glb` 上传完成后禁止原地写入。所有清洗、身份注入和优化都在任务临时目录完成。

### 3.2 节点身份必须稳定

同一个资产版本重新处理时：

- 不能重新随机生成全部 `assetNodeId`。
- `lod0`、`lod1`、`lod2` 中对应节点必须携带相同的 `meteorAssetNodeId`。
- 节点名称可以变化，但身份 ID 不能因为普通重新处理而变化。
- 业务 BID 必须能通过 Manifest 或节点 extras 重新关联。

### 3.3 LOD 只简化几何，不改变业务身份

- 不允许跨不同 `assetNodeId` 合并 Mesh。
- 不允许删除仍有 BID、业务属性或场景引用的节点。
- 可以简化某个节点内部的几何。
- 如果低 LOD 必须合并节点，Manifest 必须保存多对一映射，且运行时拾取逻辑必须支持该映射。

### 3.4 纹理优化必须进入最终 GLB

生成 512、1K、2K 图片本身不算完成。只有对应纹理已经通过 `setImage()`、`setMimeType()` 等方式写回 LOD，并且最终 GLB 验证通过，纹理优化才算成功。

### 3.5 最终压缩必须放在最后

LOD 简化和纹理替换完成后，再执行 Draco 或 Meshopt。不得无条件重复压缩已经压缩的模型。

### 3.6 发布必须是原子的

流水线不能边处理边覆盖当前线上版本。所有产物先写入任务目录，全部验证通过后一次性发布并切换数据库版本。

---

## 4. 身份模型

### 4.1 资产级 ID

| 字段 | 含义 |
|---|---|
| `Asset._id` | 整个资产的数据库主键 |
| `assetVersionId` | 当前资产处理版本 |
| `sourceHash` | 原始文件内容 Hash，用于去重和完整性校验 |

### 4.2 节点级 ID

| 字段 | 含义 |
|---|---|
| `meteorAssetNodeId` | 资产内部节点的稳定身份 |
| `bid` | 场景或业务层面的持久化业务 ID |
| `instanceBid` | 同一个资产被多次拖入场景时的实例身份 |

最终 GLB 节点应保留：

```json
{
  "extras": {
    "meteorAssetNodeId": "an_48b63a...",
    "bid": "business_bid_if_needed"
  }
}
```

### 4.3 Identity Baseline

第一次上传时：

1. 从 `original.glb` 复制到任务目录。
2. 完成必要清洗。
3. 为节点绑定 `meteorAssetNodeId`。
4. 生成 `nodeManifest`。
5. 发布为 `identity.glb`。

同一个资产版本重新处理时，必须从 `identity.glb` 开始，或者从数据库 Manifest 向 Canonical GLB 重新应用原有身份，不能直接从没有身份信息的原始 GLB 随机生成新 ID。

### 4.4 Manifest 示例

```json
{
  "assetId": "6a6c43fdf193ff3bf00b7385",
  "assetVersionId": "version-uuid",
  "sourceHash": "sha256...",
  "nodes": {
    "an_48b63a": {
      "name": "主水泵",
      "bid": "pump-001",
      "hasMesh": true,
      "lods": {
        "lod0": { "nodeIndex": 120, "present": true },
        "lod1": { "nodeIndex": 116, "present": true },
        "lod2": { "nodeIndex": 98, "present": true }
      }
    }
  },
  "artifacts": {
    "lod0": {
      "path": "runtime/lod0.glb",
      "size": 123456,
      "sha256": "...",
      "triangleCount": 1000000
    }
  }
}
```

---

## 5. 目标处理流程

```text
上传 original.glb
    ↓
文件安全检查、Hash 和模型分析
    ↓
生成 Canonical GLB
    ↓
清洗模型结构
    ↓
绑定或恢复稳定 assetNodeId
    ↓
发布/更新 Identity Baseline
    ↓
结构与几何优化
    ↓
大型模型判断：普通 LOD 或空间分块
    ↓
从同一个身份基线生成 LOD0 / LOD1 / LOD2
    ↓
分别生成 2K / 1K / 512 等中间纹理
    ↓
将优化纹理写回对应 LOD
    ↓
对三个最终 LOD 执行 Draco/Meshopt
    ↓
完整性、身份、质量和体积验证
    ↓
生成缩略图与 Manifest
    ↓
原子发布，数据库切换到新版本
    ↓
删除全部任务临时文件
```

### 5.1 Stage 0：上传与安全检查

执行：

- 保存不可变原文件。
- 计算 SHA-256。
- 校验 GLB Header、JSON Chunk 和 Buffer Chunk。
- 校验文件大小、格式和 MIME。
- ZIP 输入需要防止路径穿越和压缩炸弹。
- 创建资产记录和任务记录。

状态：

```text
uploaded → queued
```

### 5.2 Stage 1：分析

在重处理前收集：

- 节点、Mesh、Primitive 数量。
- 三角面、顶点数量。
- 材质、纹理数量和纹理尺寸。
- 动画、骨骼、Morph Target。
- 已使用扩展。
- 是否已经 Draco/Meshopt/KTX2。
- 坐标范围、模型单位、Up Axis。
- 空节点、无效索引、NaN、Infinity。

分析结果决定后续策略，禁止所有资产无条件使用同一套转换参数。

### 5.3 Stage 2：Canonical 和清洗

执行：

- 非 GLB 输入统一转换为 GLB。
- 移除明确无用的相机、灯光和孤立节点。
- 修复非法名称和资源引用。
- 统一坐标和单位策略。
- 保留骨骼、动画、BID 和业务属性所依赖的节点。

输出：

```text
temp/<jobId>/canonical.glb
temp/<jobId>/sanitized.glb
```

### 5.4 Stage 3：身份绑定

执行：

- 首次处理：生成稳定 `meteorAssetNodeId`。
- 重新处理：优先恢复已有 `assetNodeId`。
- 生成 Node Manifest。
- 验证节点 ID 唯一。

输出：

```text
temp/<jobId>/identity.glb
temp/<jobId>/node-manifest.json
```

`identity.glb` 和 Node Manifest 在发布后转为正式内部产物。

### 5.5 Stage 4：结构和几何优化

可执行：

- `prune`：删除未引用资源。
- `dedup`：去重 Accessor、材质、纹理。
- `weld`：焊接重复顶点。
- 优化顶点缓存和索引顺序。
- 合并同一 `assetNodeId` 内、相同材质的小 Primitive。
- 重复对象转换为 GPU Instancing。
- 在安全条件下量化 Position、Normal、UV。
- 必要时重建法线和切线。

约束：

- 不跨业务节点合并。
- 不以减少文件体积为由破坏节点身份。
- 所有结构变换都必须更新 Manifest。

### 5.6 Stage 5：大型模型决策

普通模型生成三个单体 LOD。

当模型超过策略阈值时，应进入空间分块：

- 按建筑、楼层、区域或空间网格分块。
- 每个块独立生成 LOD。
- 输出 Tile Manifest 或 3D Tiles。
- 运行时基于可见性和屏幕空间误差加载。

建议判断指标：

- 三角面数量。
- Primitive/Draw Call 数量。
- 材质数量。
- 节点数量。
- 估算 GPU 内存。
- 空间范围。

### 5.7 Stage 6：LOD 生成

LOD 必须从未进行最终压缩的身份基线生成。

建议初始策略：

| LOD | 几何目标 | 纹理目标 | 用途 |
|---|---:|---:|---|
| LOD0 | 100% 或轻度优化 | 最大 2K/4K | 近距离 |
| LOD1 | 40%～60% | 最大 1K/2K | 中距离 |
| LOD2 | 10%～25% | 最大 512/1K | 远距离和首屏 |

`ratio` 只是目标，必须记录实际结果：

```json
{
  "requestedRatio": 0.25,
  "actualRatio": 0.45,
  "errorLimitReached": true
}
```

发布前必须验证：

- `LOD0 triangles >= LOD1 triangles >= LOD2 triangles`。
- 必需的 `assetNodeId` 仍然存在。
- 材质没有错绑。
- Bounds 没有明显漂移。

### 5.8 Stage 7：纹理优化

对每级 LOD 使用不同纹理策略：

- BaseColor、Emissive 按 sRGB 处理。
- Normal、Metalness、Roughness、AO 按 Linear 处理。
- 可将 AO、Roughness、Metalness 合并为 ORM。
- 颜色贴图优先考虑 KTX2 ETC1S。
- 法线和高质量数据贴图优先考虑 KTX2 UASTC。
- 禁止把 JPEG/WebP 无意义转换成更大的 PNG 作为最终纹理。

处理中允许产生：

```text
temp/<jobId>/textures/lod0/2k/*
temp/<jobId>/textures/lod1/1k/*
temp/<jobId>/textures/lod2/512/*
```

但这些图片必须写回相应 GLB。写回并验证完成后，中间图片全部删除。

### 5.9 Stage 8：最终几何压缩

短期可继续使用 Draco，长期可评估 Meshopt。

处理规则：

1. 检查目标模型是否已经压缩。
2. 避免对已压缩 Primitive 重复压缩。
3. 压缩三个最终 LOD。
4. 比较压缩前后大小。
5. 如果产物更大、无法读取或部分 Primitive 压缩失败，则回退未压缩产物或标记警告。

不得只因为处理器没有抛异常就记录为“压缩成功”。

### 5.10 Stage 9：验证、缩略图和统计

最终 GLB 必须重新读取并验证：

- Buffer、Accessor、Texture 和 Material 引用完整。
- 无 NaN、Infinity 和越界索引。
- 所需扩展有对应解码器。
- `assetNodeId` 唯一且符合 Manifest。
- 三个 LOD 的节点身份映射有效。
- 实际三角面和文件大小符合预期。
- 自动渲染结果不是空白或全黑。

生成：

- Bounds。
- 三角面、顶点、材质和纹理统计。
- 文件大小、Hash。
- `thumbnail.webp`。
- `manifest.json`。

### 5.11 Stage 10：原子发布

所有任务先写入：

```text
uploads/temp/<jobId>/
```

验证通过后发布到新的版本目录，再通过一次数据库更新切换当前版本：

```text
processing → validating → publishing → ready
```

发布失败时：

- 当前线上版本保持不变。
- 新版本标记失败。
- 清理任务目录。
- 保存错误和阶段日志。

---

## 6. 状态与任务模型

建议将单一 `processingStatus` 扩展为总状态和分阶段状态：

```json
{
  "processingStatus": "processing",
  "processingStages": {
    "analyze":   { "status": "ready", "durationMs": 1200 },
    "sanitize":  { "status": "ready", "durationMs": 800 },
    "identity":  { "status": "ready", "durationMs": 500 },
    "geometry":  { "status": "processing" },
    "lod":       { "status": "pending" },
    "texture":   { "status": "pending" },
    "compress":  { "status": "pending" },
    "validate":  { "status": "pending" },
    "publish":   { "status": "pending" }
  }
}
```

建议总状态：

| 状态 | 含义 |
|---|---|
| `pending` | 已入队 |
| `processing` | 正在处理 |
| `validating` | 正在验证最终产物 |
| `publishing` | 正在原子发布 |
| `ready` | 所有关键产物有效 |
| `ready_with_warnings` | 可使用，但存在非关键降级 |
| `failed` | 关键阶段失败 |
| `cancelled` | 被删除或人工取消 |

---

## 7. 建议的数据结构

```js
{
  _id: ObjectId,
  name: String,
  originalName: String,
  type: 'model',
  format: 'glb',

  assetVersionId: String,
  sourceHash: String,

  sourceFile: {
    path: String,
    size: Number,
    sha256: String
  },

  identityFile: {
    path: String,
    size: Number,
    sha256: String
  },

  artifacts: {
    lod0: {
      path: String,
      size: Number,
      sha256: String,
      triangleCount: Number,
      textureProfile: String,
      compression: String
    },
    lod1: Object,
    lod2: Object,
    thumbnail: Object,
    manifest: Object
  },

  nodeManifest: Mixed,
  bounds: Mixed,
  stats: Mixed,
  processingStatus: String,
  processingStages: Mixed,
  processingWarnings: [String],
  processingError: String
}
```

兼容期内可以保留旧字段：

```js
processedFiles.compressed
processedFiles.lod0
processedFiles.lod1
processedFiles.lod2
```

但新代码应逐步迁移到 `artifacts`。

---

## 8. 运行时加载架构

### 8.1 资产管理器

- 列表使用 `thumbnail.webp`。
- 展示处理阶段、警告、三角面和最终大小。
- 预览默认加载 LOD2，用户打开详情后再升级到 LOD1/LOD0。

### 8.2 场景编辑器

首次拖入：

1. 写入 `assetId`、`assetVersionId`、`instanceBid`。
2. 优先加载 LOD2。
3. 根据距离和屏幕占用升级到 LOD1/LOD0。
4. 离开后释放高精度资源。

### 8.3 节点和 BID

- 运行时通过 `meteorAssetNodeId` 找到资产节点。
- 通过 `instanceBid + assetNodeId` 区分不同资产实例中的同源节点。
- 场景保存的是业务修改和身份映射，不复制整份 GLB 数据。
- 切换 LOD 时，业务选择、高亮、显隐和属性绑定不能丢失。

### 8.4 加载器能力

如果采用 KTX2：

- Three.js 配置 `KTX2Loader`。
- 配置转码器路径。
- 根据客户端 GPU 能力选择目标格式。

如果采用 Meshopt：

- 配置 `MeshoptDecoder`。

如果继续使用 Draco：

- 保留 `DRACOLoader`。

---

## 9. 重新处理和版本策略

重新处理分为两类：

### 9.1 同源重新处理

仅调整优化参数：

- 保持 `assetVersionId` 或创建处理修订号。
- 必须复用既有 `assetNodeId`。
- 从 `identity.glb` 开始。
- 新产物验证通过后替换当前运行时版本。

### 9.2 上传新的源文件

源模型内容变化：

- 创建新的 `assetVersionId`。
- 尝试根据旧 Manifest 匹配节点身份。
- 可匹配节点继承原 `assetNodeId`。
- 新节点生成新 ID。
- 删除节点记录为失效节点，不立即复用其 ID。
- 输出版本迁移报告。

---

## 10. 删除和清理策略

### 10.1 删除正式资产

删除资产时应：

1. 取消或标记取消 Bull 任务。
2. 等待处理器停止写入。
3. 删除本地资产版本目录。
4. 删除云端对应版本目录。
5. 清理旧格式遗留文件。
6. 处理或提示场景中的资产引用。
7. 最后删除数据库记录。

新目录结构下应优先按经过校验的资产版本目录整体删除，不再依赖数据库逐个记录成千上万张纹理路径。

### 10.2 临时目录

以下情况都必须清理 `uploads/temp/<jobId>`：

- 成功发布。
- 处理失败。
- 用户取消。
- 资产被删除。
- 服务启动时发现超时孤儿任务。

### 10.3 定期孤儿扫描

后台维护任务定期比较：

- 数据库资产版本。
- 本地资产目录。
- 云端资产目录。
- Bull 活跃任务。

孤儿文件先进入隔离区或生成报告，再执行最终删除。

---

## 11. 大型模型扩展

三个单体 LOD 是普通 GLB 资产的标准产物，但不是超大型场景的最终上限。

当模型达到大型场景阈值时，目标产物可扩展为：

```text
runtime/
├── tileset.json
├── tiles/
│   ├── tile_0_lod0.glb
│   ├── tile_0_lod1.glb
│   ├── tile_0_lod2.glb
│   └── ...
└── shared/
```

身份 Manifest 仍然是统一入口：

```text
assetNodeId → tileId → lod → node/feature
```

空间分块不能破坏 BID 语义。

---

## 12. 当前实现到目标架构的差距

| 能力 | 当前状态 | 目标状态 |
|---|---|---|
| 原始文件 | 会被部分处理器原地改写 | 永久不可变 |
| 节点身份 | 已有 `meteorAssetNodeId` 和 Manifest | 增加身份基线和重处理复用 |
| Draco | 无条件尝试 | 先检测、压缩变大自动回退 |
| 纹理 | 生成旁路 PNG | KTX2/WebP 写回对应 LOD |
| LOD | 已生成三个文件 | 达标验证并被运行时真实切换 |
| compressed | 单独正式产物 | 由 LOD0 取代 |
| 发布 | 逐步写入固定目录 | 版本目录原子发布 |
| 状态 | 单一状态 | 分阶段状态和警告 |
| 删除 | 按文件路径删除 | 取消任务后按版本目录删除 |
| 大型模型 | 单体 GLB | 分块/3D Tiles/流式加载 |

---

## 13. 分阶段实施计划

### Phase 1：保证结果真实有效

- [ ] 原始 GLB 改为不可变。
- [ ] 建立任务临时目录。
- [ ] 持久化 `identity.glb` 和 Node Manifest。
- [ ] 重新处理复用原 `assetNodeId`。
- [ ] 检测已有 Draco/Meshopt。
- [ ] 压缩产物变大时自动回退。
- [ ] 增加最终 GLB 可读性和身份验证。
- [ ] 增加 `ready_with_warnings`。
- [ ] 停止生成不会写回 GLB 的无效正式贴图。

### Phase 2：纹理和 LOD 真正进入运行时

- [ ] 接入 KTX2 编码工具。
- [ ] 按 LOD 生成不同纹理规格。
- [ ] 将纹理写回相应 LOD。
- [ ] 配置 Three.js `KTX2Loader`。
- [ ] 用 LOD0 取代独立 `compressed.glb`。
- [ ] 实现场景编辑器 LOD2 → LOD1 → LOD0 动态切换。
- [ ] 验证切换 LOD 时 BID、显隐、高亮和属性保持一致。

### Phase 3：版本化和原子发布

- [ ] 按 `assetId/assetVersionId` 存储。
- [ ] 建立 Artifact Manifest。
- [ ] 实现新版本原子发布。
- [ ] 保留当前可用版本直到新版本验证成功。
- [ ] 上云改为上传正式 Artifact。
- [ ] 删除改为按版本目录执行。
- [ ] 增加任务取消和孤儿扫描。

### Phase 4：超大型模型

- [ ] 建立大型模型判定阈值。
- [ ] 材质去重和受身份约束的合批。
- [ ] GPU Instancing。
- [ ] 空间分块。
- [ ] 3D Tiles 或自定义 Tile Manifest。
- [ ] 基于屏幕空间误差的流式加载。

---

## 14. 验收标准

一个普通 GLB 资产只有满足以下条件才允许标记 `ready`：

1. `original.glb` 与上传完成时 Hash 一致。
2. `identity.glb` 可读取，节点 ID 唯一。
3. LOD0、LOD1、LOD2 都可读取。
4. 三个 LOD 的必要 `assetNodeId` 与 Manifest 一致。
5. LOD 三角面逐级下降。
6. 每个 LOD 的纹理已经真实写入该 GLB。
7. 压缩后的文件未发生无解释的体积增长。
8. 自动预览可以正常渲染。
9. Manifest 中的大小、Hash、三角面和 Bounds 与实际文件一致。
10. 正式产物发布完成后，任务临时文件已清理。
11. 场景编辑器能够加载三个 LOD，并在切换时保持 BID 相关状态。
12. 删除资产后，本地、云端、临时目录和数据库不存在关联残留。

---

## 15. 已确认的架构决策

1. 用户输入是一个原始 GLB。
2. 普通模型最终运行时产物是三个 LOD GLB。
3. 512、1K、2K 贴图是处理过程中的中间文件，不应作为无引用文件长期保留。
4. 中间 Canonical、未压缩 LOD 和压缩过渡文件属于临时文件。
5. `original.glb` 必须永久保持不变。
6. 为保证 BID 持久化，`identity.glb` 和身份 Manifest 属于正式内部产物，不能当作普通临时文件删除。
7. `lod0.glb` 取代当前重复的 `compressed.glb`。
8. 每个最终 LOD 必须包含自己的有效材质贴图和稳定节点身份。
9. LOD、纹理和压缩只有被运行时实际使用才算完成。
10. 超大型模型在三个 LOD 之外还需要空间分块或 3D Tiles。

---

## 16. 待进一步确定

- Draco 与 Meshopt 的长期选择。
- KTX2 编码工具和服务器部署方式。
- Identity Baseline 是保留完整 `identity.glb`，还是采用 Canonical GLB + Manifest 重绑定。
- 新源文件版本间节点自动匹配的可信度阈值。
- LOD 切换距离、屏幕误差和内存预算。
- 普通模型与大型模型的判定阈值。
- 云端是否保留原始文件和身份基线，还是仅保存运行时 Artifact。
- 动画、骨骼和 Morph Target 模型的独立处理策略。

