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

// GET /api/assets/:id/status - 获取处理状态
router.get('/:id/status', assetController.getProcessingStatus);

// POST /api/assets/:id/reprocess - 重新处理资产
// POST /api/assets/:id/upload-cloud - 上传原始文件和缩略图到又拍云
router.post('/:id/upload-cloud', assetController.uploadAssetToCloud);

router.post('/:id/reprocess', assetController.reprocessAsset);

// POST /api/assets/:id/thumbnail - 上传缩略图 (延迟生成)
router.post('/:id/thumbnail', upload.single('thumbnail'), assetController.uploadThumbnail);

// POST /api/assets/register-tileset - 注册 3D Tiles
router.post('/register-tileset', assetController.registerTileset);

// POST /api/assets/register-gaussian-splat - 注册高斯泼溅
router.post('/register-gaussian-splat', assetController.registerGaussianSplat);

module.exports = router;
