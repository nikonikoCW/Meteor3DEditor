/**
 * 资产处理流水线入口
 * 编排各处理步骤
 */
const Asset = require('../models/Asset');
const assetQueue = require('./queue');
const fs = require('fs');
const path = require('path');

// 导入处理器
const { convertFormat } = require('./processors/formatConverter');
const { extractZip } = require('./processors/zipExtractor');
const { sanitize } = require('./processors/sanitizer');
const { ensureNodeIdentities } = require('./processors/nodeIdentityProcessor');
const { compressMeshopt } = require('./processors/meshoptCompressor');
const { optimizeTextures } = require('./processors/textureOptimizer');
const { calculateBounds } = require('./processors/boundsCalculator');

/**
 * 处理单个资产
 * @param {Object} asset - 资产文档
 * @returns {Object} 处理结果上下文
 */
async function processAsset(asset) {
    const processingInputPath = asset.metadata?.processingInputPath || asset.filePath;
    const processingFormat = path.extname(processingInputPath).replace('.', '').toLowerCase() || asset.format;
    const context = {
        assetId: asset._id.toString(),
        inputPath: processingInputPath,
        originalFormat: processingFormat
    };

    console.log(`[Pipeline] 开始处理资产: ${asset.name} (${asset._id})`);

    // Step 0: ZIP 解压 (如果需要)
    if (context.originalFormat === 'zip') {
        console.log('[Pipeline] Step 0: ZIP 解压');
        context.inputPath = await extractZip(context);
    }

    // Step 1: 格式转换 (OBJ/FBX/STL → GLB)
    console.log('[Pipeline] Step 1: 格式转换');
    context.gltfPath = await convertFormat(context);

    // Step 2: 清洗验证 (移除相机/灯光)
    console.log('[Pipeline] Step 2: 清洗验证');
    await sanitize(context);

    // Stable node identities must be injected after sanitizing and before derived files.
    context.nodeManifest = await ensureNodeIdentities(context);

    // Step 3: 将 KTX2 纹理嵌入最终模型。
    console.log('[Pipeline] Step 3: KTX2 纹理压缩');
    try {
        context.texturePath = await optimizeTextures(context);
        // Step 4: Meshopt 缓冲压缩，保留节点层级和变换。
        console.log('[Pipeline] Step 4: Meshopt 压缩');
        context.compressedPath = await compressMeshopt(context);
    } finally {
        if (context.textureTempDir) {
            await fs.promises.rm(context.textureTempDir, { recursive: true, force: true });
        }
    }

    // Step 5: 边界盒计算
    console.log('[Pipeline] Step 5: 边界盒计算');
    const boundsResult = await calculateBounds(context);
    context.bounds = boundsResult.bounds;
    context.stats = boundsResult.stats;

    console.log(`[Pipeline] 处理完成: ${asset.name}`);
    return context;
}

// 注册队列处理器
assetQueue.process('process', async (job) => {
    const { assetId } = job.data;
    let context = null;

    try {
        // 获取资产记录
        const asset = await Asset.findById(assetId);
        if (!asset) {
            throw new Error(`资产不存在: ${assetId}`);
        }

        // 更新状态为处理中
        await Asset.findByIdAndUpdate(assetId, {
            processingStatus: 'processing',
            processingError: null
        });

        // 执行流水线
        context = await processAsset(asset);

        // 更新资产记录
        await Asset.findByIdAndUpdate(assetId, {
            processingStatus: 'ready',
            processedFiles: {
                compressed: context.compressedPath
            },
            bounds: context.bounds,
            stats: context.stats,
            nodeManifest: context.nodeManifest
        });

        return { success: true, assetId };

    } catch (error) {
        console.error(`[Pipeline] 处理失败: ${assetId}`, error);

        // 更新失败状态
        await Asset.findByIdAndUpdate(assetId, {
            processingStatus: 'failed',
            processingError: error.message
        });

        throw error;
    } finally {
        // 清理临时文件
        if (context && context.tempDir) {
            try {
                console.log(`[Pipeline] 清理临时目录: ${context.tempDir}`);
                fs.rmSync(context.tempDir, { recursive: true, force: true });
            } catch (cleanupError) {
                console.warn('[Pipeline] 清理临时目录失败:', cleanupError.message);
            }
        }
    }
});

module.exports = {
    assetQueue,
    processAsset
};
