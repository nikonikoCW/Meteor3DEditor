# 资产处理流水线 - 开发步骤

> 按顺序执行以下步骤，完成资产处理流水线的完整实现

---

## 第一阶段：环境准备

### 步骤 1.1：配置 Redis 连接

在 `meteor3d-server/src/config/` 目录创建 `redis.js`：

```javascript
// meteor3d-server/src/config/redis.js
module.exports = {
    host: '192.168.102.200',
    port: 6779,
    password: 'chenwei'
};
```

> **注意**：请将上述占位符替换为实际的 Redis 连接信息

### 步骤 1.2：安装系统工具

```bash
# 下载 FBX2glTF（FBX 格式转换）
# https://github.com/facebookincubator/FBX2glTF/releases
# 解压后将可执行文件添加到 PATH

# 下载 KTX-Software（纹理转 KTX2）
# https://github.com/KhronosGroup/KTX-Software/releases
# 解压后将 toktx 添加到 PATH
```

### 步骤 1.2：安装 npm 依赖

```bash
cd meteor3d-server

# 核心处理库
npm install @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions

# 压缩与优化
npm install draco3dgltf meshoptimizer sharp

# 任务队列
npm install bull
```

---

## 第二阶段：数据模型扩展

### 步骤 2.1：修改 Asset.js

**文件**：`meteor3d-server/src/models/Asset.js`

在现有 Schema 中新增以下字段：

```javascript
// 处理状态
processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending'
},
processingError: String,

// 处理后的输出文件
processedFiles: {
    compressed: String,
    lod0: String,
    lod1: String,
    lod2: String,
    textures: {
        original: String,
        '2k': String,
        '1k': String,
        '512': String
    }
},

// 预计算边界数据
bounds: {
    box: {
        min: { x: Number, y: Number, z: Number },
        max: { x: Number, y: Number, z: Number }
    },
    sphere: {
        center: { x: Number, y: Number, z: Number },
        radius: Number
    }
},

// 模型统计信息
stats: {
    triangleCount: Number,
    vertexCount: Number,
    materialCount: Number,
    textureCount: Number
}
```

---

## 第三阶段：目录结构创建

### 步骤 3.1：创建上传目录

**文件**：`meteor3d-server/src/config/upload.js`

```javascript
// 新增目录
const uploadDirs = [
    'uploads/raw',           // 原始上传文件
    'uploads/processed/models',  // 压缩后模型
    'uploads/processed/lods',    // LOD 版本
    'uploads/processed/textures', // 优化纹理
    'uploads/thumbnails',    // 缩略图
    'uploads/temp'           // 临时处理目录
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
```

### 步骤 3.2：扩展支持格式

修改 `allowedFormats` 数组：

```javascript
const allowedFormats = [
    '.gltf', '.glb', '.jpg', '.jpeg', '.png', '.hdr', '.exr',
    '.obj', '.fbx', '.stl'  // 新增
];
```

---

## 第四阶段：流水线核心

### 步骤 4.1：创建流水线目录

```bash
mkdir -p meteor3d-server/src/pipeline/processors
mkdir -p meteor3d-server/src/pipeline/utils
```

### 步骤 4.2：创建队列配置

**文件**：`meteor3d-server/src/pipeline/queue.js`

```javascript
const Queue = require('bull');
const redisConfig = require('../config/redis');

const assetQueue = new Queue('asset-processing', {
    redis: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
    }
});

module.exports = assetQueue;
```

### 步骤 4.3：创建流水线入口

**文件**：`meteor3d-server/src/pipeline/index.js`

```javascript
const Asset = require('../models/Asset');
const { convertFormat } = require('./processors/formatConverter');
const { sanitize } = require('./processors/sanitizer');
const { compressDraco } = require('./processors/dracoCompressor');
const { optimizeTextures } = require('./processors/textureOptimizer');
const { generateLODs } = require('./processors/lodGenerator');
const { calculateBounds } = require('./processors/boundsCalculator');
const assetQueue = require('./queue');

// 注册队列处理器
assetQueue.process('process', async (job) => {
    const { assetId } = job.data;
    const asset = await Asset.findById(assetId);
    
    try {
        await Asset.findByIdAndUpdate(assetId, { processingStatus: 'processing' });
        
        const context = { assetId, inputPath: asset.filePath };
        
        context.gltfPath = await convertFormat(context);
        await sanitize(context);
        context.compressedPath = await compressDraco(context);
        context.textures = await optimizeTextures(context);
        context.lods = await generateLODs(context);
        context.bounds = await calculateBounds(context);
        
        await Asset.findByIdAndUpdate(assetId, {
            processingStatus: 'ready',
            processedFiles: {
                compressed: context.compressedPath,
                lod0: context.lods[0],
                lod1: context.lods[1],
                lod2: context.lods[2],
                textures: context.textures
            },
            bounds: context.bounds
        });
    } catch (error) {
        await Asset.findByIdAndUpdate(assetId, {
            processingStatus: 'failed',
            processingError: error.message
        });
        throw error;
    }
});

module.exports = { assetQueue };
```

---

## 第五阶段：处理器实现

### 步骤 5.1：格式转换处理器

**文件**：`meteor3d-server/src/pipeline/processors/formatConverter.js`

```javascript
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const execAsync = promisify(exec);

async function convertFormat(context) {
    const ext = path.extname(context.inputPath).toLowerCase();
    
    if (['.gltf', '.glb'].includes(ext)) {
        return context.inputPath;
    }
    
    const outputPath = context.inputPath.replace(ext, '.glb');
    
    if (ext === '.fbx') {
        await execAsync(`FBX2glTF -i "${context.inputPath}" -o "${outputPath}"`);
    } else if (ext === '.obj') {
        // 使用 gltf-transform 处理 OBJ
        const { NodeIO } = require('@gltf-transform/core');
        // ... 实现 OBJ 转换
    } else if (ext === '.stl') {
        // 使用 gltf-transform 处理 STL
        // ... 实现 STL 转换
    }
    
    return outputPath;
}

module.exports = { convertFormat };
```

### 步骤 5.2：清洗验证处理器

**文件**：`meteor3d-server/src/pipeline/processors/sanitizer.js`

```javascript
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');

async function sanitize(context) {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const document = await io.read(context.gltfPath);
    const root = document.getRoot();
    
    // 移除相机
    root.listCameras().forEach(camera => camera.dispose());
    
    // 移除灯光（需要 KHR_lights_punctual 扩展）
    // ... 
    
    // 移除空节点
    root.listNodes().forEach(node => {
        if (!node.getMesh() && node.listChildren().length === 0) {
            node.dispose();
        }
    });
    
    await io.write(context.gltfPath, document);
}

module.exports = { sanitize };
```

### 步骤 5.3：Draco 压缩处理器

**文件**：`meteor3d-server/src/pipeline/processors/dracoCompressor.js`

```javascript
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { draco } = require('@gltf-transform/functions');
const draco3d = require('draco3dgltf');
const path = require('path');

async function compressDraco(context) {
    const io = new NodeIO()
        .registerExtensions(ALL_EXTENSIONS)
        .registerDependencies({
            'draco3d.decoder': await draco3d.createDecoderModule(),
            'draco3d.encoder': await draco3d.createEncoderModule()
        });
    
    const document = await io.read(context.gltfPath);
    
    await document.transform(
        draco({
            quantizePosition: 14,
            quantizeNormal: 10,
            quantizeTexcoord: 12
        })
    );
    
    const outputPath = context.gltfPath.replace('.glb', '_compressed.glb');
    await io.write(outputPath, document);
    
    return outputPath;
}

module.exports = { compressDraco };
```

### 步骤 5.4：纹理优化处理器

**文件**：`meteor3d-server/src/pipeline/processors/textureOptimizer.js`

```javascript
const sharp = require('sharp');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const execAsync = promisify(exec);

const SIZES = [2048, 1024, 512];

async function optimizeTextures(context) {
    const { NodeIO } = require('@gltf-transform/core');
    const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
    
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const document = await io.read(context.gltfPath);
    
    const results = {};
    const textures = document.getRoot().listTextures();
    
    for (const texture of textures) {
        const image = texture.getImage();
        if (!image) continue;
        
        const texName = texture.getName() || `texture_${textures.indexOf(texture)}`;
        results[texName] = {};
        
        // 保存原始纹理
        const originalPath = path.join('uploads/processed/textures', `${context.assetId}_${texName}.png`);
        fs.writeFileSync(originalPath, Buffer.from(image));
        
        // 生成多分辨率版本
        for (const size of SIZES) {
            const resizedPath = originalPath.replace('.png', `_${size}.png`);
            await sharp(image)
                .resize(size, size, { fit: 'inside' })
                .toFile(resizedPath);
            
            // 转换为 KTX2
            const ktx2Path = resizedPath.replace('.png', '.ktx2');
            await execAsync(`toktx --t2 --encode uastc "${ktx2Path}" "${resizedPath}"`);
            
            results[texName][size] = ktx2Path;
        }
    }
    
    return results;
}

module.exports = { optimizeTextures };
```

### 步骤 5.5：LOD 生成处理器

**文件**：`meteor3d-server/src/pipeline/processors/lodGenerator.js`

```javascript
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { simplify, weld } = require('@gltf-transform/functions');
const { MeshoptSimplifier } = require('meshoptimizer');

const LOD_RATIOS = [1.0, 0.5, 0.25];

async function generateLODs(context) {
    await MeshoptSimplifier.ready;
    
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const lods = [];
    
    for (let i = 0; i < LOD_RATIOS.length; i++) {
        const document = await io.read(context.compressedPath);
        
        if (LOD_RATIOS[i] < 1.0) {
            await document.transform(
                weld(),
                simplify({ simplifier: MeshoptSimplifier, ratio: LOD_RATIOS[i] })
            );
        }
        
        const lodPath = context.compressedPath.replace('.glb', `_LOD${i}.glb`);
        await io.write(lodPath, document);
        lods.push(lodPath);
    }
    
    return lods;
}

module.exports = { generateLODs };
```

### 步骤 5.6：边界盒计算处理器

**文件**：`meteor3d-server/src/pipeline/processors/boundsCalculator.js`

```javascript
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');

async function calculateBounds(context) {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const document = await io.read(context.gltfPath);
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let totalTriangles = 0;
    let totalVertices = 0;
    
    for (const mesh of document.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
            const posAccessor = prim.getAttribute('POSITION');
            if (!posAccessor) continue;
            
            const positions = posAccessor.getArray();
            totalVertices += positions.length / 3;
            
            const indices = prim.getIndices();
            totalTriangles += indices ? indices.getCount() / 3 : positions.length / 9;
            
            for (let i = 0; i < positions.length; i += 3) {
                minX = Math.min(minX, positions[i]);
                maxX = Math.max(maxX, positions[i]);
                minY = Math.min(minY, positions[i + 1]);
                maxY = Math.max(maxY, positions[i + 1]);
                minZ = Math.min(minZ, positions[i + 2]);
                maxZ = Math.max(maxZ, positions[i + 2]);
            }
        }
    }
    
    const center = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        z: (minZ + maxZ) / 2
    };
    
    const radius = Math.sqrt(
        Math.pow(maxX - center.x, 2) +
        Math.pow(maxY - center.y, 2) +
        Math.pow(maxZ - center.z, 2)
    );
    
    return {
        box: {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        },
        sphere: { center, radius },
        stats: {
            triangleCount: totalTriangles,
            vertexCount: totalVertices,
            materialCount: document.getRoot().listMaterials().length,
            textureCount: document.getRoot().listTextures().length
        }
    };
}

module.exports = { calculateBounds };
```

---

## 第六阶段：控制器与路由

### 步骤 6.1：更新 assetController.js

**文件**：`meteor3d-server/src/controllers/assetController.js`

在 `uploadAsset` 函数末尾添加：

```javascript
const { assetQueue } = require('../pipeline');

// 在 asset.save() 之后添加：
await assetQueue.add('process', { assetId: asset._id.toString() });
```

新增处理状态接口：

```javascript
exports.getProcessingStatus = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id)
            .select('processingStatus processingError processedFiles bounds stats');
        
        if (!asset) {
            return res.status(404).json({ success: false, message: '资产不存在' });
        }
        
        res.json({ success: true, ...asset.toObject() });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
```

### 步骤 6.2：更新 assetRoutes.js

**文件**：`meteor3d-server/src/routes/assetRoutes.js`

新增路由：

```javascript
// 获取处理状态
router.get('/:id/status', assetController.getProcessingStatus);
```

### 步骤 6.3：初始化队列

**文件**：`meteor3d-server/app.js`

在路由配置之前添加：

```javascript
// 初始化处理队列
require('./src/pipeline');
```

---

## 第七阶段：前端适配

### 步骤 7.1：更新 assetService.js

**文件**：`packages/asset-manager/src/services/assetService.js`

新增：

```javascript
// 获取处理状态
export async function getProcessingStatus(assetId) {
    const response = await fetch(`${API_BASE}/assets/${assetId}/status`);
    return response.json();
}

// 轮询等待处理完成
export async function waitForProcessing(assetId, interval = 2000, timeout = 300000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
        const check = async () => {
            if (Date.now() - startTime > timeout) {
                reject(new Error('处理超时'));
                return;
            }
            
            try {
                const result = await getProcessingStatus(assetId);
                if (result.processingStatus === 'ready') {
                    resolve(result);
                } else if (result.processingStatus === 'failed') {
                    reject(new Error(result.processingError || '处理失败'));
                } else {
                    setTimeout(check, interval);
                }
            } catch (error) {
                reject(error);
            }
        };
        check();
    });
}
```

### 步骤 7.2：更新 AssetsView.vue

**文件**：`packages/asset-manager/src/views/AssetsView.vue`

1. 在资产列表项中显示处理状态标签
2. 上传完成后轮询等待处理
3. 添加状态筛选下拉框

---

## 第八阶段：测试验证

### 步骤 8.1：基础功能测试

```bash
# 1. 确保 Redis 运行
docker ps | grep redis

# 2. 启动后端
cd meteor3d-server && npm run dev

# 3. 上传测试模型
curl -X POST http://localhost:3001/api/assets/upload \
  -F "file=@test-model.glb"

# 4. 检查处理状态（使用返回的 assetId）
curl http://localhost:3001/api/assets/{assetId}/status

# 5. 查看生成的文件
ls -la uploads/processed/
```

### 步骤 8.2：端到端测试

1. 启动前端：`pnpm dev:asset`
2. 上传一个 GLB 模型
3. 观察处理状态变化
4. 处理完成后检查边界盒数据

---

## 检查清单

- [ ] Redis 已启动
- [ ] npm 依赖已安装
- [ ] Asset.js 已更新
- [ ] 目录结构已创建
- [ ] 队列配置已完成
- [ ] 6 个处理器已实现
- [ ] 控制器已更新
- [ ] 路由已添加
- [ ] 前端 API 已适配
- [ ] 基础测试通过
