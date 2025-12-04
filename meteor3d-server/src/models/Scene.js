const mongoose = require('mongoose');

/**
 * 场景元数据模型
 */
const SceneSchema = new mongoose.Schema({
    sceneId: {
        type: String,
        required: true,
        unique: true,
        default: 'default'
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    thumbnail: String,
    environmentUrl: String, // 新增：环境贴图 URL
    lastModified: {
        type: Date,
        default: Date.now
    },
    objectCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Scene', SceneSchema);
