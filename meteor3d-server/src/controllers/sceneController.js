const SceneObject = require('../models/SceneObject');
const Scene = require('../models/Scene');
const { v4: uuidv4 } = require('uuid');

/**
 * 获取场景列表
 */
exports.getScenes = async (req, res) => {
    try {
        const scenes = await Scene.find().sort({ lastModified: -1 });
        res.status(200).json({
            success: true,
            scenes: scenes
        });
    } catch (error) {
        console.error('获取场景列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取场景列表失败',
            error: error.message
        });
    }
};

/**
 * 创建新场景
 */
exports.createScene = async (req, res) => {
    try {
        const { name, description } = req.body;

        const scene = new Scene({
            sceneId: uuidv4(),
            name: name || '未命名场景',
            description: description || '',
            objectCount: 0
        });

        await scene.save();

        res.status(201).json({
            success: true,
            message: '场景创建成功',
            scene: scene
        });
    } catch (error) {
        console.error('创建场景失败:', error);
        res.status(500).json({
            success: false,
            message: '创建场景失败',
            error: error.message
        });
    }
};

/**
 * 删除场景
 */
exports.deleteScene = async (req, res) => {
    try {
        const { id } = req.params; // 这里是 sceneId

        // 删除场景元数据
        await Scene.findOneAndDelete({ sceneId: id });

        // 删除场景内的所有对象
        await SceneObject.deleteMany({ sceneId: id });

        res.status(200).json({
            success: true,
            message: '场景删除成功'
        });
    } catch (error) {
        console.error('删除场景失败:', error);
        res.status(500).json({
            success: false,
            message: '删除场景失败',
            error: error.message
        });
    }
};

/**
 * 保存场景
 * 保存所有场景对象和元数据
 */
exports.saveScene = async (req, res) => {
    try {
        const { objects, metadata } = req.body;
        const sceneId = metadata?.sceneId;

        if (!sceneId) {
            return res.status(400).json({
                success: false,
                message: '缺少 sceneId'
            });
        }

        // 清空该场景下的现有对象
        await SceneObject.deleteMany({ sceneId: sceneId });

        // 批量插入新对象
        if (objects && objects.length > 0) {
            // 确保每个对象都有 sceneId
            const objectsWithSceneId = objects.map(obj => ({
                ...obj,
                sceneId: sceneId
            }));
            await SceneObject.insertMany(objectsWithSceneId);
        }

        // 更新场景元数据
        const sceneData = {
            lastModified: Date.now(),
            objectCount: objects?.length || 0
        };

        if (metadata.name) sceneData.name = metadata.name;
        if (metadata.description) sceneData.description = metadata.description;
        if (metadata.thumbnail) sceneData.thumbnail = metadata.thumbnail;
        if (metadata.environmentUrl !== undefined) sceneData.environmentUrl = metadata.environmentUrl; // 保存环境贴图 URL

        await Scene.findOneAndUpdate(
            { sceneId: sceneId },
            sceneData,
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            message: '场景保存成功',
            objectCount: objects?.length || 0
        });
    } catch (error) {
        console.error('保存场景失败:', error);
        res.status(500).json({
            success: false,
            message: '保存场景失败',
            error: error.message
        });
    }
};

/**
 * 加载场景
 * 获取所有场景对象和元数据
 */
exports.loadScene = async (req, res) => {
    try {
        const sceneId = req.query.sceneId;

        if (!sceneId) {
            return res.status(400).json({
                success: false,
                message: '缺少 sceneId'
            });
        }

        // 获取该场景下的所有对象
        const objects = await SceneObject.find({ sceneId: sceneId });

        // 获取场景元数据
        const metadata = await Scene.findOne({ sceneId: sceneId });

        if (!metadata) {
            return res.status(404).json({
                success: false,
                message: '场景不存在'
            });
        }

        res.status(200).json({
            success: true,
            objects: objects,
            metadata: metadata
        });
    } catch (error) {
        console.error('加载场景失败:', error);
        res.status(500).json({
            success: false,
            message: '加载场景失败',
            error: error.message
        });
    }
};

/**
 * 清空场景
 */
exports.clearScene = async (req, res) => {
    try {
        const sceneId = req.query.sceneId;

        if (!sceneId) {
            return res.status(400).json({
                success: false,
                message: '缺少 sceneId'
            });
        }

        await SceneObject.deleteMany({ sceneId: sceneId });

        await Scene.findOneAndUpdate(
            { sceneId: sceneId },
            { objectCount: 0, lastModified: Date.now() }
        );

        res.status(200).json({
            success: true,
            message: '场景已清空'
        });
    } catch (error) {
        console.error('清空场景失败:', error);
        res.status(500).json({
            success: false,
            message: '清空场景失败',
            error: error.message
        });
    }
};
