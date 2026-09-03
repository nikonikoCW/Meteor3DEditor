/**
 * 相机控制管理器
 * 负责注册、切换和更新相机控制模式
 */
export class CameraControlManager {
    /**
     * @param {THREE.Camera} camera
     * @param {HTMLElement} domElement
     */
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        /** @type {Map<string, BaseCameraControl>} */
        this.controls = new Map();

        /** @type {string|null} */
        this.activeMode = null;

        /** @type {BaseCameraControl|null} */
        this.activeControl = null;

        /** @type {Function|null} 模式切换回调 */
        this.onModeChange = null;
    }

    /**
     * 注册一个控制器
     * @param {string} name - 模式名称
     * @param {BaseCameraControl} control - 控制器实例
     */
    register(name, control) {
        this.controls.set(name, control);
    }

    /**
     * 切换控制模式
     * @param {string} name - 模式名称
     * @param {Object} options - 传递给控制器的选项
     * @returns {boolean} 是否切换成功
     */
    setMode(name, options = {}) {
        const control = this.controls.get(name);
        if (!control) {
            console.warn(`[CameraControlManager] Unknown mode: ${name}`);
            return false;
        }

        // 保存当前相机状态
        const position = this.camera.position.clone();
        const quaternion = this.camera.quaternion.clone();

        // 禁用当前控制器
        const previousMode = this.activeMode;
        if (this.activeControl) {
            this.activeControl.disable();
        }

        // 启用新控制器
        this.activeMode = name;
        this.activeControl = control;
        this.activeControl.enable(options);

        // 恢复相机状态
        this.camera.position.copy(position);
        this.camera.quaternion.copy(quaternion);

        // 触发回调
        if (this.onModeChange) {
            this.onModeChange({ mode: name, previous: previousMode });
        }

        return true;
    }

    /**
     * 获取当前模式
     * @returns {string|null}
     */
    getMode() {
        return this.activeMode;
    }

    /**
     * 获取当前激活的控制器
     * @returns {BaseCameraControl|null}
     */
    getActiveControl() {
        return this.activeControl;
    }

    /**
     * 每帧更新
     * @param {number} delta - 帧间隔时间（秒）
     */
    update(delta) {
        if (this.activeControl) {
            this.activeControl.update(delta);
        }
    }

    /**
     * 销毁所有控制器
     */
    dispose() {
        for (const control of this.controls.values()) {
            control.dispose();
        }
        this.controls.clear();
        this.activeControl = null;
        this.activeMode = null;
    }
}
