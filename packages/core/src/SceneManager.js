import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GisProjection } from './GisProjection.js';
import { StatsManager } from './StatsManager.js';
import { TriangleStatsManager } from './TriangleStatsManager.js';
import { LabelManager } from './LabelManager.js';
import { OutlineManager } from './OutlineManager.js';

/**
 * 场景管理器
 * 负责 Three.js 场景、相机、渲染器和光照的初始化与管理
 */
export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333); // 深灰色背景，便于观察

        // 网格辅助线
        // const gridHelper = new THREE.GridHelper(500, 30);
        // this.scene.add(gridHelper);

        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // 增强环境光
        this.scene.add(ambientLight);

        // 平行光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // 增加补光
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);

        this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 5);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); // 开启 alpha 以防背景问题
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.objects = []; // 跟踪所有可交互的对象
        this.environmentUrl = null; // 当前环境贴图 URL
        this.gisProjection = null;
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

        // 事件系统
        this.events = {};
        this.isReady = false;

        this.animate = this.animate.bind(this);
        this.animate();
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
    animate() {
        requestAnimationFrame(this.animate);
        this.statsManager.begin();
        this.controls.update();

        // 如果有描边对象，使用后处理渲染；否则直接渲染
        const hasOutline = this.outlineManager.render();
        if (!hasOutline) {
            this.renderer.render(this.scene, this.camera);
        }

        if (this.labelManager) {
            this.labelManager.update();
        }
        this.statsManager.end();
    }

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
                    this.scene.background = texture;
                    this.scene.environment = texture;
                    this.environmentUrl = url; // 记录当前环境贴图 URL
                    resolve(texture);
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
        this.scene.add(object);
        this.objects.push(object);
        this.markTriangleStatsDirty();
    }

    /**
     * 从场景中移除对象
     * @param {THREE.Object3D} object - 要移除的对象
     */
    removeObject(object) {
        this.scene.remove(object);
        this.objects = this.objects.filter(obj => obj !== object);
        this.markTriangleStatsDirty();
    }

    /**
     * 通过 UUID 查找场景中的对象
     * @param {string} uuid - 对象 UUID
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

    /**
     * 启用对象描边
     * @param {string} uuid - 对象 UUID
     * @param {Object} options - 配置选项
     * @param {number} [options.color=0x00ff00] - 描边颜色
     * @param {number} [options.thickness=1] - 描边粗细
     * @param {number} [options.strength=3] - 描边强度
     * @returns {boolean} 是否成功
     */
    enableOutline(uuid, options = {}) {
        const object = this.findObjectByUUID(uuid);
        if (!object) {
            console.warn(`[OutlineManager] Object not found: ${uuid}`);
            return false;
        }
        return this.outlineManager.enable(object, options);
    }

    /**
     * 禁用对象描边
     * @param {string} uuid - 对象 UUID，不传则清除所有描边
     * @returns {boolean} 是否成功
     */
    disableOutline(uuid) {
        if (!uuid) {
            this.outlineManager.disableAll();
            return true;
        }
        const object = this.findObjectByUUID(uuid);
        if (!object) {
            console.warn(`[OutlineManager] Object not found: ${uuid}`);
            return false;
        }
        return this.outlineManager.disable(object);
    }

    /**
     * 获取当前描边对象的 UUID 列表
     * @returns {string[]}
     */
    getOutlinedObjects() {
        return this.outlineManager.getOutlinedUUIDs();
    }

    /**
     * 清空场景
     * 移除所有可交互对象
     */
    clearScene() {
        // 移除所有跟踪的对象
        this.objects.forEach(object => {
            this.scene.remove(object);
        });
        this.objects = [];
        this.markTriangleStatsDirty();
    }

    /**
     * 聚焦相机到所有物体
     * 计算包围盒并调整相机位置
     */
    fitCameraToScene() {
        if (this.objects.length === 0) return;

        const box = new THREE.Box3();

        // 计算所有对象的包围盒
        this.objects.forEach(obj => {
            box.expandByObject(obj);
        });

        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // 调整 FOV 距离
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
        cameraZ *= 1.5; // 增加一点缓冲距离

        // 设置相机位置
        const direction = this.camera.position.clone().sub(this.controls.target).normalize();
        const newPos = direction.multiplyScalar(cameraZ).add(center);

        this.camera.position.copy(newPos);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
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

        this.emitGisConfigUpdated();
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
            this.gisProjection = new GisProjection({
                center: config.center
            });

            const size = config.size || 30;
            const segments = Math.max(1, Math.round(size / 10));
            this.setGridHelper(this.gisConfig.gridVisible, size, size, segments, segments);
        } else {
            this.gisProjection = null;
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
        this.gisProjection = null;
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
     * east -> +X, north -> +Z, up -> +Y
     * @param {number} lng - 经度
     * @param {number} lat - 纬度
     * @param {number} [height=0] - 高度（米）
     * @returns {THREE.Vector3|null} 世界坐标，GIS 未配置时返回 null
     */
    lngLatToWorld(lng, lat, height = 0) {
        if (!this.gisProjection) {
            console.warn('[Meteor3D] GIS 未配置，无法使用经纬度坐标转换。请先调用 setGisConfig() 配置 GIS 中心点。');
            return null;
        }
        const { east, north, up } = this.gisProjection.lngLatToEnu(lng, lat, height);
        return new THREE.Vector3(east, up, north);
    }

    /**
     * 世界坐标 -> 经纬度/高度
     * 假设 X 为东向（east），Z 为北向（north），Y 为高度（up）
     * @param {THREE.Vector3} worldPos - 世界坐标
     * @returns {{lng:number,lat:number,height:number}|null} GIS 未配置时返回 null
     */
    worldToLngLat(worldPos) {
        if (!this.gisProjection) {
            console.warn('[Meteor3D] GIS 未配置，无法使用坐标转换。请先调用 setGisConfig() 配置 GIS 中心点。');
            return null;
        }
        if (!worldPos) return null;
        const east = worldPos.x;
        const north = worldPos.z;
        const up = worldPos.y;
        const { lng, lat } = this.gisProjection.offsetMetersToLngLat(east, north);
        return { lng, lat, height: up };
    }

    /**
     * 设置卫星影像底图
     * @param {string|null} url - 底图图片 URL，null 表示移除底图
     * @param {Object|null} bounds - 边界 {minLng, minLat, maxLng, maxLat}
     * @param {number|null} size - 场景尺寸（米）
     * @param {boolean} visible - 是否显示底图
     */
    setBaseMap(url, bounds, size, visible) {
        // 如果正在加载同一个 URL，直接返回
        if (visible && url && this.baseMapLoading === url) {
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
            return;
        }

        // 标记正在加载
        this.baseMapLoading = url;

        // 加载底图纹理
        const loader = new THREE.TextureLoader();
        loader.load(
            url,
            (texture) => {
                // 检查是否仍然是当前请求的 URL
                if (this.baseMapLoading !== url) return;

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
                    transparent: true,
                    opacity: 1.0
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
}
