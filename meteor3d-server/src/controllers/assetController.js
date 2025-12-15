const Asset = require('../models/Asset');
const path = require('path');
const fs = require('fs');

/**
 * 上传资产
 */
exports.uploadAsset = async (req, res) => {
    try {
        // 处理多文件上传
        const files = req.files;
        const mainFile = files && files['file'] ? files['file'][0] : null;
        const thumbnailFile = files && files['thumbnail'] ? files['thumbnail'][0] : null;

        if (!mainFile) {
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }

        const ext = path.extname(mainFile.originalname).toLowerCase();

        // 确定资产类型
        let assetType = 'model';
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            assetType = 'texture';
        } else if (['.hdr', '.exr'].includes(ext)) {
            assetType = 'hdri';
        } else if (ext === '.zip') {
            assetType = 'model'; // ZIP 默认为模型包
        }

        // 创建资产记录
        const assetData = {
            name: path.basename(mainFile.originalname, ext),
            originalName: mainFile.originalname,
            type: assetType,
            format: ext.substring(1), // 去掉点号
            filePath: mainFile.path,
            fileSize: mainFile.size,
            url: `/uploads/models/${mainFile.filename}`,
            // 流水线处理状态
            processingStatus: assetType === 'model' ? 'pending' : 'skipped'
        };

        // 如果有缩略图，添加缩略图路径
        if (thumbnailFile) {
            assetData.thumbnail = `/uploads/thumbnails/${thumbnailFile.filename}`;
        }

        const asset = new Asset(assetData);
        await asset.save();

        // 如果是模型类型，加入处理队列
        if (assetType === 'model') {
            const { assetQueue } = require('../pipeline');
            await assetQueue.add('process', { assetId: asset._id.toString() });
            console.log(`[Upload] 资产已加入处理队列: ${asset._id}`);
        }

        res.status(201).json({
            success: true,
            message: assetType === 'model' ? '文件上传成功，正在处理中...' : '文件上传成功',
            asset: asset
        });
    } catch (error) {
        console.error('上传资产失败:', error);
        res.status(500).json({
            success: false,
            message: '上传失败',
            error: error.message
        });
    }
};

/**
 * 获取资产列表
 */
exports.getAssets = async (req, res) => {
    try {
        const { type } = req.query;
        const filter = type ? { type } : {};

        const assets = await Asset.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            assets: assets,
            count: assets.length
        });
    } catch (error) {
        console.error('获取资产列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取资产列表失败',
            error: error.message
        });
    }
};

/**
 * 获取单个资产
 */
exports.getAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: '资产不存在'
            });
        }

        res.status(200).json({
            success: true,
            asset: asset
        });
    } catch (error) {
        console.error('获取资产失败:', error);
        res.status(500).json({
            success: false,
            message: '获取资产失败',
            error: error.message
        });
    }
};

/**
 * 删除资产
 */
exports.deleteAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: '资产不存在'
            });
        }

        // 辅助函数：安全删除文件
        const safeUnlink = (filePath) => {
            if (!filePath) return;

            // 规范化路径：替换反斜杠为正斜杠
            const normalizedPath = filePath.replace(/\\/g, '/');

            if (fs.existsSync(normalizedPath)) {
                try {
                    fs.unlinkSync(normalizedPath);
                    console.log(`[Delete] 已删除: ${normalizedPath}`);
                } catch (err) {
                    console.warn(`[Delete] 删除失败: ${normalizedPath}`, err.message);
                }
            } else {
                console.log(`[Delete] 文件不存在，跳过: ${normalizedPath}`);
            }
        };

        // 辅助函数：将数据库中的路径转为文件系统路径
        // 处理两种格式：/uploads/xxx 和 uploads/xxx
        const dbPathToFsPath = (dbPath) => {
            if (!dbPath) return null;
            // 移除前导斜杠（如果有）
            let fsPath = dbPath.startsWith('/') ? dbPath.substring(1) : dbPath;
            // 替换反斜杠为正斜杠
            fsPath = fsPath.replace(/\\/g, '/');
            return fsPath;
        };

        console.log(`[Delete] 开始删除资产文件: ${asset.name}`);
        console.log(`[Delete] 原始文件路径: ${asset.filePath}`);
        console.log(`[Delete] 缩略图路径: ${asset.thumbnail}`);
        console.log(`[Delete] processedFiles:`, JSON.stringify(asset.processedFiles, null, 2));

        // 1. 删除原始上传文件
        safeUnlink(asset.filePath);

        // 2. 删除缩略图
        safeUnlink(dbPathToFsPath(asset.thumbnail));

        // 3. 删除处理后的文件
        if (asset.processedFiles) {
            safeUnlink(dbPathToFsPath(asset.processedFiles.compressed));
            safeUnlink(dbPathToFsPath(asset.processedFiles.lod0));
            safeUnlink(dbPathToFsPath(asset.processedFiles.lod1));
            safeUnlink(dbPathToFsPath(asset.processedFiles.lod2));

            // 删除纹理文件
            if (asset.processedFiles.textures) {
                const textures = asset.processedFiles.textures;
                // 纹理可能是对象格式（按纹理名称分组）
                if (typeof textures === 'object') {
                    Object.values(textures).forEach(texGroup => {
                        if (typeof texGroup === 'string') {
                            safeUnlink(dbPathToFsPath(texGroup));
                        } else if (typeof texGroup === 'object' && texGroup !== null) {
                            Object.values(texGroup).forEach(texPath => {
                                if (typeof texPath === 'string') {
                                    safeUnlink(dbPathToFsPath(texPath));
                                }
                            });
                        }
                    });
                }
            }
        }

        // 4. 删除数据库记录
        await Asset.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: '资产已删除'
        });
    } catch (error) {
        console.error('删除资产失败:', error);
        res.status(500).json({
            success: false,
            message: '删除资产失败',
            error: error.message
        });
    }
};

/**
 * 下载资产
 */
exports.downloadAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: '资产不存在'
            });
        }

        if (!fs.existsSync(asset.filePath)) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }

        res.download(asset.filePath, asset.originalName);
    } catch (error) {
        console.error('下载资产失败:', error);
        res.status(500).json({
            success: false,
            message: '下载失败',
            error: error.message
        });
    }
};

/**
 * 获取资产处理状态
 */
exports.getProcessingStatus = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id)
            .select('processingStatus processingError processedFiles bounds stats');

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: '资产不存在'
            });
        }

        res.status(200).json({
            success: true,
            processingStatus: asset.processingStatus,
            processingError: asset.processingError,
            processedFiles: asset.processedFiles,
            bounds: asset.bounds,
            stats: asset.stats
        });
    } catch (error) {
        console.error('获取处理状态失败:', error);
        res.status(500).json({
            success: false,
            message: '获取处理状态失败',
            error: error.message
        });
    }
};

/**
 * 重新处理资产
 */
exports.reprocessAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: '资产不存在'
            });
        }

        if (asset.type !== 'model') {
            return res.status(400).json({
                success: false,
                message: '只有模型类型资产可以重新处理'
            });
        }

        // 重置状态
        await Asset.findByIdAndUpdate(req.params.id, {
            processingStatus: 'pending',
            processingError: null
        });

        // 加入队列
        const { assetQueue } = require('../pipeline');
        await assetQueue.add('process', { assetId: asset._id.toString() });

        res.status(200).json({
            success: true,
            message: '已加入处理队列'
        });
    } catch (error) {
        console.error('重新处理资产失败:', error);
        res.status(500).json({
            success: false,
            message: '重新处理失败',
            error: error.message
        });
    }
};

/**
 * 上传缩略图 (延迟生成)
 * 用于模型处理完成后，前端生成缩略图并上传
 */
exports.uploadThumbnail = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: '资产不存在'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有上传缩略图文件'
            });
        }

        // 更新缩略图路径
        const thumbnailPath = `/uploads/thumbnails/${req.file.filename}`;

        // 如果已有旧缩略图，删除旧文件
        if (asset.thumbnail) {
            const oldThumbnailPath = path.join(__dirname, '../../uploads/thumbnails', path.basename(asset.thumbnail));
            if (fs.existsSync(oldThumbnailPath)) {
                fs.unlinkSync(oldThumbnailPath);
            }
        }

        await Asset.findByIdAndUpdate(req.params.id, {
            thumbnail: thumbnailPath
        });

        res.status(200).json({
            success: true,
            message: '缩略图上传成功',
            thumbnail: thumbnailPath
        });
    } catch (error) {
        console.error('上传缩略图失败:', error);
        res.status(500).json({
            success: false,
            message: '上传缩略图失败',
            error: error.message
        });
    }
};
