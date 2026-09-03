/**
 * 相机控制器基类
 * 所有相机控制模式都应继承此类
 */
export class BaseCameraControl {
    /**
     * @param {THREE.Camera} camera - Three.js 相机
     * @param {HTMLElement} domElement - 渲染器的 DOM 元素
     */
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.enabled = false;
    }

    /**
     * 启用控制器
     * @param {Object} options - 可选配置
     */
    enable(options = {}) {
        this.enabled = true;
    }

    /**
     * 禁用控制器
     */
    disable() {
        this.enabled = false;
    }

    /**
     * 每帧更新
     * @param {number} delta - 帧间隔时间（秒）
     */
    update(delta) {
        // 子类实现
    }

    /**
     * 销毁控制器，清理事件监听
     */
    dispose() {
        this.disable();
    }
}
