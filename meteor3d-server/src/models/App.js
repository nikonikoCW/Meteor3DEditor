const mongoose = require('mongoose');

/**
 * 应用数据模型
 * 用于存储 app-editor 创建的低代码应用
 */
const AppSchema = new mongoose.Schema({
    appId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        default: '未命名应用'
    },
    description: {
        type: String,
        default: ''
    },
    thumbnail: String,
    // 画布配置
    canvas: {
        width: {
            type: Number,
            default: 1920
        },
        height: {
            type: Number,
            default: 1080
        },
        background: {
            type: String,
            default: '#1a1a1a'
        }
    },
    // 组件列表
    widgets: [{
        id: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        position: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 }
        },
        size: {
            width: { type: Number, default: 200 },
            height: { type: Number, default: 150 }
        },
        rotation: {
            type: Number,
            default: 0
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        // 组件显隐
        visible: {
            type: Boolean,
            default: true
        },
        // 交互规则列表
        interactions: [{
            event: String,    // 事件名 (如 'click')
            target: String,   // 目标组件 ID
            action: String    // 动作 (show/hide/toggle)
        }]
    }],
    // 最后修改时间
    lastModified: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 保存前更新 lastModified
AppSchema.pre('save', function () {
    this.lastModified = new Date();
});

module.exports = mongoose.model('App', AppSchema);
