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
 * @returns {Promise<Meteor3DInstance>} 场景实例 API
 * 
 * @example
 * // HTML 中使用
 * <script src="meteor3d-core.umd.js"></script>
 * <script>
 *   Meteor3D.loadScene({
 *     sceneId: 'your-scene-id',
 *     serverUrl: 'https://api.meteor3d.com',
 *     container: document.getElementById('canvas')
 *   }).then(instance => {
 *     // 启用性能监视器
 *     instance.enableStats();
 *     
 *     // 控制三角形统计
 *     instance.toggleTriangleStats(true, (stats) => {
 *       console.log('渲染三角形:', stats.rendered);
 *     });
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
    // 使用后端本地 URL
    const envUrl = metadata.environmentUrl
        ? (metadata.environmentUrl.startsWith('http')
            ? metadata.environmentUrl
            : `${serverUrl}${metadata.environmentUrl}`)
        : null;

    if (envUrl) {
        try {
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

    // ========== 2.5 恢复相机配置 ==========
    if (metadata.cameraFar) {
        sceneManager.setCameraFar(metadata.cameraFar);
        // console.log(`✅ 相机配置加载成功: 远裁切面 ${metadata.cameraFar}`);
    }

    // ========== 3. 加载场景对象 ==========
    persistenceManager.setPendingNodeGraph(metadata.nodeGraph);
    persistenceManager.setPendingDeletedSourceNodes(metadata.deletedSourceNodes);

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
    persistenceManager.applyGlobalNodeGraph();

    if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} 个对象加载失败`);
    }

    // ========== 4. 调整相机视角 ==========
    if (config.fitCamera !== false) {
        sceneManager.fitCameraToScene();
    }

    // ========== 5. 设置窗口自适应 ==========
    let resizeObserver = null;
    if (config.autoResize !== false) {
        resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry && entry.contentRect) {
                const { width, height } = entry.contentRect;
                sceneManager.onWindowResize(width, height);
            }
        });
        resizeObserver.observe(container);
    }

    // 标记场景就绪
    sceneManager.setReady(true);

    // ========== 6. 返回封装后的 API ==========
    return createMeteor3DInstance(sceneManager, resizeObserver);
}

/**
 * 创建 Meteor3D 实例 API
 * 只暴露安全的公开方法，隐藏内部实现细节
 * 
 * @param {SceneManager} sceneManager 
 * @param {ResizeObserver} resizeObserver 
 * @returns {Meteor3DInstance}
 */
function createMeteor3DInstance(sceneManager, resizeObserver) {
    return {
        // ========== 基础状态与事件 ==========
        /** 获取场景是否就绪 */
        get isReady() { return sceneManager.isReady; },
        /** 订阅事件 */
        on: (event, callback) => sceneManager.on(event, callback),
        /** 取消订阅事件 */
        off: (event, callback) => sceneManager.off(event, callback),
        /** Find a persistent scene node by BID. */
        getObjectByBid: (bid) => sceneManager.findObjectByBid(bid),

        // ========== 性能监控 ==========
        /** 启用 FPS 性能监视器 */
        enableStats: () => sceneManager.enableStats(),
        /** 禁用 FPS 性能监视器 */
        disableStats: () => sceneManager.disableStats(),
        /** 切换 FPS 监视器显隐 */
        toggleStats: (show) => sceneManager.toggleStats(show),
        /** 检查 FPS 监视器是否启用 */
        isStatsEnabled: () => sceneManager.isStatsEnabled(),

        // ========== 三角形统计 ==========
        /** 切换三角形统计显示 */
        toggleTriangleStats: (show, callback, interval) =>
            sceneManager.toggleTriangleStats(show, callback, interval),
        /** 获取当前三角形统计 */
        getTriangleStats: () => sceneManager.getTriangleStats(),
        /** 检查三角形统计是否启用 */
        isTriangleStatsEnabled: () => sceneManager.isTriangleStatsEnabled(),

        // ========== 相机控制 ==========
        /** 聚焦相机到所有场景物体 */
        fitCameraToScene: () => sceneManager.fitCameraToScene(),
        /**
         * 根据 BID 从物体局部六面之一聚焦物体
         * @param {string} bid - 场景节点的持久化 BID
         * @param {Object} [options] - 聚焦配置
         * @param {'front'|'back'|'left'|'right'|'top'|'bottom'} [options.face='front'] - 观察面
         * @param {number} [options.duration=1500] - 动画时长（毫秒）
         * @param {number} [options.padding=1.2] - 画面留白倍率
         * @param {Function} [options.onComplete] - 完成回调
         * @returns {Promise<void>}
         */
        focusObject: (bid, options) => sceneManager.focusObject(bid, options),
        /** 手动触发尺寸调整 */
        resize: (width, height) => sceneManager.onWindowResize(width, height),
        /** 获取当前相机视角 */
        getView: (callback) => sceneManager.getView(callback),
        /** 设置相机视角 */
        setView: (options) => sceneManager.setView(options),
        /**
         * 设置相机控制模式
         * @param {'orbit'|'ghost'} mode - 控制模式
         * @param {Object} [options] - 模式选项
         * @param {boolean} [options.pointerLock] - (ghost 模式) 是否锁定鼠标
         * @returns {boolean}
         */
        setControlMode: (mode, options) => sceneManager.setControlMode(mode, options),
        /** 获取当前相机控制模式 */
        getControlMode: () => sceneManager.getControlMode(),

        // ========== 射线检测 API ==========
        /**
         * 场景点击事件 - 通过 on('scene-click', callback) 订阅
         * @event scene-click
         * @param {Object} data - 事件数据
         * @param {Object} data.worldPosition - 世界坐标 {x, y, z}
         * @param {Object|null} data.lngLat - 经纬度 {lng, lat, height}
         * @param {THREE.Object3D|null} data.object - 命中的对象
         * @param {THREE.Vector3|null} data.point - 精确交点
         */
        /**
         * 执行射线检测
         * @param {Object} screenPosition - 归一化屏幕坐标 {x, y} (-1到1)
         * @param {Object} options - 选项
         * @returns {THREE.Intersection[]}
         */
        raycastObjects: (screenPosition, options) => sceneManager.raycastObjects(screenPosition, options),
        /** 与地面(Y=0)相交 */
        raycastGround: (screenPosition) => sceneManager.raycastGround(screenPosition),

        // ========== GIS 坐标转换 ==========
        /** 经纬度转世界坐标 */
        lngLatToWorld: (lng, lat, height) => sceneManager.lngLatToWorld(lng, lat, height),
        /** 世界坐标转经纬度 */
        worldToLngLat: (worldPos) => sceneManager.worldToLngLat(worldPos),

        // ========== 辅助显示 ==========
        /** 设置网格辅助线 */
        setGridHelper: (visible, length, width) => sceneManager.setGridHelper(visible, length, width),
        /** 设置坐标轴辅助线 */
        setAxesHelper: (visible, size) => sceneManager.setAxesHelper(visible, size),

        // ========== 标签 API ==========
        /**
         * 创建标签
         * @param {Object} options - 配置选项
         * @param {Object} [options.position] - 世界坐标 {x, y, z}
         * @param {Object} [options.lngLat] - 经纬度 {lng, lat, height}
         * @param {string} options.content - HTML 内容
         * @param {Object} [options.style] - CSS 样式对象
         * @param {Object} [options.offset] - 屏幕像素偏移 {x, y}
         * @returns {Label} 标签实例
         */
        createLabel: (options) => sceneManager.labelManager.createLabel(options),
        /** 获取所有标签 */
        getLabels: () => sceneManager.labelManager.getLabels(),
        /** 清除所有标签 */
        clearLabels: () => sceneManager.labelManager.clearLabels(),

        // ========== Object visibility API ==========
        /** Set whether an object is visible. */
        setObjectVisible: (bid, visible) => sceneManager.setObjectVisible(bid, visible),
        /** Show an object. */
        showObject: (bid) => sceneManager.showObject(bid),
        /** Hide an object. */
        hideObject: (bid) => sceneManager.hideObject(bid),
        /** Return the object's local visible flag, or null when not found. */
        isObjectVisible: (bid) => sceneManager.isObjectVisible(bid),

        // ========== 描边效果 ==========
        /**
         * 启用对象描边
         * @param {string} bid - 对象 BID
         * @param {Object} [options] - 配置选项
         * @param {number} [options.color=0x00ff00] - 描边颜色
         * @param {number} [options.thickness=1] - 描边粗细
         * @param {number} [options.strength=3] - 描边强度
         * @returns {boolean}
         */
        enableOutline: (bid, options) => sceneManager.enableOutline(bid, options),
        /**
         * 禁用对象描边
         * @param {string} [bid] - 对象 BID，不传则清除所有
         * @returns {boolean}
         */
        disableOutline: (bid) => sceneManager.disableOutline(bid),
        /** 获取当前描边对象的 BID 列表 */
        getOutlinedObjects: () => sceneManager.getOutlinedObjects(),

        // ========== 高亮效果 ==========
        /**
         * 启用对象高亮
         * @param {string} bid - 对象 BID
         * @param {Object} [options] - 配置选项
         * @param {number} [options.color=0xffff00] - 高亮颜色
         * @param {number} [options.intensity=0.5] - 发光强度
         * @returns {boolean}
         */
        enableHighlight: (bid, options) => sceneManager.enableHighlight(bid, options),
        /**
         * 禁用对象高亮
         * @param {string} [bid] - 对象 BID，不传则清除所有
         * @returns {boolean}
         */
        disableHighlight: (bid) => sceneManager.disableHighlight(bid),
        /** 获取当前高亮对象的 BID 列表 */
        getHighlightedObjects: () => sceneManager.getHighlightedObjects(),

        // ========== 天气效果 ==========
        /**
         * 设置下雪效果
         * @param {boolean} enabled - 是否启用
         * @param {Object} [config] - 配置选项
         * @param {number} [config.count=10000] - 雪量 (100-30000)
         * @param {number} [config.size=1.0] - 大小 (0.1-5.0)
         * @param {number} [config.speed=1.0] - 速度 (0.0-5.0)
         * @param {number} [config.opacity=0.8] - 透明度 (0.0-1.0)
         * @param {string} [config.color='#ffffff'] - 颜色
         */
        setSnow: (enabled, config) => sceneManager.setSnow(enabled, config),
        /** 更新下雪配置 */
        updateSnowConfig: (config) => sceneManager.updateSnowConfig(config),
        /** 获取下雪配置 */
        getSnowConfig: () => sceneManager.getSnowConfig(),

        /**
         * 设置下雨效果
         * @param {boolean} enabled - 是否启用
         * @param {Object} [config] - 配置选项
         * @param {number} [config.count=10000] - 雨量 (100-50000)
         * @param {number} [config.speed=2.0] - 雨速 (0.0-10.0)
         */
        setRain: (enabled, config) => sceneManager.setRain(enabled, config),
        /** 更新下雨配置 */
        updateRainConfig: (config) => sceneManager.updateRainConfig(config),
        /** 获取下雨配置 */
        getRainConfig: () => sceneManager.getRainConfig(),

        // ========== 特效系统 ==========
        /**
         * 创建特效
         * @param {string} type - 特效类型 ('shield')
         * @param {Object} config - 特效配置
         * @returns {BaseEffect} 特效实例
         */
        createEffect: (type, config) => sceneManager.vfxManager.createEffect(type, config),

        /**
         * 移除特效
         * @param {string} id - 特效 ID
         */
        removeEffect: (id) => sceneManager.vfxManager.removeEffect(id),

        /** 特效管理器 */
        vfxManager: sceneManager.vfxManager,

        // ========== 流动线 API ==========
        /**
         * 创建流动线
         * @param {Object} options - 配置选项
         * @param {THREE.Vector3[]} options.points - 路径点数组
         * @param {string} options.textureUrl - 纹理图片 URL
         * @param {number} [options.width=2.0] - 线条宽度
         * @param {number} [options.radius=1.0] - 转角圆角半径
         * @param {number} [options.speed=1.0] - 流动速度
         * @param {number} [options.repeat=10.0] - 纹理重复次数
         * @param {number} [options.opacity=1.0] - 透明度
         * @returns {string} 线条 ID
         */
        createLine: (options) => sceneManager.lineManager.createLine(options),

        /**
         * 移除流动线
         * @param {string} id - 线条 ID
         */
        removeLine: (id) => sceneManager.lineManager.removeLine(id),

        /**
         * 清除所有流动线
         */
        clearLines: () => sceneManager.lineManager.clear(),

        // ========== 生命周期 ==========
        /** 销毁实例，释放资源 */
        dispose: () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            // 未来可以在这里添加更多清理逻辑
        },

        // ========== 高级用法（不推荐直接使用） ==========
        /** 
         * 获取内部对象（高级用法，风险自负）
         * @deprecated 请优先使用上面的封装 API
         */
        _internal: {
            sceneManager,
            scene: sceneManager.scene,
            camera: sceneManager.camera,
            renderer: sceneManager.renderer
        }
    };
}
