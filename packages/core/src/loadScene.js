import { SceneManager } from './SceneManager.js';
import { PersistenceManager } from './PersistenceManager.js';

/**
 * 简化的场景加载入口
 * 用于通过 <script> 标签引入后快速加载场景
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.sceneId - 场景 ID
 * @param {string} options.serverUrl - 后端服务器地址
 * @param {HTMLElement} options.container - 渲染容器元素
 * @param {Object} [options.config] - 可选的额外配置
 * @param {string} [options.config.dracoPath] - 自定义 Draco 解码器路径
 * @param {boolean} [options.config.fitCamera=true] - 是否自动调整相机视角
 * @param {boolean} [options.config.showGrid] - 是否显示辅助网格（默认跟随场景配置）
 * @param {boolean} [options.config.autoResize=true] - 是否自动响应容器尺寸变化
 * @returns {Promise<{sceneManager: SceneManager, scene: THREE.Scene, camera, renderer, dispose: Function}>}
 * 
 * @example
 * // HTML 中使用
 * <script src="meteor3d-core.umd.js"></script>
 * <script>
 *   Meteor3D.loadScene({
 *     sceneId: 'your-scene-id',
 *     serverUrl: 'https://api.meteor3d.com',
 *     container: document.getElementById('canvas')
 *   }).then(({ sceneManager }) => {
 *     console.log('Scene loaded!');
 *   });
 * </script>
 */
export async function loadScene({ sceneId, serverUrl, container, config = {} }) {
    // 创建 canvas 元素（如果容器不是 canvas）
    let canvas = container;
    if (container.tagName !== 'CANVAS') {
        canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);
    }

    // 初始化场景管理器
    const sceneManager = new SceneManager(canvas);

    // 从服务器获取场景数据
    const response = await fetch(`${serverUrl}/api/scene/load?sceneId=${sceneId}`);
    if (!response.ok) {
        throw new Error(`Failed to load scene: ${response.statusText}`);
    }
    const responseData = await response.json();

    // 检查 API 响应状态
    if (!responseData.success) {
        throw new Error(`Failed to load scene: ${responseData.message || 'Unknown error'}`);
    }

    // 提取数据（与 DBManager.getSceneData 保持一致）
    const objects = responseData.objects || [];
    const metadata = responseData.metadata || {};

    // Draco 路径：优先使用 config.dracoPath，否则使用 serverUrl + /draco/
    const dracoPath = config.dracoPath || `${serverUrl}/draco/`;

    // 创建 PersistenceManager 用于反序列化
    const persistenceManager = new PersistenceManager(sceneManager, null, null, { dracoPath });

    // ========== 1. 加载环境贴图/天空盒 ==========
    if (metadata.environmentUrl) {
        try {
            const envUrl = metadata.environmentUrl.startsWith('http')
                ? metadata.environmentUrl
                : `${serverUrl}${metadata.environmentUrl}`;
            await sceneManager.loadEnvironment(envUrl);
            console.log('✅ 环境贴图加载成功');
        } catch (error) {
            console.warn('⚠️ 加载环境贴图失败:', error);
        }
    }

    // ========== 2. 恢复 GIS 配置 ==========
    if (metadata.gisConfig) {
        const gisConfig = metadata.gisConfig;

        // 设置 GIS 配置
        if (gisConfig.enable) {
            sceneManager.setGisConfig(gisConfig);
        }

        // 恢复辅助网格线
        const showGrid = config.showGrid !== undefined ? config.showGrid : gisConfig.gridVisible;
        if (showGrid && gisConfig.size) {
            sceneManager.setGridHelper(true, gisConfig.size, gisConfig.size);
        }

        // 恢复底图显示
        if (gisConfig.showBaseMap && gisConfig.baseMapUrl) {
            const fullUrl = `${serverUrl}${gisConfig.baseMapUrl}`;
            sceneManager.setBaseMap(
                fullUrl,
                gisConfig.bounds,
                gisConfig.size,
                true
            );
            console.log('✅ 底图加载成功');
        }

        sceneManager.emitGisConfigUpdated();
    }

    // ========== 3. 加载场景对象 ==========
    let successCount = 0;
    let failedCount = 0;

    for (const objData of objects) {
        try {
            const object = await persistenceManager.deserializeObject(objData);
            if (object) {
                sceneManager.addObject(object);
                successCount++;
            }
        } catch (err) {
            failedCount++;
            console.warn('⚠️ Failed to load object:', objData.name, err);
        }
    }

    console.log(`✅ 场景加载完成: 成功 ${successCount}/${objects.length}`);
    if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} 个对象加载失败`);
    }

    // ========== 4. 调整相机视角 ==========
    if (config.fitCamera !== false) {
        sceneManager.fitCameraToScene();
    }

    // ========== 5. 设置窗口自适应 ==========
    if (config.autoResize !== false) {
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry && entry.contentRect) {
                const { width, height } = entry.contentRect;
                sceneManager.onWindowResize(width, height);
            }
        });
        resizeObserver.observe(container);

        // 将 resizeObserver 附加到 sceneManager 以便清理
        sceneManager._resizeObserver = resizeObserver;
    }

    return {
        sceneManager,
        scene: sceneManager.scene,
        camera: sceneManager.camera,
        renderer: sceneManager.renderer,
        // 提供一个销毁方法
        dispose: () => {
            if (sceneManager._resizeObserver) {
                sceneManager._resizeObserver.disconnect();
            }
        }
    };
}
