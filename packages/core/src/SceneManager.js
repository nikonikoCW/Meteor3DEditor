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
        this.scene.background = new THREE.Color(0xaaaaaa);

        // 网格辅助线
        const gridHelper = new THREE.GridHelper(20, 20);
        this.scene.add(gridHelper);

        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // 平行光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 5);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
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

        window.addEventListener('resize', this.onWindowResize.bind(this));
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
    onWindowResize() {
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
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
}
