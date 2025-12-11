/**
 * 纹理优化处理器
 * 生成多分辨率纹理版本
 */
const sharp = require('sharp');
const path = require('path');

const fs = require('fs');
const { createNodeIO } = require('../utils/ioUtils');

const TEXTURE_SIZES = [2048, 1024, 512];

/**
 * 优化 glTF 中的纹理
 * @param {Object} context - 处理上下文
 * @returns {Object} 各分辨率纹理文件路径
 */
async function optimizeTextures(context) {
    const io = await createNodeIO();
    const results = {};

    try {
        const document = await io.read(context.gltfPath);
        const textures = document.getRoot().listTextures();

        if (textures.length === 0) {
            console.log('[TextureOptimizer] 无纹理需要处理');
            return results;
        }

        console.log(`[TextureOptimizer] 发现 ${textures.length} 个纹理`);

        for (let i = 0; i < textures.length; i++) {
            const texture = textures[i];
            const image = texture.getImage();

            if (!image) {
                continue;
            }

            const texName = texture.getName() || `texture_${i}`;
            const texDir = 'uploads/processed/textures';
            results[texName] = {};

            // 保存原始纹理
            const originalPath = path.join(texDir, `${context.assetId}_${texName}_original.png`);
            fs.writeFileSync(originalPath, Buffer.from(image));
            results[texName].original = originalPath;

            // 生成多分辨率版本
            for (const size of TEXTURE_SIZES) {
                try {
                    const resizedPath = path.join(texDir, `${context.assetId}_${texName}_${size}.png`);

                    await sharp(Buffer.from(image))
                        .resize(size, size, {
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .png({ quality: 90 })
                        .toFile(resizedPath);

                    results[texName][size] = resizedPath;

                } catch (resizeError) {
                    console.warn(`[TextureOptimizer] 缩放 ${texName} 到 ${size}px 失败:`, resizeError.message);
                }
            }

            console.log(`[TextureOptimizer] 处理纹理: ${texName}`);
        }

        return results;

    } catch (error) {
        console.error('[TextureOptimizer] 纹理优化失败:', error.message);
        return results;
    }
}

module.exports = { optimizeTextures };
