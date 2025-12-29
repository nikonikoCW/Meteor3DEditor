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
    environmentUrl: String, // 环境贴图 URL (本地相对路径)

    // 云端绝对路径 (又拍云 CDN)
    cloudUrls: {
        environment: String,    // 又拍云环境贴图 URL
        baseMap: String         // 又拍云底图 URL
    },

    // GIS 配置
    gisConfig: {
        enable: {
            type: Boolean,
            default: true
        },
        center: {
            lng: Number,
            lat: Number
        },
        size: Number, // 选框边长（米）
        bounds: {
            maxLat: Number,
            minLat: Number,
            maxLng: Number,
            minLng: Number
        },
        // 兼容旧版
        range: {
            length: Number,
            width: Number
        },
        projection: String,
        gridVisible: {
            type: Boolean,
            default: false
        },
        baseMapUrl: String, // 底图 URL
        showBaseMap: {
            type: Boolean,
            default: false
        }
    },
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
