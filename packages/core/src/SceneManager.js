import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

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
        const gridHelper = new THREE.GridHelper(20, 20);
        this.scene.add(gridHelper);

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

        this.animate = this.animate.bind(this);
        this.animate();
    }

    /**
     * 动画循环
     * 负责渲染场景和更新控制器
     */
    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
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
}
