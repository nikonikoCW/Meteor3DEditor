const express = require('express');
const router = express.Router();
const sceneController = require('../controllers/sceneController');
const upload = require('../config/upload');

/**
 * 场景 API 路由
 */

// GET /api/scene/list - 获取场景列表
router.get('/list', sceneController.getScenes);

// POST /api/scene/create - 创建新场景
router.post('/create', sceneController.createScene);

// PATCH /api/scene/:sceneId/featured - 设置或取消精品案例
router.patch('/:sceneId/featured', sceneController.updateFeaturedStatus);

// PATCH /api/scene/:sceneId/initial-view - 保存场景初始视角
router.patch('/:sceneId/initial-view', sceneController.saveInitialView);

// POST /api/scene/:sceneId/thumbnail - 上传场景封面图
router.post('/:sceneId/thumbnail', upload.single('thumbnail'), sceneController.uploadThumbnail);

// DELETE /api/scene/:id - 删除场景
router.delete('/:id', sceneController.deleteScene);

// POST /api/scene/save - 保存场景
router.post('/save', sceneController.saveScene);

// GET /api/scene/load - 加载场景
router.get('/load', sceneController.loadScene);

// DELETE /api/scene/clear - 清空场景
router.delete('/clear', sceneController.clearScene);

// POST /api/scene/basemap - 生成底图
router.post('/basemap', sceneController.generateBaseMapHandler);

module.exports = router;
