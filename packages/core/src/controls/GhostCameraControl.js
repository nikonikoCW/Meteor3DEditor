import * as THREE from 'three';
import { BaseCameraControl } from './BaseCameraControl.js';

/**
 * 幽灵相机控制器（Ghost Mode）
 * WASD + QE + 鼠标控制，类似 CS 上帝模式
 */
export class GhostCameraControl extends BaseCameraControl {
    /**
     * @param {THREE.Camera} camera
     * @param {HTMLElement} domElement
     */
    constructor(camera, domElement) {
        super(camera, domElement);

        // 移动速度配置
        this.moveSpeed = 10;
        this.boostMultiplier = 2;

        // 视角灵敏度
        this.lookSpeed = 0.002;

        // 按键状态
        this.keys = {
            forward: false,   // W
            backward: false,  // S
            left: false,      // A
            right: false,     // D
            up: false,        // E
            down: false,      // Q
            boost: false      // Shift
        };

        // 鼠标状态
        this.isRightMouseDown = false;
        this.pointerLockEnabled = false;
        this.isPointerLocked = false;

        // 相机欧拉角
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

        // 临时向量
        this._moveDirection = new THREE.Vector3();
        this._right = new THREE.Vector3();
        this._forward = new THREE.Vector3();

        // 绑定事件处理器
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
    }

    /**
     * 启用幽灵模式
     * @param {Object} options
     * @param {boolean} options.pointerLock - 是否启用鼠标锁定
     */
    enable(options = {}) {
        super.enable(options);

        this.pointerLockEnabled = options.pointerLock || false;

        // 从相机当前朝向初始化欧拉角
        this.euler.setFromQuaternion(this.camera.quaternion);

        // 添加键盘事件
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);

        // 添加鼠标事件
        this.domElement.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('mousemove', this._onMouseMove);
        this.domElement.addEventListener('contextmenu', this._onContextMenu);

        // PointerLock 模式
        if (this.pointerLockEnabled) {
            document.addEventListener('pointerlockchange', this._onPointerLockChange);
            this.domElement.requestPointerLock();
        }
    }

    /**
     * 禁用幽灵模式
     */
    disable() {
        super.disable();

        // 重置按键状态
        Object.keys(this.keys).forEach(key => this.keys[key] = false);
        this.isRightMouseDown = false;

        // 移除事件监听
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        this.domElement.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('mousemove', this._onMouseMove);
        this.domElement.removeEventListener('contextmenu', this._onContextMenu);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);

        // 退出 PointerLock
        if (this.isPointerLocked) {
            document.exitPointerLock();
        }
    }

    /**
     * 每帧更新
     * @param {number} delta - 帧间隔（秒）
     */
    update(delta) {
        if (!this.enabled) return;

        const speed = this.moveSpeed * (this.keys.boost ? this.boostMultiplier : 1);
        const distance = speed * delta;

        // 计算前进方向（基于相机朝向，忽略 Y 轴）
        this.camera.getWorldDirection(this._forward);
        this._forward.y = 0;
        this._forward.normalize();

        // 计算右方向
        this._right.crossVectors(this._forward, new THREE.Vector3(0, 1, 0)).normalize();

        // 重置移动方向
        this._moveDirection.set(0, 0, 0);

        // 前后移动
        if (this.keys.forward) {
            this._moveDirection.add(this._forward);
        }
        if (this.keys.backward) {
            this._moveDirection.sub(this._forward);
        }

        // 左右移动
        if (this.keys.right) {
            this._moveDirection.add(this._right);
        }
        if (this.keys.left) {
            this._moveDirection.sub(this._right);
        }

        // 上下移动
        if (this.keys.up) {
            this._moveDirection.y += 1;
        }
        if (this.keys.down) {
            this._moveDirection.y -= 1;
        }

        // 归一化并应用移动
        if (this._moveDirection.lengthSq() > 0) {
            this._moveDirection.normalize();
            this.camera.position.addScaledVector(this._moveDirection, distance);
        }
    }

    // ========== 事件处理 ==========

    _onKeyDown(event) {
        if (!this.enabled) return;

        switch (event.code) {
            case 'KeyW': this.keys.forward = true; break;
            case 'KeyS': this.keys.backward = true; break;
            case 'KeyA': this.keys.left = true; break;
            case 'KeyD': this.keys.right = true; break;
            case 'KeyE': this.keys.up = true; break;
            case 'KeyQ': this.keys.down = true; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.keys.boost = true; break;
        }
    }

    _onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this.keys.forward = false; break;
            case 'KeyS': this.keys.backward = false; break;
            case 'KeyA': this.keys.left = false; break;
            case 'KeyD': this.keys.right = false; break;
            case 'KeyE': this.keys.up = false; break;
            case 'KeyQ': this.keys.down = false; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.keys.boost = false; break;
        }
    }

    _onMouseDown(event) {
        if (!this.enabled) return;

        // 右键按下时启用视角控制
        if (event.button === 2) {
            this.isRightMouseDown = true;
        }

        // 在 PointerLock 模式下，点击任意位置重新锁定
        if (this.pointerLockEnabled && !this.isPointerLocked) {
            this.domElement.requestPointerLock();
        }
    }

    _onMouseUp(event) {
        if (event.button === 2) {
            this.isRightMouseDown = false;
        }
    }

    _onMouseMove(event) {
        if (!this.enabled) return;

        // 只有在 PointerLock 或右键按下时才控制视角
        const canLook = this.isPointerLocked || this.isRightMouseDown;
        if (!canLook) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        // 更新欧拉角
        this.euler.y -= movementX * this.lookSpeed;
        this.euler.x -= movementY * this.lookSpeed;

        // 限制俯仰角（防止翻转）
        this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

        // 应用到相机
        this.camera.quaternion.setFromEuler(this.euler);
    }

    _onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.domElement;
        // 注意：ESC 退出时不自动切换模式，保持 Ghost 模式
    }

    _onContextMenu(event) {
        // 阻止右键菜单
        event.preventDefault();
    }

    /**
     * 销毁
     */
    dispose() {
        this.disable();
    }
}
