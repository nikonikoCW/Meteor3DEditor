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
        enum: ['model', 'texture', 'hdri', 'effect'], // 资产类型
        default: 'model'
    },
    format: {
        type: String,
        required: true // 例如: gltf, glb, jpg, hdr 等
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true // 字节数
    },
    url: {
        type: String,
        required: true // 访问 URL
    },
    thumbnail: {
        type: String // 缩略图 URL（可选）
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed // 额外的元数据
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

    // 处理后的输出文件
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
