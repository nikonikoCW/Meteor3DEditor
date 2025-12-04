const mongoose = require('mongoose');

/**
 * 场景对象数据模型
 * 对应前端的 serializeObject 结构
 */
const SceneObjectSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    sceneId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true
    },
    name: String,
    visible: {
        type: Boolean,
        default: true
    },
    position: {
        x: Number,
        y: Number,
        z: Number
    },
    rotation: {
        x: Number,
        y: Number,
        z: Number
    },
    scale: {
        x: Number,
        y: Number,
        z: Number
    },
    // 对于 GLTF 模型
    url: String,
    modifications: mongoose.Schema.Types.Mixed,
    // 对于基础几何体
    geometry: {
        type: mongoose.Schema.Types.Mixed
    },
    material: {
        color: Number,
        roughness: Number,
        metalness: Number,
        blending: Number,
        side: Number,
        transparent: Boolean,
        depthTest: Boolean,
        depthWrite: Boolean,
        vertexColors: Boolean
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SceneObject', SceneObjectSchema);
