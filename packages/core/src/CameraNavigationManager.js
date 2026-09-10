import * as THREE from 'three';
import { Tween, Easing } from '@tweenjs/tween.js';

const FOCUS_DIRECTIONS = Object.freeze({
    front: Object.freeze([0, 0, 1]),
    back: Object.freeze([0, 0, -1]),
    left: Object.freeze([-1, 0, 0]),
    right: Object.freeze([1, 0, 0]),
    top: Object.freeze([0, 1, 0]),
    bottom: Object.freeze([0, -1, 0])
});

/**
 * 程序化相机导航管理器。
 * 负责视角读写、场景适配、聚焦物体与实时跟随；控制模式由 SceneManager 协调。
 */
export class CameraNavigationManager {
    constructor(camera, controls, tweenGroup) {
        this.camera = camera;
        this.controls = controls;
        this.tweenGroup = tweenGroup;
        this._activeNavigation = null;
        this._follow = null;
        this._position = new THREE.Vector3();
        this._quaternion = new THREE.Quaternion();
        this._cameraGoal = new THREE.Vector3();
        this.disposed = false;
    }

    /**
     * 校验跟随配置，不修改运行时状态，供场景层在切换控制模式前调用。
     * @param {Object} [options={}] - 跟随配置。
     * @returns {{cameraOffset:THREE.Vector3,smoothing:number,viewUp:THREE.Vector3,roll:number}}
     * @throws {TypeError|RangeError|Error} 配置非法或 Manager 已销毁。
     */
    validateFollowOptions(options = {}) {
        if (this.disposed) throw new Error('followObject: manager has been disposed');
        if (!options || typeof options !== 'object' || Array.isArray(options)) {
            throw new TypeError('followObject: options must be an object');
        }
        if ('offset' in options || 'targetOffset' in options) {
            throw new TypeError('followObject: offset and targetOffset are not supported; use distance and rotation');
        }
        const { distance = 5, rotation = {}, smoothing = 6 } = options;
        if (!Number.isFinite(smoothing) || smoothing < 0) {
            throw new RangeError('followObject: smoothing must be finite and non-negative');
        }
        if (!Number.isFinite(distance) || distance <= 0) {
            throw new RangeError('followObject: distance must be finite and positive');
        }
        if (!rotation || typeof rotation !== 'object' || Array.isArray(rotation)) {
            throw new TypeError('followObject: rotation must be an object');
        }
        const { pitch = 0, yaw = 0, roll: rollDegrees = 0 } = rotation;
        if (![pitch, yaw, rollDegrees].every(Number.isFinite)) {
            throw new TypeError('followObject: pitch, yaw and roll must be finite degrees');
        }
        if (pitch < -90 || pitch > 90) {
            throw new RangeError('followObject: pitch must be between -90 and 90 degrees');
        }
        const p = THREE.MathUtils.degToRad(pitch);
        const y = THREE.MathUtils.degToRad(yaw % 360);
        const roll = THREE.MathUtils.degToRad(rollDegrees % 360);
        const cameraOffset = new THREE.Vector3(
            distance * Math.cos(p) * Math.sin(y),
            -distance * Math.sin(p),
            -distance * Math.cos(p) * Math.cos(y)
        );
        // 使用俯仰切线作为上方向，支持正上方和正下方视角。
        const viewUp = new THREE.Vector3(Math.sin(p) * Math.sin(y), Math.cos(p), -Math.sin(p) * Math.cos(y));
        return { cameraOffset, smoothing, viewUp, roll };
    }

    /**
     * 跟随已经由场景层解析的节点；只处理镜头和轨道输入，不切换控制模式。
     * @param {THREE.Object3D} object - 目标节点。
     * @param {Object} [options={}] - 配置语义见 SDK followObject。
     * @returns {boolean} 目标不存在时返回 false。
     */
    followObject(object, options = {}) {
        const { cameraOffset, smoothing, viewUp, roll } = this.validateFollowOptions(options);
        if (!object) return false;
        this.stopFollowing();
        this._stopActiveNavigation();
        const enabled = this.controls.enabled;
        // Flush any residual OrbitControls damping without changing the current view.
        const position = this.camera.position.clone();
        const target = this.controls.target.clone();
        const quaternion = this.camera.quaternion.clone();
        const damping = this.controls.enableDamping;
        const autoRotate = this.controls.autoRotate;
        this.controls.enableDamping = false;
        this.controls.autoRotate = false;
        this.controls.update();
        this.controls.enableDamping = damping;
        this.controls.autoRotate = autoRotate;
        this.camera.position.copy(position);
        this.camera.quaternion.copy(quaternion);
        this.controls.target.copy(target);
        this.controls.enabled = false;
        const orbitQuaternion = object.getWorldQuaternion(new THREE.Quaternion());
        this._follow = { object, cameraOffset, smoothing, enabled, orbitQuaternion,
            viewUp, roll, originalUp: this.camera.up.clone() };
        this.update(0);
        return true;
    }

    /** Stop following, retaining the view and restoring orbit input. Safe to repeat. */
    stopFollowing() {
        if (!this._follow) return false;
        this.controls.enabled = this._follow.enabled;
        this.camera.up.copy(this._follow.originalUp);
        this.camera.lookAt(this.controls.target);
        this._follow = null;
        return true;
    }

    get isFollowing() { return this._follow !== null; }

    /** Release a followed node when it or an ancestor is removed. */
    releaseObject(root) {
        for (let node = this._follow?.object; node; node = node.parent) {
            if (node === root) { this.stopFollowing(); break; }
        }
    }

    /** Advance using seconds, after object animation and before rendering. */
    update(delta) {
        if (!this._follow || this.disposed) return;
        const { object, cameraOffset, smoothing, orbitQuaternion, viewUp, roll } = this._follow;
        object.getWorldPosition(this._position);
        object.getWorldQuaternion(this._quaternion);
        const seconds = Number.isFinite(delta) ? Math.max(0, delta) : 0;
        const alpha = smoothing === 0 ? 1 : -Math.expm1(-smoothing * seconds);
        // 平滑球面坐标系的旋转，不对世界位置做直线插值，始终保持指定半径。
        orbitQuaternion.slerp(this._quaternion, alpha);
        this._cameraGoal.copy(cameraOffset).applyQuaternion(orbitQuaternion);
        this.camera.position.copy(this._position).add(this._cameraGoal);
        this.controls.target.copy(this._position);
        this.camera.up.copy(viewUp).applyQuaternion(orbitQuaternion);
        this.camera.lookAt(this._position);
        this.camera.rotateZ(roll);
    }

    dispose() {
        if (this.disposed) return;
        this.stopFollowing();
        this._stopActiveNavigation();
        this.disposed = true;
    }

    fitObjects(objects) {
        if (!objects || objects.length === 0) return;

        const box = new THREE.Box3();
        objects.forEach((object) => box.expandByObject(object, true));
        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());
        const direction = this.camera.position.clone()
            .sub(this.controls.target);
        if (direction.lengthSq() === 0) {
            direction.set(1, 1, 1);
        }
        direction.normalize();

        const corners = this._getBoxCorners(box);
        const distance = this._calculateFocusDistance(box, center, direction, 1.2, corners);

        this._stopActiveNavigation();
        this._updateFocusNearPlane(box, center, direction, distance, corners);
        this.stopFollowing();
        this.camera.position.copy(center).addScaledVector(direction, distance);
        this.controls.target.copy(center);
        this.controls.update();
    }

    focusObject(object, options = {}) {
        const {
            face = 'front',
            duration = 1500,
            padding = 1.2,
            onComplete
        } = options;

        if (!object) {
            return Promise.reject(new Error('Cannot focus an empty object'));
        }

        const directionValues = FOCUS_DIRECTIONS[face];
        if (!directionValues) {
            return Promise.reject(new RangeError(
                `Invalid focus face "${face}". Expected one of: ${Object.keys(FOCUS_DIRECTIONS).join(', ')}`
            ));
        }
        if (!Number.isFinite(padding) || padding <= 0) {
            return Promise.reject(new RangeError('Focus padding must be a finite number greater than 0'));
        }
        if (!Number.isFinite(duration) || duration < 0) {
            return Promise.reject(new RangeError('Focus duration must be a finite number greater than or equal to 0'));
        }

        object.updateWorldMatrix(true, true);

        const box = new THREE.Box3().setFromObject(object, true);
        const center = box.isEmpty()
            ? object.getWorldPosition(new THREE.Vector3())
            : box.getCenter(new THREE.Vector3());
        const worldQuaternion = object.getWorldQuaternion(new THREE.Quaternion());
        const cameraDirection = new THREE.Vector3(...directionValues)
            .applyQuaternion(worldQuaternion)
            .normalize();
        const corners = box.isEmpty() ? null : this._getBoxCorners(box);
        const distance = box.isEmpty()
            ? Math.max(this.camera.position.distanceTo(this.controls.target), 1)
            : this._calculateFocusDistance(box, center, cameraDirection, padding, corners);

        this._updateFocusNearPlane(box, center, cameraDirection, distance, corners);
        this.camera.up.set(0, 1, 0);

        return this.setView({
            position: center.clone().addScaledVector(cameraDirection, distance),
            target: center,
            duration,
            onComplete
        });
    }

    getView(callback) {
        const view = {
            position: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            target: {
                x: this.controls.target.x,
                y: this.controls.target.y,
                z: this.controls.target.z
            }
        };

        if (callback && typeof callback === 'function') callback(view);
        return view;
    }

    setView(options) {
        this.stopFollowing();
        const { position, target, duration = 1500, onComplete } = options;
        const endTarget = target || {
            x: this.controls.target.x,
            y: this.controls.target.y,
            z: this.controls.target.z
        };

        this._stopActiveNavigation();

        if (duration <= 0) {
            this.camera.position.set(position.x, position.y, position.z);
            this.controls.target.set(endTarget.x, endTarget.y, endTarget.z);
            this.controls.update();
            if (onComplete) onComplete();
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const state = {
                positionX: this.camera.position.x,
                positionY: this.camera.position.y,
                positionZ: this.camera.position.z,
                targetX: this.controls.target.x,
                targetY: this.controls.target.y,
                targetZ: this.controls.target.z
            };
            const endState = {
                positionX: position.x,
                positionY: position.y,
                positionZ: position.z,
                targetX: endTarget.x,
                targetY: endTarget.y,
                targetZ: endTarget.z
            };
            const tween = new Tween(state, this.tweenGroup)
                .to(endState, duration)
                .easing(Easing.Quadratic.Out)
                .onUpdate(() => {
                    this.camera.position.set(
                        state.positionX,
                        state.positionY,
                        state.positionZ
                    );
                    this.controls.target.set(
                        state.targetX,
                        state.targetY,
                        state.targetZ
                    );
                    this.controls.update();
                })
                .onComplete(() => {
                    this.tweenGroup.remove(tween);
                    if (this._activeNavigation?.tween === tween) {
                        this._activeNavigation = null;
                    }
                    resolve();
                    if (onComplete) onComplete();
                });

            this._activeNavigation = { tween, resolve };
            tween.start();
        });
    }

    _stopActiveNavigation() {
        if (!this._activeNavigation) return;

        const { tween, resolve } = this._activeNavigation;
        this._activeNavigation = null;
        tween.stop();
        this.tweenGroup.remove(tween);
        resolve();
    }

    _getFocusViewBasis(cameraDirection) {
        const viewDirection = cameraDirection.clone().negate();
        const referenceUp = Math.abs(viewDirection.y) > 0.999
            ? new THREE.Vector3(0, 0, 1)
            : new THREE.Vector3(0, 1, 0);
        const rightDirection = new THREE.Vector3()
            .crossVectors(viewDirection, referenceUp)
            .normalize();
        const upDirection = new THREE.Vector3()
            .crossVectors(rightDirection, viewDirection)
            .normalize();

        return { rightDirection, upDirection };
    }

    _calculateFocusDistance(
        box,
        center,
        cameraDirection,
        padding,
        corners = this._getBoxCorners(box)
    ) {
        const { rightDirection, upDirection } = this._getFocusViewBasis(cameraDirection);
        const verticalTangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) / this.camera.zoom;
        const horizontalTangent = verticalTangent * this.camera.aspect;

        let distance = Number.EPSILON;
        const offset = new THREE.Vector3();
        corners.forEach((corner) => {
            offset.subVectors(corner, center);
            const depthOffset = offset.dot(cameraDirection);
            const widthDistance = depthOffset
                + Math.abs(offset.dot(rightDirection)) * padding / horizontalTangent;
            const heightDistance = depthOffset
                + Math.abs(offset.dot(upDirection)) * padding / verticalTangent;
            distance = Math.max(distance, widthDistance, heightDistance);
        });
        return distance;
    }

    _updateFocusNearPlane(box, center, cameraDirection, distance, corners = null) {
        if (box.isEmpty() || !corners) return;

        let maximumDepthOffset = -Infinity;
        const offset = new THREE.Vector3();
        corners.forEach((corner) => {
            offset.subVectors(corner, center);
            maximumDepthOffset = Math.max(
                maximumDepthOffset,
                offset.dot(cameraDirection)
            );
        });

        const nearestSurfaceDistance = distance - maximumDepthOffset;
        if (nearestSurfaceDistance <= 0) return;

        this.camera.near = Math.max(
            Math.min(this.camera.near, nearestSurfaceDistance * 0.5),
            0.000001
        );
        this.camera.updateProjectionMatrix();
    }

    _getBoxCorners(box) {
        return [
            new THREE.Vector3(box.min.x, box.min.y, box.min.z),
            new THREE.Vector3(box.min.x, box.min.y, box.max.z),
            new THREE.Vector3(box.min.x, box.max.y, box.min.z),
            new THREE.Vector3(box.min.x, box.max.y, box.max.z),
            new THREE.Vector3(box.max.x, box.min.y, box.min.z),
            new THREE.Vector3(box.max.x, box.min.y, box.max.z),
            new THREE.Vector3(box.max.x, box.max.y, box.min.z),
            new THREE.Vector3(box.max.x, box.max.y, box.max.z)
        ];
    }
}
