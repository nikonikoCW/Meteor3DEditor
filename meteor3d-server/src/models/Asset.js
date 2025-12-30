const mongoose = require('mongoose');

/**
 * 资产数据模型
 * 用于存储上传的 3D 模型、贴图等资产的元数据
 */
const AssetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['model', 'texture', 'hdri', 'effect', 'tileset'], // 资产类型 (新增 tileset)
        default: 'model'
    },
    format: {
        type: String,
        required: true // 例如: gltf, glb, jpg, hdr 等
    },
    filePath: {
        type: String,
        required: false // tileset 类型可能没有本地路径（外部 URL 注册）
    },
    fileSize: {
        type: Number,
        required: false // tileset 不记录文件大小
    },
    url: {
        type: String,
        required: false // tileset 使用 tilesetUrl
    },
    thumbnail: {
        type: String // 缩略图 URL（可选）
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed // 额外的元数据
    },

    // ========== 3D Tiles (Tileset) 专用字段 ==========

    // tileset.json 的访问 URL (本地或外部)
    tilesetUrl: {
        type: String // 例如: https://example.com/tileset.json 或 /data/tilesets/xxx/tileset.json
    },

    // ========== 流水线处理相关字段 ==========

    // 处理状态
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'ready', 'failed', 'skipped'],
        default: 'skipped' // 默认跳过，兼容旧数据
    },
    processingError: {
        type: String // 处理失败时的错误信息
    },

    // 处理后的输出文件 (本地相对路径)
    processedFiles: {
        compressed: String,      // 压缩后的 GLB 文件路径
        lod0: String,            // LOD0 高精度
        lod1: String,            // LOD1 中精度
        lod2: String,            // LOD2 低精度
        textures: {
            original: String,
            '2k': String,
            '1k': String,
            '512': String
        }
    },

    // 云端绝对路径 (又拍云 CDN)
    cloudUrls: {
        compressed: String,      // 又拍云 compressed GLB URL
        thumbnail: String,       // 又拍云缩略图 URL
        file: String             // 又拍云原始文件 URL (HDRI/贴图)
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
}, {
    timestamps: true
});

module.exports = mongoose.model('Asset', AssetSchema);
