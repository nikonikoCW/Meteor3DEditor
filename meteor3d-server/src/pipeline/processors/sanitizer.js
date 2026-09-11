/**
 * 清洗验证处理器
 * 移除模型中的相机、灯光等无用节点
 */
const { createNodeIO } = require('../utils/ioUtils');

/**
 * 清洗 glTF 文件
 * @param {Object} context - 处理上下文
 */
async function sanitize(context) {
    const io = await createNodeIO();

    try {
        const document = await io.read(context.gltfPath);
        const root = document.getRoot();

        let removedCameras = 0;
        let removedEmptyNodes = 0;

        // 移除所有相机
        const cameras = root.listCameras();
        cameras.forEach(camera => {
            camera.dispose();
            removedCameras++;
        });

        // 移除空节点（无 mesh 且无子节点）
        const removeEmptyNodes = () => {
            let removed = 0;
            root.listNodes().forEach(node => {
                const hasNoMesh = !node.getMesh();
                const hasNoChildren = node.listChildren().length === 0;
                const hasNoCamera = !node.getCamera();
                const hasNoSkin = !node.getSkin();

                if (hasNoMesh && hasNoChildren && hasNoCamera && hasNoSkin) {
                    // 检查是否被其他节点引用
                    const parents = node.listParents();
                    const isOrphan = parents.length <= 1; // 只有 root 引用

                    if (isOrphan) {
                        node.dispose();
                        removed++;
                    }
                }
            });
            return removed;
        };

        // 多次清理，直到没有空节点
        let pass = 0;
        let removed;
        do {
            removed = removeEmptyNodes();
            removedEmptyNodes += removed;
            pass++;
        } while (removed > 0 && pass < 10);

        console.log(`[Sanitizer] 移除 ${removedCameras} 个相机, ${removedEmptyNodes} 个空节点`);

        // 写回文件
        await io.write(context.gltfPath, document);

    } catch (error) {
        console.error('[Sanitizer] 清洗失败:', error.message);
        // 清洗失败不阻断流程，继续处理
    }
}

module.exports = { sanitize };
