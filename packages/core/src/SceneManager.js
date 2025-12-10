import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GisProjection } from './GisProjection.js';
import { StatsManager } from './StatsManager.js';

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
        this.gridHelper = null; // now used as custom plane grid
        this.gridVisible = false;
        this.gisConfig = null;
        this.gisProjection = null;

        // 性能监视器
        this.statsManager = new StatsManager({
            container: canvas.parentElement || document.body,
            position: 'top-right'
        });

        this.animate = this.animate.bind(this);
        this.animate();
    }

    /**
     * 动画循环
     * 负责渲染场景和更新控制器
     */
    animate() {
        requestAnimationFrame(this.animate);
        this.statsManager.begin();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
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
    }

    /**
     * 从场景中移除对象
     * @param {THREE.Object3D} object - 要移除的对象
     */
    removeObject(object) {
        this.scene.remove(object);
        this.objects = this.objects.filter(obj => obj !== object);
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
     * @param {{center:{lng:number,lat:number},range:{length:number,width:number},projection:string}} config
     */
    setGisConfig(config) {
        if (!config || !config.center) return;
        this.gisConfig = { ...config, gridVisible: config.gridVisible ?? this.gridVisible };
        this.gisProjection = new GisProjection({
            center: config.center,
            projection: config.projection || 'WGS84',
        });

        const length = config.range?.length || 30;
        const width = config.range?.width || 30;
        const widthSegments = Math.max(1, Math.round(width / 10));
        const lengthSegments = Math.max(1, Math.round(length / 10));
        this.setGridHelper(this.gisConfig.gridVisible, length, width, widthSegments, lengthSegments);
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
     */
    lngLatToWorld(lng, lat, height = 0) {
        if (!this.gisProjection) return new THREE.Vector3(0, 0, 0);
        const { east, north, up } = this.gisProjection.lngLatToEnu(lng, lat, height);
        return new THREE.Vector3(east, up, north);
    }

    /**
     * 世界坐标 -> 经纬度/高度
     * 假设 X 为东向（east），Z 为北向（north），Y 为高度（up）
     * @param {THREE.Vector3} worldPos
     * @returns {{lng:number,lat:number,height:number}|null}
     */
    worldToLngLat(worldPos) {
        if (!this.gisProjection || !worldPos) return null;
        const east = worldPos.x;
        const north = worldPos.z;
        const up = worldPos.y;
        const { lng, lat } = this.gisProjection.offsetMetersToLngLat(east, north);
        return { lng, lat, height: up };
    }
}
