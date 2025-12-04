const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const upload = require('../config/upload');

/**
 * 资产 API 路由
 */

// POST /api/assets/upload - 上传资产
router.post('/upload', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), assetController.uploadAsset);

// GET /api/assets - 获取资产列表
router.get('/', assetController.getAssets);

// GET /api/assets/:id - 获取单个资产
router.get('/:id', assetController.getAsset);

// DELETE /api/assets/:id - 删除资产
router.delete('/:id', assetController.deleteAsset);

// GET /api/assets/:id/download - 下载资产
router.get('/:id/download', assetController.downloadAsset);

module.exports = router;
