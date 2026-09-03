import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Group } from '@tweenjs/tween.js';
import { GeoCoordinateSystem } from './GeoCoordinateSystem.js';
import { TileMapManager } from './TileMapManager.js';
import { StatsManager } from './StatsManager.js';
import { TriangleStatsManager } from './TriangleStatsManager.js';
import { LabelManager } from './LabelManager.js';
import { OutlineManager } from './OutlineManager.js';
import { HighlightManager } from './HighlightManager.js';
import { SnowManager } from './SnowManager.js';
import { RainManager } from './RainManager.js';
import { VFXManager } from './VFXManager.js';
import { LineManager } from './LineManager.js';
import { CameraControlManager } from './CameraControlManager.js';
import { CameraNavigationManager } from './CameraNavigationManager.js';
import { OrbitCameraControl } from './controls/OrbitCameraControl.js';
import { GhostCameraControl } from './controls/GhostCameraControl.js';
import { RaycastManager } from './RaycastManager.js';
import { AnimationManager } from './AnimationManager.js';
import { BidRegistry, generateBid } from './BidRegistry.js';
import { ObjectTransformManager } from './ObjectTransformManager.js';

/**
 * 场景管理器
 * 负责 Three.js 场景、相机、渲染器和光照的初始化与管理
 */
export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.disposed = false;
        this.animationFrameId = null;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // 深灰色背景，便于观察
        // UI 辅助物使用独立场景，在主场景及后处理完成后单独渲染。
        // 这样 TransformControls 等辅助物不会进入 OutlinePass 的遮罩和深度计算。
        this.overlayScene = new THREE.Scene();

        // 初始化 Tween Group
        this.tweenGroup = new Group();

        // 环境光
        // const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // 增强环境光
        // this.scene.add(ambientLight);

        // // 平行光
        // const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        // directionalLight.position.set(10, 20, 10);
        // this.scene.add(directionalLight);

        // // 增加补光
        // const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        // fillLight.position.set(-10, 10, -10);
        // this.scene.add(fillLight);

        this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 10000);
        this.camera.position.set(5, 5, 5);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, logarithmicDepthBuffer: true }); // 开启 alpha 以防背景问题
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // 相机控制管理器
        this.controlManager = new CameraControlManager(this.camera, this.renderer.domElement);

        // 注册轨道控制模式
        const orbitControl = new OrbitCameraControl(this.camera, this.renderer.domElement);
        this.controlManager.register('orbit', orbitControl);
        this.orbitControl = orbitControl;

        // 注册幽灵控制模式
        const ghostControl = new GhostCameraControl(this.camera, this.renderer.domElement);
        this.controlManager.register('ghost', ghostControl);

        // 默认使用轨道模式
        this.controlManager.setMode('orbit');

        // 监听模式切换事件
        this.controlManager.onModeChange = (data) => {
            this.emit('control-mode-changed', data);
        };

        // 兼容旧代码：保留 controls 引用指向当前 OrbitControls
        this.controls = orbitControl.getOrbitControls();

        // 程序化相机导航（定位、聚焦和视角动画）
        this.cameraNavigationManager = new CameraNavigationManager(
            this.camera,
            this.controls,
            this.tweenGroup
        );

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.objects = []; // 跟踪所有可交互的对象
        this.bidRegistry = new BidRegistry();
        this.objectTransformManager = new ObjectTransformManager(this, this.tweenGroup);
        this.environmentUrl = null; // 当前环境贴图 URL
        this.geoSystem = null;      // Layer 1: 坐标系统
        this.tileMapManager = null; // Layer 2: 瓦片地图
        this.gisConfig = null;
        this.gridHelper = null; // 网格辅助平面
        this.gridVisible = false;

        // 性能监视器
        this.statsManager = new StatsManager({
            container: canvas.parentElement || document.body,
            position: 'top-right'
        });

        // 三角形统计管理器
        this.triangleStatsManager = new TriangleStatsManager(this.renderer, this.scene);

        // 标签管理器
        this.labelManager = new LabelManager(
            this.renderer,
            this.scene,
            this.camera,
            (lng, lat, h) => this.lngLatToWorld(lng, lat, h)
        );

        // 描边管理器
        this.outlineManager = new OutlineManager(
            this.renderer,
            this.scene,
            this.camera,
            canvas.parentElement || document.body
        );

        // 高亮管理器
        this.highlightManager = new HighlightManager();

        // 雪效管理器
        this.snowManager = new SnowManager(this.scene, this.camera);

        // 雨效管理器
        this.rainManager = new RainManager(this.renderer, this.scene, this.camera);

        // 特效管理器
        this.vfxManager = new VFXManager(this.scene, this.camera);

        // 流动线管理器
        this.lineManager = new LineManager(this.scene);

        // 射线检测管理器
        this.raycastManager = new RaycastManager();
        this.animationManager = new AnimationManager({
            onStateChange: (data) => this.emit('animation-state-changed', data)
        });

        // 事件系统
        this.events = {};
        this.isReady = false;

        // 帧时间追踪（用于 delta 计算）
        this.lastTime = 0;

        // 点击事件监听
        this._onCanvasClick = this._onCanvasClick.bind(this);
        this.canvas.addEventListener('click', this._onCanvasClick);

        this.animate = this.animate.bind(this);
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     */
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(data));
        }
    }

    /**
     * 设置场景就绪状态
     * @param {boolean} ready - 是否就绪
     */
    setReady(ready) {
        this.isReady = ready;
        if (ready) {
            this.emit('scene-ready', { isReady: true });
        }
    }

    /**
     * 动画循环
     * 负责渲染场景和更新控制器
     */
    animate(time) {
        if (this.disposed) return;
        this.animationFrameId = requestAnimationFrame(this.animate);

        // 计算帧间隔
        const delta = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.tweenGroup.update(time);
        this.statsManager.begin();

        // 更新相机控制器
        this.controlManager.update(delta);
        this.animationManager.update(delta);

        // 更新 GIS 瓦片地图
        if (this.tileMapManager) {
            this.tileMapManager.update(this.camera);
        }

        // 更新 3D Tiles
        if (this._tilesets && this._tilesets.length > 0) {
            for (const tilesRenderer of this._tilesets) {
                tilesRenderer.update();
            }
        }

        // 雨效预渲染（捕捉背景 FBO）
        if (this.rainManager) {
            this.rainManager.preRender();
        }

        // 如果有描边对象，使用后处理渲染；否则直接渲染
        const hasOutline = this.outlineManager.render();
        if (!hasOutline) {
            this.renderer.render(this.scene, this.camera);
        }
        this._renderOverlayScene();

        if (this.labelManager) {
            this.labelManager.update();
        }

        // 更新雪效
        if (this.snowManager) {
            this.snowManager.update(time);
        }

        // 更新雨效
        if (this.rainManager) {
            this.rainManager.update(time);
        }

        // 更新通用特效
        if (this.vfxManager) {
            this.vfxManager.update(delta, time / 1000);
        }

        // 更新流动线
        if (this.lineManager) {
            this.lineManager.update(delta);
        }

        this.statsManager.end();
    }

    /**
     * 在主场景之上渲染编辑器辅助物，不参与主场景后处理。
     * @private
     */
    _renderOverlayScene() {
        if (!this.overlayScene || this.overlayScene.children.length === 0) return;

        const autoClear = this.renderer.autoClear;
        this.renderer.autoClear = false;
        this.renderer.clearDepth();
        this.renderer.render(this.overlayScene, this.camera);
        this.renderer.autoClear = autoClear;
    }

    // ==================== 相机控制 API ====================

    /**
     * 设置相机控制模式
     * @param {'orbit'|'ghost'} mode - 控制模式
     * @param {Object} options - 模式选项
     * @param {boolean} options.pointerLock - (ghost 模式) 是否锁定鼠标
     * @returns {boolean} 是否切换成功
     * @example
     * // 切换到轨道模式
     * sceneManager.setControlMode('orbit');
     * 
     * // 切换到幽灵模式（不锁定鼠标，右键控制视角）
     * sceneManager.setControlMode('ghost');
     * 
     * // 切换到幽灵模式（锁定鼠标）
     * sceneManager.setControlMode('ghost', { pointerLock: true });
     */
    setControlMode(mode, options = {}) {
        return this.controlManager.setMode(mode, options);
    }

    /**
     * 获取当前相机控制模式
     * @returns {'orbit'|'ghost'|null}
     */
    getControlMode() {
        return this.controlManager.getMode();
    }

    /**
     * 开启或关闭相机围绕当前 OrbitControls target 的自动旋转。
     * 开启时会自动切换到 orbit 控制模式。
     *
     * @param {boolean} enabled - 是否开启自动旋转
     * @param {number} [speed] - 旋转速度，默认沿用当前值（OrbitControls 默认 2）
     * @returns {boolean}
     */
    setAutoRotate(enabled, speed) {
        if (enabled && this.getControlMode() !== 'orbit') {
            this.setControlMode('orbit');
        }
        return this.orbitControl.setAutoRotate(enabled, speed);
    }

    /**
     * 获取相机自动旋转状态。
     * @returns {{enabled:boolean,speed:number}}
     */
    getAutoRotate() {
        return this.orbitControl.getAutoRotate();
    }

    // ==================== 射线检测 API ====================

    /**
     * 处理 Canvas 点击事件
     * @private
     */
    _onCanvasClick(event) {
        // 只处理左键点击
        if (event.button !== 0) return;

        const rect = this.canvas.getBoundingClientRect();
        const screenPosition = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        // 执行射线检测（包括场景对象和影像地图）
        const raycastTargets = [...this.objects];
        if (this.tileMapManager && this.tileMapManager.mapGroup.visible) {
            raycastTargets.push(this.tileMapManager.mapGroup);
        }
        const intersects = this.raycastManager.raycast(
            screenPosition,
            this.camera,
            raycastTargets,
            { firstHitOnly: true }
        );

        // 构建事件数据
        const clickData = {
            // 屏幕坐标
            screenPosition: { x: event.clientX, y: event.clientY },
            // 原始事件
            originalEvent: event,
            // 命中对象
            object: null,
            // 世界坐标
            worldPosition: null,
            // 精确交点
            point: null,
            // 命中的面
            face: null,
            // 经纬度（GIS 模式）
            lngLat: null
        };

        if (intersects.length > 0) {
            const hit = intersects[0];
            clickData.object = hit.object;
            clickData.point = hit.point;
            clickData.face = hit.face;
            clickData.worldPosition = {
                x: hit.point.x,
                y: hit.point.y,
                z: hit.point.z
            };

            // 转换经纬度（如果 GIS 模式可用）
            if (this.geoSystem) {
                const lngLat = this.worldToLngLat(hit.point);
                if (lngLat) {
                    clickData.lngLat = lngLat;
                }
            }
        } else {
            // 未命中对象，与 Y=0 平面相交
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const groundPoint = this.raycastManager.raycastPlane(
                screenPosition,
                this.camera,
                plane
            );
            if (groundPoint) {
                clickData.worldPosition = {
                    x: groundPoint.x,
                    y: groundPoint.y,
                    z: groundPoint.z
                };
                clickData.point = groundPoint;

                if (this.geoSystem) {
                    const lngLat = this.worldToLngLat(groundPoint);
                    if (lngLat) {
                        clickData.lngLat = lngLat;
                    }
                }
            }
        }

        // 触发事件
        this.emit('scene-click', clickData);
    }

    /**
     * 执行射线检测
     * @param {THREE.Vector2} screenPosition - 归一化屏幕坐标 (-1 到 1)
     * @param {Object} options - 选项
     * @param {boolean} options.recursive - 是否递归检测子对象
     * @param {boolean} options.includeTileMap - 是否包含影像地图，默认 true
     * @returns {THREE.Intersection[]}
     */
    raycastObjects(screenPosition, options = {}) {
        const { includeTileMap = true, ...raycastOptions } = options;

        const targets = [...this.objects];
        if (includeTileMap && this.tileMapManager && this.tileMapManager.mapGroup.visible) {
            targets.push(this.tileMapManager.mapGroup);
        }

        return this.raycastManager.raycast(
            screenPosition,
            this.camera,
            targets,
            raycastOptions
        );
    }

    /**
     * 与 Y=0 平面相交
     * @param {THREE.Vector2} screenPosition - 归一化屏幕坐标
     * @returns {THREE.Vector3|null}
     */
    raycastGround(screenPosition) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        return this.raycastManager.raycastPlane(screenPosition, this.camera, plane);
    }

    // ==================== 性能监控 API ====================

    /**
     * 启用性能监视器
     * 在场景右上角显示 FPS 和 ms 延迟
     */
    enableStats() {
        this.statsManager.enable();
    }

    /**
     * 禁用性能监视器
     */
    disableStats() {
        this.statsManager.disable();
    }

    /**
     * 切换性能监视器显示状态
     * @param {boolean} show - true 显示，false 隐藏
     */
    toggleStats(show) {
        this.statsManager.toggle(show);
    }

    /**
     * 获取性能监视器是否启用
     * @returns {boolean}
     */
    isStatsEnabled() {
        return this.statsManager.isEnabled();
    }

    /**
     * 切换三角形统计显示状态
     * @param {boolean} show - true 启用，false 禁用
     * @param {function} callback - 回调函数，接收统计数据 {rendered, total}
     * @param {number} interval - 更新间隔（毫秒），默认 100ms
     */
    toggleTriangleStats(show, callback, interval = 100) {
        this.triangleStatsManager.toggle(show, callback, interval);
    }

    /**
     * 设置三角形统计回调函数（并启用实时更新）
     * @param {function} callback - 回调函数
     * @param {number} interval - 更新间隔（毫秒）
     */
    setTriangleStatsCallback(callback, interval = 100) {
        this.triangleStatsManager.startLiveUpdate(callback, interval);
    }

    /**
     * 获取三角形统计数据（单次获取）
     * @returns {{rendered: number, total: number}}
     */
    getTriangleStats() {
        return this.triangleStatsManager.getStats();
    }

    /**
     * 获取三角形统计是否启用
     * @returns {boolean}
     */
    isTriangleStatsEnabled() {
        return this.triangleStatsManager.isEnabled();
    }

    /**
     * 标记三角形统计缓存为脏，下次获取时重新计算
     * 在添加/删除对象时自动调用
     */
    markTriangleStatsDirty() {
        this.triangleStatsManager.markDirty();
    }

    // ==================== BVH Helper 可视化 API ====================

    /**
     * 设置 BVH Helper 可视化
     * @param {boolean} visible - 是否显示
     * @param {number} depth - 显示深度层级 (0-20)
     */
    setBVHHelper(visible, depth = 10) {
        if (visible) {
            this.raycastManager.showBVHHelpers(this.scene, this.objects, depth);
        } else {
            this.raycastManager.hideBVHHelpers(this.scene);
        }
    }

    /**
     * 更新 BVH Helper 显示深度
     * @param {number} depth - 深度层级 (0-20)
     */
    updateBVHDepth(depth) {
        this.raycastManager.updateBVHDepth(depth);
    }

    /**
     * 获取 BVH Helper 是否可见
     * @returns {boolean}
     */
    isBVHHelperVisible() {
        return this.raycastManager.isBVHHelpersVisible();
    }

    /**
     * 处理窗口大小调整
     * 更新相机纵横比和渲染器尺寸
     */
    onWindowResize(width, height) {
        if (!this.canvas) return;
        // 优先使用传入的宽高，否则尝试读取 canvas 的 clientWidth/clientHeight
        const w = width || this.canvas.clientWidth || 1;
        const h = height || this.canvas.clientHeight || 1;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false); // false: 不设置 canvas 的 style 宽高，只设置 buffer 宽高

        // 同步更新标签渲染器尺寸
        if (this.labelManager) {
            this.labelManager.onResize(w, h);
        }

        // 同步更新描边管理器尺寸
        if (this.outlineManager) {
            this.outlineManager.resize(w, h);
        }
    }

    /**
     * 设置相机的远裁切面 (far)
     * @param {number} far - 远远裁切面的值
     */
    setCameraFar(far) {
        if (this.camera && this.camera.isPerspectiveCamera) {
            this.camera.far = far;
            this.camera.updateProjectionMatrix();
        }
    }

    /**
     * 获取相机的远裁切面 (far)
     * @returns {number}
     */
    getCameraFar() {
        return this.camera ? this.camera.far : 1000000;
    }

    /**
     * 加载环境贴图 (HDR)
     * @param {string} url - HDR 文件 URL
     */
    loadEnvironment(url) {
        return new Promise((resolve, reject) => {
            const loader = new RGBELoader();
            loader.load(
                url,
                (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    if (this.disposed) {
                        texture.dispose();
                        resolve(null);
                        return;
                    }
                    const oldEnvironment = this.scene.environment;
                    this.scene.background = texture;
                    this.scene.environment = texture;
                    this.environmentUrl = url; // 记录当前环境贴图 URL
                    resolve(texture);
                    if (oldEnvironment && oldEnvironment !== texture) {
                        oldEnvironment.dispose();
                    }
                },
                undefined,
                (error) => {
                    console.error('加载 HDR 环境贴图失败:', error);
                    reject(error);
                }
            );
        });
    }

    /**
     * 添加对象到场景
     * @param {THREE.Object3D} object - 要添加的对象
     */
    addObject(object) {
        if (this.disposed) {
            this.disposeObjectResources(object);
            return false;
        }
        object.traverse((child) => {
            if (!child.userData.bid) child.userData.bid = generateBid();
        });
        this.bidRegistry.registerTree(object);
        this.scene.add(object);
        if (!this.objects.includes(object)) this.objects.push(object);
        this.animationManager.registerObject(object);
        this.markTriangleStatsDirty();

        // 自动构建 BVH 以加速射线检测
        this.raycastManager.buildBVH(object);
        return true;
    }

    /**
     * 添加只需覆盖显示、且不应参与主场景后处理的辅助对象。
     * @param {THREE.Object3D} object - 覆盖层对象
     * @returns {boolean} 是否成功
     */
    addOverlayObject(object) {
        if (this.disposed || !object?.isObject3D) return false;
        this.overlayScene.add(object);
        return true;
    }

    /**
     * 从覆盖层移除辅助对象。
     * @param {THREE.Object3D} object - 覆盖层对象
     * @returns {boolean} 是否成功
     */
    removeOverlayObject(object) {
        if (!object || object.parent !== this.overlayScene) return false;
        this.overlayScene.remove(object);
        return true;
    }

    /**
     * 从场景中移除对象
     * @param {THREE.Object3D} object - 要移除的对象
     */
    removeObject(object) {
        object.traverse((child) => {
            this.objectTransformManager.stop(child.userData?.bid);
        });
        this.animationManager.unregisterObject(object);

        // 销毁 BVH
        this.raycastManager.disposeBVH(object);

        this.bidRegistry.unregisterTree(object);
        object.removeFromParent();
        this.objects = this.objects.filter(obj => obj !== object);
        this.markTriangleStatsDirty();
    }

    /**
     * 通过 Three.js 运行时 UUID 查找场景中的对象。
     * 仅用于兼容或引擎内部逻辑；业务定位请使用 findObjectByBid。
     * @deprecated 业务层请使用 findObjectByBid()。
     * @param {string} uuid - Three.js 运行时 UUID
     * @returns {THREE.Object3D|null}
     */
    findObjectByUUID(uuid) {
        let found = null;
        this.scene.traverse((child) => {
            if (child.uuid === uuid) {
                found = child;
            }
        });
        return found;
    }

    /** Finds a scene node by its persistent business id. */
    findObjectByBid(bid) {
        return this.bidRegistry.getObject(bid);
    }

    /** Finds a scene node by BID, with runtime UUID fallback for legacy callers. */
    findObjectById(id) {
        return this.findObjectByBid(id) || this.findObjectByUUID(id);
    }

    /**
     * 将场景节点移动并旋转到目标局部变换。
     * @param {string} bid - 场景节点的持久化 BID
     * @param {{x: number, y: number, z: number}} position - 目标局部位置
     * @param {{x: number, y: number, z: number}} rotation - 目标局部欧拉角（弧度）
     * @param {number} [duration=0] - 动画时长（毫秒），0 表示立即完成
     * @returns {boolean} 是否找到并成功启动移动
     */
    moveTo(bid, position, rotation, duration = 0) {
        return this.objectTransformManager.moveTo(bid, position, rotation, duration);
    }

    /**
     * Set an object's visibility by BID.
     * @param {string} bid - Object BID.
     * @param {boolean} visible - Whether the object should be visible.
     * @returns {boolean} Whether the object was found and updated.
     */
    setObjectVisible(bid, visible) {
        const object = this.findObjectById(bid);
        if (!object) {
            console.warn(`[Visibility] Object not found by BID: ${bid}`);
            return false;
        }

        object.visible = Boolean(visible);
        return true;
    }

    /** Show an object by BID. */
    showObject(bid) {
        return this.setObjectVisible(bid, true);
    }

    /** Hide an object by BID. */
    hideObject(bid) {
        return this.setObjectVisible(bid, false);
    }

    /**
     * Get an object's local visibility flag by BID.
     * @returns {boolean|null} Visibility, or null when the object is not found.
     */
    isObjectVisible(bid) {
        const object = this.findObjectById(bid);
        if (!object) {
            console.warn(`[Visibility] Object not found by BID: ${bid}`);
            return null;
        }

        return object.visible;
    }

    /** 获取该 BID 所属模型可用的动画片段列表。 */
    getAnimations(bid) {
        const object = this.findObjectByBid(bid);
        return object ? this.animationManager.getAnimations(object) : [];
    }

    /** 获取该 BID 所属模型当前的运行时动画状态。 */
    getAnimationState(bid) {
        const object = this.findObjectByBid(bid);
        return object ? this.animationManager.getAnimationState(object) : null;
    }

    /** 通过名称、索引或包含二者之一的描述对象选择动画片段。 */
    setAnimationClip(bid, selector) {
        const object = this.findObjectByBid(bid);
        return object ? this.animationManager.setAnimationClip(object, selector) : false;
    }

    /** 开启或关闭该 BID 所属模型的动画；关闭时恢复初始姿势。 */
    setAnimationEnabled(bid, enabled) {
        const object = this.findObjectByBid(bid);
        return object ? this.animationManager.setAnimationEnabled(object, enabled) : false;
    }

    /** 播放或暂停该 BID 所属模型已开启的动画。 */
    setAnimationPlaying(bid, playing) {
        const object = this.findObjectByBid(bid);
        return object ? this.animationManager.setAnimationPlaying(object, playing) : false;
    }

    /** 设置动画播放速度，支持范围为 0.1 倍至 3 倍。 */
    setAnimationSpeed(bid, speed) {
        const object = this.findObjectByBid(bid);
        return object ? this.animationManager.setAnimationSpeed(object, speed) : false;
    }

    /**
     * 启用对象描边
     * @param {string} bid - 对象 BID
     * @param {Object} options - 配置选项
     * @param {number} [options.color=0x00ff00] - 描边颜色
     * @param {number} [options.thickness=1] - 描边粗细
     * @param {number} [options.strength=3] - 描边强度
     * @returns {boolean} 是否成功
     */
    enableOutline(bid, options = {}) {
        const object = this.findObjectById(bid);
        if (!object) {
            console.warn(`[OutlineManager] Object not found by BID: ${bid}`);
            return false;
        }
        return this.outlineManager.enable(object, options);
    }

    /**
     * 禁用对象描边
     * @param {string} bid - 对象 BID，不传则清除所有描边
     * @returns {boolean} 是否成功
     */
    disableOutline(bid) {
        if (!bid) {
            this.outlineManager.disableAll();
            return true;
        }
        const object = this.findObjectById(bid);
        if (!object) {
            console.warn(`[OutlineManager] Object not found by BID: ${bid}`);
            return false;
        }
        return this.outlineManager.disable(object);
    }

    /**
     * 获取当前描边对象的 BID 列表
     * @returns {string[]}
     */
    getOutlinedObjects() {
        return this.outlineManager.getOutlinedBIDs();
    }

    /**
     * 启用对象高亮
     * @param {string} bid - 对象 BID
     * @param {Object} options - 配置选项
     * @param {number} [options.color=0xffff00] - 高亮颜色
     * @param {number} [options.intensity=0.5] - 发光强度
     * @returns {boolean} 是否成功
     */
    enableHighlight(bid, options = {}) {
        const object = this.findObjectById(bid);
        if (!object) {
            console.warn(`[HighlightManager] Object not found by BID: ${bid}`);
            return false;
        }
        return this.highlightManager.enable(object, options);
    }

    /**
     * 禁用对象高亮
     * @param {string} bid - 对象 BID，不传则清除所有高亮
     * @returns {boolean} 是否成功
     */
    disableHighlight(bid) {
        if (!bid) {
            this.highlightManager.disableAll();
            return true;
        }
        const object = this.findObjectById(bid);
        console.log(`[disableHighlight] BID: ${bid}, Found: ${!!object}, Highlighted: ${this.highlightManager.getHighlightedBIDs()}`);
        if (!object) {
            console.warn(`[HighlightManager] Object not found by BID: ${bid}`);
            return false;
        }
        return this.highlightManager.disable(object);
    }

    /**
     * 获取当前高亮对象的 BID 列表
     * @returns {string[]}
     */
    getHighlightedObjects() {
        return this.highlightManager.getHighlightedBIDs();
    }

    /**
     * 清空场景
     * 移除所有可交互对象
     */
    clearScene({ disposeResources = true } = {}) {
        this.objectTransformManager.stopAll();
        // 移除所有跟踪的对象
        this.objects.forEach(object => {
            this.animationManager.unregisterObject(object);
            if (disposeResources) {
                this.disposeObjectResources(object);
            } else {
                this.scene.remove(object);
            }
        });
        this.objects = [];
        this.bidRegistry.clear();
        this.markTriangleStatsDirty();
    }

    /**
     * Permanently releases resources owned by a scene object tree.
     * This is intentionally separate from removeObject(), which must remain undoable.
     */
    disposeObjectResources(root) {
        if (!root) return;

        const geometries = new Set();
        const materials = new Set();
        const textures = new Set();
        const splatMeshes = new Set();
        const tilesRenderers = new Set();

        root.traverse((node) => {
            const splatMesh = node.userData?.splatMesh;
            if (splatMesh?.dispose) splatMeshes.add(splatMesh);

            const tilesRenderer = node.userData?.tilesRenderer;
            if (tilesRenderer?.dispose) tilesRenderers.add(tilesRenderer);

            if (node.geometry?.dispose) geometries.add(node.geometry);
            const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
            for (const material of nodeMaterials) {
                if (!material?.dispose) continue;
                materials.add(material);
                for (const value of Object.values(material)) {
                    if (value?.isTexture && value.dispose) textures.add(value);
                }
            }
        });

        for (const splatMesh of splatMeshes) splatMesh.dispose();
        for (const tilesRenderer of tilesRenderers) {
            tilesRenderer.dispose();
            if (this._tilesets) {
                this._tilesets = this._tilesets.filter(item => item !== tilesRenderer);
            }
        }

        this.raycastManager?.disposeBVH(root);
        root.removeFromParent();

        for (const texture of textures) texture.dispose();
        for (const material of materials) material.dispose();
        for (const geometry of geometries) geometry.dispose();
    }

    /**
     * 聚焦相机到所有场景物体。
     */
    fitCameraToScene() {
        // 拾取代理属于运行时交互数据，不应改变场景原有的自动取景范围。
        // Box3.expandByObject 不识别 visible 或自定义标记，因此在同步计算期间
        // 暂时屏蔽这类 helper 的 geometry，计算完成后立即恢复。
        const excludedGeometries = [];
        this.objects.forEach((root) => {
            root.traverse((object) => {
                if (!object.userData?.excludeFromCameraFit || !object.geometry) return;
                excludedGeometries.push({ object, geometry: object.geometry });
                object.geometry = undefined;
            });
        });

        try {
            return this.cameraNavigationManager.fitObjects(this.objects);
        } finally {
            excludedGeometries.forEach(({ object, geometry }) => {
                object.geometry = geometry;
            });
        }
    }

    /**
     * 根据 BID 从物体局部六面之一聚焦物体。
     *
     * @param {string} bid - 场景节点的持久化 BID
     * @param {Object} [options] - 聚焦配置
     * @returns {Promise<void>}
     */
    focusObject(bid, options = {}) {
        const object = this.findObjectByBid(bid);
        if (!object) {
            return Promise.reject(new Error(`Cannot focus object: BID not found (${bid})`));
        }
        return this.cameraNavigationManager.focusObject(object, options);
    }

    /**
     * 获取当前相机视角。
     */
    getView(callback) {
        return this.cameraNavigationManager.getView(callback);
    }

    /**
     * 设置相机视角（支持动画过渡）。
     */
    setView(options) {
        return this.cameraNavigationManager.setView(options);
    }

    /**
     * 设置网格辅助线可见性
     * @param {boolean} visible - 是否可见
     * @param {number} size - 网格大小（米）
     * @param {number} divisions - 分段数
     */
    setGridHelper(visible, length = 30, width = 30, widthSegments, lengthSegments) {
        this.gridVisible = visible;
        if (this.gisConfig) {
            this.gisConfig.gridVisible = visible;
        }
        // 先移除旧的网格
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.geometry?.dispose();
            this.gridHelper.material?.dispose();
            this.gridHelper = null;
        }

        if (visible) {
            const resolvedLength = Math.max(1, length);
            const resolvedWidth = Math.max(1, width);
            const segW = Math.max(1, widthSegments ?? Math.round(resolvedWidth / 10));
            const segL = Math.max(1, lengthSegments ?? Math.round(resolvedLength / 10));

            // 使用 PlaneGeometry 构建可分段网格（wireframe 方式）
            const geometry = new THREE.PlaneGeometry(resolvedWidth, resolvedLength, segW, segL);
            const material = new THREE.MeshBasicMaterial({
                color: 0x555555,
                wireframe: true,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            const gridPlane = new THREE.Mesh(geometry, material);
            gridPlane.rotation.x = -Math.PI / 2; // 放置到 XZ 平面
            this.gridHelper = gridPlane;
            this.scene.add(gridPlane);
        }
    }

    /**
     * 设置坐标轴辅助线可见性
     * @param {boolean} visible - 是否可见
     * @param {number} size - 坐标轴长度（默认 10）
     */
    setAxesHelper(visible, size = 10) {
        // 先移除旧的坐标轴
        if (this.axesHelper) {
            this.scene.remove(this.axesHelper);
            this.axesHelper.geometry?.dispose();
            this.axesHelper.material?.dispose();
            this.axesHelper = null;
        }

        if (visible) {
            this.axesHelper = new THREE.AxesHelper(size);
            this.scene.add(this.axesHelper);
        }
    }

    /**
     * 配置 GIS 投影：中心锚定在 (0,0,0)
     * @param {{center:{lng:number,lat:number},size:number,bounds:{maxLat,minLat,maxLng,minLng},enable:boolean}} config
     */
    setGisConfig(config) {
        if (!config || !config.center) return;

        // 保存完整配置
        this.gisConfig = {
            ...config,
            enable: config.enable !== false,
            gridVisible: config.gridVisible ?? this.gridVisible,
            bounds: config.bounds || null
        };

        // 只有 enable 为 true 时才初始化投影
        if (this.gisConfig.enable) {
            // 1. 初始化 Layer 1: 坐标系统
            if (!this.geoSystem) {
                this.geoSystem = new GeoCoordinateSystem(config.center.lng, config.center.lat);
            } else {
                this.geoSystem.setCenter(config.center.lng, config.center.lat);
            }

            // 2. 初始化 Layer 2: 瓦片地图管理器
            if (!this.tileMapManager) {
                this.tileMapManager = new TileMapManager(this.scene, this.geoSystem);
            }

            // 3. 更新地图状态
            const size = config.size || 1000;
            this.tileMapManager.updateMap(size, true);
            this.tileMapManager.setVisible(config.showBaseMap ?? false);

            // 4. 网格辅助线
            const segments = Math.max(1, Math.round(size / 10));
            this.setGridHelper(this.gisConfig.gridVisible, size, size, segments, segments);
        } else {
            // 禁用 GIS
            if (this.tileMapManager) {
                this.tileMapManager.dispose();
                this.tileMapManager = null;
            }
            this.geoSystem = null;
            this.setGridHelper(false);
        }
    }

    /**
     * 软删除 GIS 配置：保留配置数据但设置 enable 为 false
     * 用于"移除 GIS"功能，保存后可以恢复
     */
    clearGisConfig() {
        if (this.gisConfig) {
            this.gisConfig.enable = false;
        }
        if (this.tileMapManager) {
            this.tileMapManager.dispose();
            this.tileMapManager = null;
        }
        this.geoSystem = null;
        this.setGridHelper(false);
        this.emitGisConfigUpdated();
    }

    emitGisConfigUpdated() {
        if (typeof window !== 'undefined') {
            const detail = this.gisConfig ? { ...this.gisConfig } : null;
            window.dispatchEvent(new CustomEvent('gis-config-updated', { detail }));
        }
    }

    /**
     * 经纬度 -> Three.js 世界坐标
     * east -> +X, north -> -Z, up -> +Y
     * @param {number} lng - 经度
     * @param {number} lat - 纬度
     * @param {number} [height=0] - 高度（米）
     * @returns {THREE.Vector3|null} 世界坐标，GIS 未配置时返回 null
     */
    lngLatToWorld(lng, lat, height = 0) {
        if (!this.geoSystem) {
            console.warn('[Meteor3D] GIS 未配置，无法使用经纬度坐标转换。请先调用 setGisConfig() 配置 GIS 中心点。');
            return null;
        }
        const { x, y, z } = this.geoSystem.project(lng, lat, height);
        return new THREE.Vector3(x, y, z);
    }

    /**
     * 世界坐标 -> 经纬度/高度
     * 假设 X 为东向（east），-Z 为北向（north），Y 为高度（up）
     * @param {THREE.Vector3} worldPos - 世界坐标
     * @returns {{lng:number,lat:number,height:number}|null} GIS 未配置时返回 null
     */
    worldToLngLat(worldPos) {
        if (!this.geoSystem) {
            console.warn('[Meteor3D] GIS 未配置，无法使用坐标转换。请先调用 setGisConfig() 配置 GIS 中心点。');
            return null;
        }
        if (!worldPos) return null;

        const { lon, lat } = this.geoSystem.unproject(worldPos.x, worldPos.z);
        return { lng: lon, lat, height: worldPos.y };
    }

    /**
     * 设置卫星影像底图
     * @param {string|null} url - 底图图片 URL，null 表示移除底图
     * @param {Object|null} bounds - 边界 {minLng, minLat, maxLng, maxLat}
     * @param {number|null} size - 场景尺寸（米）
     * @param {boolean} visible - 是否显示底图
     */
    setBaseMap(url, bounds, size, visible) {
        // 如果正在加载同一个 URL 且 size 相同，直接返回
        if (visible && url && this.baseMapLoading === url && this.baseMapLoadingSize === size) {
            return;
        }

        // 移除旧底图
        if (this.baseMapMesh) {
            this.scene.remove(this.baseMapMesh);
            if (this.baseMapMesh.geometry) this.baseMapMesh.geometry.dispose();
            if (this.baseMapMesh.material) {
                if (this.baseMapMesh.material.map) this.baseMapMesh.material.map.dispose();
                this.baseMapMesh.material.dispose();
            }
            this.baseMapMesh = null;
        }

        if (!visible || !url || !bounds || !size) {
            this.baseMapLoading = null;
            this.baseMapLoadingSize = null;
            return;
        }

        // 标记正在加载（包含 size）
        this.baseMapLoading = url;
        this.baseMapLoadingSize = size;

        // 加载底图纹理（添加时间戳防止缓存）
        const loader = new THREE.TextureLoader();
        const urlWithCacheBust = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
        loader.load(
            urlWithCacheBust,
            (texture) => {
                // 检查是否仍然是当前请求的 URL
                if (this.disposed || this.baseMapLoading !== url) {
                    texture.dispose();
                    return;
                }

                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;

                // 创建平面几何体（与场景尺寸匹配）
                const geometry = new THREE.PlaneGeometry(size, size);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    transparent: false
                });

                const mesh = new THREE.Mesh(geometry, material);
                // 放置在 XZ 平面上，Y 略微下沉以避免与网格冲突
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.y = -0.1;

                this.baseMapMesh = mesh;
                this.baseMapLoading = null;
                this.scene.add(mesh);
            },
            undefined,
            (error) => {
                console.error('加载底图失败:', error);
                this.baseMapLoading = null;
            }
        );
    }

    // ==================== 天气效果 API ====================

    /**
     * 设置下雪效果开关
     * @param {boolean} enabled - 是否启用
     * @param {Object} [config] - 可选的初始配置
     * @param {number} [config.count] - 雪量 (100-30000)
     * @param {number} [config.size] - 大小 (0.1-5.0)
     * @param {number} [config.speed] - 速度 (0.0-5.0)
     * @param {number} [config.opacity] - 透明度 (0.0-1.0)
     * @param {string} [config.color] - 颜色 (hex string)
     */
    setSnow(enabled, config) {
        if (this.snowManager) {
            this.snowManager.setEnabled(enabled, config);
        }
    }

    /**
     * 更新下雪效果配置
     * @param {Object} config - 配置对象
     */
    updateSnowConfig(config) {
        if (this.snowManager) {
            this.snowManager.updateConfig(config);
        }
    }

    /**
     * 获取下雪效果配置
     * @returns {Object} 当前配置
     */
    getSnowConfig() {
        return this.snowManager ? this.snowManager.getConfig() : null;
    }

    /**
     * 设置下雨效果开关
     * @param {boolean} enabled - 是否启用
     * @param {Object} [config] - 可选的初始配置
     * @param {number} [config.count] - 雨量 (100-50000)
     * @param {number} [config.speed] - 速度 (0.0-10.0)
     */
    setRain(enabled, config) {
        if (this.rainManager) {
            this.rainManager.setEnabled(enabled, config);
        }
    }

    /**
     * 更新下雨效果配置
     * @param {Object} config - 配置对象
     */
    updateRainConfig(config) {
        if (this.rainManager) {
            this.rainManager.updateConfig(config);
        }
    }

    /**
     * 获取下雨效果配置
     * @returns {Object} 当前配置
     */
    getRainConfig() {
        return this.rainManager ? this.rainManager.getConfig() : null;
    }

    /** Permanently destroys this engine instance and all resources it owns. */
    dispose() {
        if (this.disposed) return;
        this.disposed = true;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.renderer?.setAnimationLoop?.(null);
        this.canvas?.removeEventListener('click', this._onCanvasClick);

        this.clearScene({ disposeResources: true });

        if (this._tilesets) {
            for (const tilesRenderer of this._tilesets) tilesRenderer.dispose?.();
            this._tilesets = [];
        }

        const sparkRenderer = this._sparkRenderer;
        if (sparkRenderer) {
            sparkRenderer.autoUpdate = false;
            if (sparkRenderer.updateTimeoutId !== -1) {
                clearTimeout(sparkRenderer.updateTimeoutId);
                sparkRenderer.updateTimeoutId = -1;
            }
            if (sparkRenderer.sortTimeoutId !== -1) {
                clearTimeout(sparkRenderer.sortTimeoutId);
                sparkRenderer.sortTimeoutId = -1;
            }
            sparkRenderer.clearSplats?.();
            sparkRenderer.removeFromParent();
            sparkRenderer.dispose?.();
            sparkRenderer.geometry?.dispose();
            sparkRenderer.material?.dispose();
            this._sparkRenderer = null;
        }

        this.tileMapManager?.dispose();
        this.tileMapManager = null;
        this.setGridHelper(false);
        this.setAxesHelper(false);
        this.setBaseMap(null, null, null, false);

        this.controlManager?.dispose();
        this.animationManager?.dispose();
        this.objectTransformManager?.dispose();
        this.statsManager?.disable();
        this.triangleStatsManager?.dispose();
        this.labelManager?.dispose();
        this.outlineManager?.dispose();
        this.highlightManager?.dispose();
        this.snowManager?.dispose();
        this.rainManager?.dispose();
        this.vfxManager?.clear();
        this.lineManager?.clear();

        const environment = this.scene.environment;
        if (environment?.dispose) environment.dispose();
        if (this.scene.background?.isTexture && this.scene.background !== environment) {
            this.scene.background.dispose();
        }
        this.scene.environment = null;
        this.scene.background = null;
        this.scene.clear();
        this.overlayScene?.clear();
        this.overlayScene = null;

        this.renderer?.renderLists?.dispose();
        this.renderer?.dispose();
        this.renderer?.forceContextLoss?.();

        this.events = {};
        this.canvas = null;
    }
}
