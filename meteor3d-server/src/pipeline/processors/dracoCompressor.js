/**
 * Draco 压缩处理器
 * 使用 Draco 压缩几何数据，减少文件体积
 */
const { draco } = require('@gltf-transform/functions');
const path = require('path');
const { createNodeIO } = require('../utils/ioUtils');

/**
 * 使用 Draco 压缩 GLB 文件
 * @param {Object} context - 处理上下文
 * @returns {string} 压缩后文件路径
 */
async function compressDraco(context) {
    const io = await createNodeIO();

    try {
        const inputPath = context.gltfPath;
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join('uploads/processed/models', `${baseName}_compressed.glb`);

        // 读取文档
        const document = await io.read(inputPath);

        // 应用 Draco 压缩
        await document.transform(
            draco({
                quantizePosition: 14,    // 位置精度 (bits)
                quantizeNormal: 10,      // 法线精度
                quantizeTexcoord: 12,    // UV 精度
                quantizeColor: 8,        // 顶点颜色精度
                quantizeGeneric: 12      // 其他属性精度
            })
        );

        // 写入压缩文件
        await io.write(outputPath, document);

        // 计算压缩率
        const fs = require('fs');
        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(outputPath).size;
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        console.log(`[DracoCompressor] 压缩完成: ${ratio}% 减少 (${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB)`);

        return outputPath;

    } catch (error) {
        console.error('[DracoCompressor] 压缩失败:', error.message);
        // 压缩失败返回原始路径
        return context.gltfPath;
    }
}

module.exports = { compressDraco };
