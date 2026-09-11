/**
 * LOD 生成处理器
 * 生成多级细节模型
 */
const { simplify, weld } = require('@gltf-transform/functions');
const path = require('path');
const { createNodeIO } = require('../utils/ioUtils');

// 缓存动态导入的 MeshoptSimplifier
let MeshoptSimplifier = null;

async function getMeshoptSimplifier() {
    if (!MeshoptSimplifier) {
        const meshoptimizer = await import('meshoptimizer');
        MeshoptSimplifier = meshoptimizer.MeshoptSimplifier;
    }
    return MeshoptSimplifier;
}

// LOD 比例配置
const LOD_CONFIGS = [
    { level: 0, ratio: 1.0, error: 0.0001 },   // LOD0: 原始精度
    { level: 1, ratio: 0.5, error: 0.001 },    // LOD1: 50% 三角面
    { level: 2, ratio: 0.25, error: 0.01 }     // LOD2: 25% 三角面
];

/**
 * 生成 LOD 版本
 * @param {Object} context - 处理上下文
 * @returns {Array} LOD 文件路径数组
 */
async function generateLODs(context) {
    // 动态导入并等待 meshoptimizer 初始化
    const simplifier = await getMeshoptSimplifier();
    await simplifier.ready;

    const io = await createNodeIO();
    const lods = [];
    const inputPath = context.compressedPath || context.gltfPath;
    const baseName = path.basename(inputPath, path.extname(inputPath)).replace('_compressed', '');
    const outputDir = 'uploads/processed/lods';

    try {
        for (const config of LOD_CONFIGS) {
            const document = await io.read(inputPath);
            const lodPath = path.join(outputDir, `${baseName}_LOD${config.level}.glb`);

            if (config.ratio < 1.0) {
                // 应用网格简化
                await document.transform(
                    weld({ tolerance: 0.0001 }),  // 先焊接顶点
                    simplify({
                        simplifier: simplifier,
                        ratio: config.ratio,
                        error: config.error
                    })
                );
            }

            await io.write(lodPath, document);
            lods.push(lodPath);

            // 计算三角面数
            const stats = calculateMeshStats(document);
            console.log(`[LODGenerator] LOD${config.level}: ${stats.triangles} 三角面 → ${lodPath}`);
        }

        return lods;

    } catch (error) {
        console.error('[LODGenerator] LOD 生成失败:', error.message);
        // 失败时返回原始文件作为唯一 LOD
        return [inputPath];
    }
}

/**
 * 计算网格统计信息
 */
function calculateMeshStats(document) {
    let triangles = 0;
    let vertices = 0;

    for (const mesh of document.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
            const indices = prim.getIndices();
            const positions = prim.getAttribute('POSITION');

            if (indices) {
                triangles += indices.getCount() / 3;
            } else if (positions) {
                triangles += positions.getCount() / 3;
            }

            if (positions) {
                vertices += positions.getCount();
            }
        }
    }

    return { triangles: Math.floor(triangles), vertices };
}

module.exports = { generateLODs };
