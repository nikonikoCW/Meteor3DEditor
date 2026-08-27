import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BaseCameraControl } from './BaseCameraControl.js';

// 防止标签页恢复、系统休眠等情况产生超大帧间隔，导致自动旋转一次性追帧。
const MAX_UPDATE_DELTA_SECONDS = 0.1;

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

        // 页面恢复后的第一帧不补算后台经过的时间，仅作用于 OrbitControls。
        this.resetDeltaOnNextUpdate = false;
        this._onVisibilityChange = () => {
            if (!document.hidden) {
                this.resetDeltaOnNextUpdate = true;
            }
        };
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this._onVisibilityChange);
        }
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
            // 后台标签页不推进 OrbitControls；恢复后的第一帧从零开始。
            if (typeof document !== 'undefined' && document.hidden) return;

            const shouldResetDelta = this.resetDeltaOnNextUpdate === true;
            this.resetDeltaOnNextUpdate = false;
            const safeDelta = shouldResetDelta
                ? 0
                : (Number.isFinite(delta)
                    ? Math.min(Math.max(delta, 0), MAX_UPDATE_DELTA_SECONDS)
                    : undefined);
            this.orbitControls.update(safeDelta);
        }
    }

    /**
     * 开启或关闭围绕当前 OrbitControls target 的自动旋转。
     *
     * @param {boolean} enabled - 是否开启自动旋转
     * @param {number} [speed] - OrbitControls 自动旋转速度，负数表示反向
     * @returns {boolean}
     */
    setAutoRotate(enabled, speed) {
        if (typeof enabled !== 'boolean') {
            throw new TypeError('Auto rotate enabled must be a boolean');
        }

        if (speed !== undefined) {
            if (!Number.isFinite(speed)) {
                throw new TypeError('Auto rotate speed must be a finite number');
            }
            this.orbitControls.autoRotateSpeed = speed;
        }

        this.orbitControls.autoRotate = enabled;
        this.orbitControls.update(0);
        return true;
    }

    /**
     * 获取自动旋转状态。
     * @returns {{enabled:boolean,speed:number}}
     */
    getAutoRotate() {
        const { autoRotate, autoRotateSpeed } = this.orbitControls;
        return {
            enabled: autoRotate,
            speed: autoRotateSpeed
        };
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
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this._onVisibilityChange);
        }
        super.dispose();
        this.orbitControls.dispose();
    }
}
