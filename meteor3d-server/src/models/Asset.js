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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Asset', AssetSchema);
