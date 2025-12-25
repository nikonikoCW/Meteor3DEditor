const App = require('../models/App');
const mongoose = require('mongoose');

/**
 * 获取应用列表（支持分页）
 */
exports.getAppList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const skip = (page - 1) * pageSize;

        // 获取总数
        const total = await App.countDocuments();

        const apps = await App.find({}, {
            appId: 1,
            name: 1,
            description: 1,
            thumbnail: 1,
            lastModified: 1,
            'canvas.width': 1,
            'canvas.height': 1
        }).sort({ lastModified: -1 })
            .skip(skip)
            .limit(pageSize);

        res.json({
            success: true,
            apps,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        console.error('获取应用列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取应用列表失败'
        });
    }
};

/**
 * 获取应用详情
 */
exports.getApp = async (req, res) => {
    try {
        const { id } = req.params;
        const app = await App.findOne({ appId: id });

        if (!app) {
            return res.status(404).json({
                success: false,
                error: '应用不存在'
            });
        }

        res.json({
            success: true,
            app
        });
    } catch (error) {
        console.error('获取应用详情失败:', error);
        res.status(500).json({
            success: false,
            error: '获取应用详情失败'
        });
    }
};

/**
 * 创建应用
 */
exports.createApp = async (req, res) => {
    try {
        const { name, description, canvas, widgets } = req.body;

        // 使用 mongoose ObjectId 生成唯一 ID
        const appId = new mongoose.Types.ObjectId().toString();

        const app = new App({
            appId,
            name: name || '未命名应用',
            description: description || '',
            canvas: canvas || { width: 1920, height: 1080, background: '#1a1a1a' },
            widgets: widgets || []
        });

        await app.save();

        res.json({
            success: true,
            appId: app.appId,
            app
        });
    } catch (error) {
        console.error('创建应用失败:', error.message);
        console.error('错误详情:', error);
        res.status(500).json({
            success: false,
            error: '创建应用失败: ' + error.message
        });
    }
};

/**
 * 更新应用 (全量保存)
 */
exports.updateApp = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, canvas, widgets } = req.body;

        const app = await App.findOneAndUpdate(
            { appId: id },
            {
                $set: {
                    name,
                    description,
                    canvas,
                    widgets,
                    lastModified: new Date()
                }
            },
            { new: true }
        );

        if (!app) {
            return res.status(404).json({
                success: false,
                error: '应用不存在'
            });
        }

        res.json({
            success: true,
            app
        });
    } catch (error) {
        console.error('更新应用失败:', error.message);
        res.status(500).json({
            success: false,
            error: '更新应用失败: ' + error.message
        });
    }
};

/**
 * 删除应用
 */
exports.deleteApp = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await App.findOneAndDelete({ appId: id });

        if (!result) {
            return res.status(404).json({
                success: false,
                error: '应用不存在'
            });
        }

        res.json({
            success: true,
            message: '应用已删除'
        });
    } catch (error) {
        console.error('删除应用失败:', error.message);
        res.status(500).json({
            success: false,
            error: '删除应用失败: ' + error.message
        });
    }
};
