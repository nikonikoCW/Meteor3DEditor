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
 * 负责视角读写、场景适配和从指定局部面聚焦物体。
 */
export class CameraNavigationManager {
    constructor(camera, controls, tweenGroup) {
        this.camera = camera;
        this.controls = controls;
        this.tweenGroup = tweenGroup;
        this._activeNavigation = null;
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
