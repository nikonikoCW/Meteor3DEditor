import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BaseCameraControl } from './BaseCameraControl.js';

/**
 * 轨道相机控制器
 * 封装 Three.js OrbitControls
 */
export class OrbitCameraControl extends BaseCameraControl {
    /**
     * @param {THREE.Camera} camera
     * @param {HTMLElement} domElement
     */
    constructor(camera, domElement) {
        super(camera, domElement);

        this.orbitControls = new OrbitControls(camera, domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.enabled = false; // 默认禁用，由 enable() 激活
    }

    /**
     * 启用轨道控制
     */
    enable(options = {}) {
        super.enable(options);
        this.orbitControls.enabled = true;
    }

    /**
     * 禁用轨道控制
     */
    disable() {
        super.disable();
        this.orbitControls.enabled = false;
    }

    /**
     * 每帧更新
     */
    update(delta) {
        if (this.enabled) {
            this.orbitControls.update();
        }
    }

    /**
     * 获取 OrbitControls 实例（用于访问 target 等属性）
     */
    getOrbitControls() {
        return this.orbitControls;
    }

    /**
     * 销毁
     */
    dispose() {
        super.dispose();
        this.orbitControls.dispose();
    }
}
