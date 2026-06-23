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

        // 从其他控制模式切回 Orbit 时，用于保持当前相机位置和朝向。
        // 初次启用保持 null，让 OrbitControls 使用默认 target。
        this.resumeTargetDistance = null;
    }

    /**
     * 启用轨道控制
     */
    enable(options = {}) {
        super.enable(options);

        if (this.resumeTargetDistance !== null) {
            const direction = this.camera.getWorldDirection(
                this.orbitControls.target.clone()
            );

            this.orbitControls.target
                .copy(this.camera.position)
                .addScaledVector(direction, this.resumeTargetDistance);
        }

        this.orbitControls.enabled = true;
        this.orbitControls.update();
    }

    /**
     * 禁用轨道控制
     */
    disable() {
        if (this.enabled) {
            this.resumeTargetDistance = Math.max(
                this.camera.position.distanceTo(this.orbitControls.target),
                0.001
            );
        }

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
