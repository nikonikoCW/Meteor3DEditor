const mongoose = require('mongoose');

const AnimationConfigSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: false
    },
    playing: {
        type: Boolean,
        default: false
    },
    clipIndex: {
        type: Number,
        min: 0,
        default: 0,
        validate: {
            validator: Number.isInteger,
            message: 'clipIndex 必须是整数'
        }
    },
    clipName: {
        type: String,
        default: ''
    },
    speed: {
        type: Number,
        min: 0.1,
        max: 3,
        default: 1
    },
    loop: {
        type: String,
        enum: ['repeat'],
        default: 'repeat'
    }
}, {
    _id: false
});

/**
 * 场景对象数据模型
 * 对应前端的 serializeObject 结构
 */
const SceneObjectSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    bid: {
        type: String,
        index: true
    },
    assetId: String,
    assetVersionId: String,
    nodeBindings: mongoose.Schema.Types.Mixed,
    animation: {
        type: AnimationConfigSchema,
        default: undefined
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

SceneObjectSchema.index({ sceneId: 1, bid: 1 }, { unique: true, sparse: true });
SceneObjectSchema.index({ sceneId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('SceneObject', SceneObjectSchema);
