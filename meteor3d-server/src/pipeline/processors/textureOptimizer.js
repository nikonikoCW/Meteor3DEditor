/**
 * 纹理优化处理器
 * 生成多分辨率纹理版本
 * 
 * 注意：sharp 是可选依赖，在不支持的 Node.js 版本上会优雅降级
 * - sharp 0.32.x 支持 Node.js 14-20
 * - sharp 0.33+ 支持 Node.js 18.17+/20+/22+
 */
const path = require('path');
const fs = require('fs');
const { createNodeIO } = require('../utils/ioUtils');

// 延迟加载 sharp，允许在不支持的环境中优雅降级
let sharp = null;
let sharpLoadError = null;

function getSharp() {
    if (sharp) return sharp;
    if (sharpLoadError) return null;

    try {
        sharp = require('sharp');
        console.log('[TextureOptimizer] sharp 模块加载成功');
        return sharp;
    } catch (error) {
        sharpLoadError = error;
        console.warn('[TextureOptimizer] sharp 模块加载失败，纹理优化功能将被禁用');
        console.warn(`[TextureOptimizer] 错误详情: ${error.message}`);
        console.warn('[TextureOptimizer] 提示: 这通常是 Node.js 版本兼容性问题，可尝试运行 pnpm rebuild sharp');
        return null;
    }
}

const TEXTURE_SIZES = [2048, 1024, 512];

/**
 * 优化 glTF 中的纹理
 * @param {Object} context - 处理上下文
 * @returns {Object} 各分辨率纹理文件路径
 */
async function optimizeTextures(context) {
    const sharpInstance = getSharp();
    const results = {};

    // 如果 sharp 不可用，跳过纹理优化
    if (!sharpInstance) {
        console.warn('[TextureOptimizer] 跳过纹理优化（sharp 不可用）');
        return results;
    }

    const io = await createNodeIO();

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

                    await sharpInstance(Buffer.from(image))
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
