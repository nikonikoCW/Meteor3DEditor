import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export class ThumbnailGenerator {
    constructor(width = 256, height = 256) {
        this.width = width;
        this.height = height;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333);

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: false,
            powerPreference: "high-performance" // 优先使用高性能显卡
        });
        this.renderer.setSize(width, height);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // 环境贴图 (只需生成一次)
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnvironment = new RoomEnvironment();
        this.scene.environment = pmremGenerator.fromScene(roomEnvironment).texture;
        // 记得清理 pmrem 及其生成的临时资源，但在复用实例时不清理 texture
        pmremGenerator.dispose();
        roomEnvironment.dispose();

        // 灯光组
        this.setupLights();

        // 加载器初始化
        const dracoLoader = new DRACOLoader();
        // 建议：改为本地路径，例如 '/draco/'
        dracoLoader.setDecoderPath('/draco/');

        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(dracoLoader);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(5, 10, 7);
        this.scene.add(mainLight);
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
        fillLight.position.set(-5, 0, -5);
        this.scene.add(fillLight);
        const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
        topLight.position.set(0, 10, 0);
        this.scene.add(topLight);
    }

    async generate(file) {
        const url = URL.createObjectURL(file);
        let model = null;

        try {
            model = await this.loadModel(url);

            // 1. 添加到场景
            this.scene.add(model);

            // 2. 自适应相机 (更通用的算法)
            this.fitCameraToObject(model);

            // 3. 渲染
            this.renderer.render(this.scene, this.camera);

            // 4. 生成 Blob
            return new Promise((resolve) => {
                this.renderer.domElement.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.85);
            });

        } catch (error) {
            console.error('缩略图生成失败:', error);
            throw error;
        } finally {
            // 5. 深度清理资源 (至关重要)
            if (model) {
                this.scene.remove(model);
                this.cleanupModel(model); // 彻底释放显存
            }
            URL.revokeObjectURL(url);
        }
    }

    /**
     * 更科学的相机自适应算法
     */
    fitCameraToObject(object) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // 居中模型
        object.position.x += (object.position.x - center.x);
        object.position.y += (object.position.y - center.y);
        object.position.z += (object.position.z - center.z);

        // 计算相机距离
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.6; // 稍微宽松一点的边距

        // 设置相机位置 (等轴侧视角)
        const direction = new THREE.Vector3(1, 1, 1).normalize(); // 对角线方向
        this.camera.position.copy(direction.multiplyScalar(cameraZ));
        this.camera.lookAt(0, 0, 0);

        // 更新投影矩阵
        this.camera.updateProjectionMatrix();
    }

    /**
     * 递归清理几何体和材质，防止显存泄漏
     */
    cleanupModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => this.disposeMaterial(m));
                    } else {
                        this.disposeMaterial(child.material);
                    }
                }
            }
        });
    }

    disposeMaterial(material) {
        material.dispose();
        // 清理材质中的纹理
        for (const key of Object.keys(material)) {
            const value = material[key];
            if (value && typeof value === 'object' && 'minFilter' in value) {
                value.dispose(); // 这是一个 Texture
            }
        }
    }

    loadModel(url) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
        });
    }

    dispose() {
        this.renderer.dispose();
        if (this.scene.environment) this.scene.environment.dispose();
        // 如果不再需要 GLTFLoader 也可以把 Draco 实例 dispose 掉
        this.gltfLoader.dracoLoader.dispose();
    }
}
