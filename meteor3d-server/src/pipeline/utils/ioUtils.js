/**
 * NodeIO 工具类
 * 统一配置 gltf-transform 的 IO 环境，注册 Draco 依赖
 */
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const draco3d = require('draco3dgltf');

// 缓存 Draco 模块实例
let dracoDecoderModule = null;
let dracoEncoderModule = null;

/**
 * 创建配置好的 NodeIO 实例
 * @returns {Promise<NodeIO>}
 */
async function createNodeIO() {
    // 懒加载 Draco 模块
    if (!dracoDecoderModule) {
        dracoDecoderModule = await draco3d.createDecoderModule();
    }
    if (!dracoEncoderModule) {
        dracoEncoderModule = await draco3d.createEncoderModule();
    }

    return new NodeIO()
        .registerExtensions(ALL_EXTENSIONS)
        .registerDependencies({
            'draco3d.decoder': dracoDecoderModule,
            'draco3d.encoder': dracoEncoderModule
        });
}

module.exports = { createNodeIO };
