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
    }

    fitObjects(objects) {
        if (!objects || objects.length === 0) return;

        const box = new THREE.Box3();
        objects.forEach((object) => box.expandByObject(object));
        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
        cameraZ *= 1.5;

        const direction = this.camera.position.clone()
            .sub(this.controls.target)
            .normalize();
        const newPosition = direction.multiplyScalar(cameraZ).add(center);

        this.camera.position.copy(newPosition);
        this.camera.lookAt(center);
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
        const { upDirection } = this._getFocusViewBasis(cameraDirection);
        const distance = box.isEmpty()
            ? Math.max(this.camera.position.distanceTo(this.controls.target), 1)
            : this._calculateFocusDistance(box, center, cameraDirection, padding);

        this._updateFocusNearPlane(box, center, cameraDirection, distance);
        this.camera.up.copy(upDirection);

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

        if (duration <= 0) {
            this.camera.position.set(position.x, position.y, position.z);
            this.controls.target.set(endTarget.x, endTarget.y, endTarget.z);
            this.controls.update();
            if (onComplete) onComplete();
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const startPosition = {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            };
            const startTarget = {
                x: this.controls.target.x,
                y: this.controls.target.y,
                z: this.controls.target.z
            };

            new Tween(startPosition, this.tweenGroup)
                .to(position, duration)
                .easing(Easing.Quadratic.Out)
                .onUpdate(() => {
                    this.camera.position.set(startPosition.x, startPosition.y, startPosition.z);
                })
                .start();

            new Tween(startTarget, this.tweenGroup)
                .to(endTarget, duration)
                .easing(Easing.Quadratic.Out)
                .onUpdate(() => {
                    this.controls.target.set(startTarget.x, startTarget.y, startTarget.z);
                    this.controls.update();
                })
                .onComplete(() => {
                    if (onComplete) onComplete();
                    resolve();
                })
                .start();
        });
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

    _calculateFocusDistance(box, center, cameraDirection, padding) {
        const { rightDirection, upDirection } = this._getFocusViewBasis(cameraDirection);
        const verticalTangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) / this.camera.zoom;
        const horizontalTangent = verticalTangent * this.camera.aspect;

        let distance = Number.EPSILON;
        this._getBoxCorners(box).forEach((corner) => {
            const offset = corner.sub(center);
            const depthOffset = offset.dot(cameraDirection);
            const widthDistance = depthOffset
                + Math.abs(offset.dot(rightDirection)) * padding / horizontalTangent;
            const heightDistance = depthOffset
                + Math.abs(offset.dot(upDirection)) * padding / verticalTangent;
            distance = Math.max(distance, widthDistance, heightDistance);
        });
        return distance;
    }

    _updateFocusNearPlane(box, center, cameraDirection, distance) {
        if (box.isEmpty()) return;

        let maximumDepthOffset = -Infinity;
        this._getBoxCorners(box).forEach((corner) => {
            maximumDepthOffset = Math.max(
                maximumDepthOffset,
                corner.sub(center).dot(cameraDirection)
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
