import * as THREE from 'three';
import { Tween, Easing } from '@tweenjs/tween.js';

/** 负责通过 BID 驱动场景节点的局部位移与旋转动画。 */
export class ObjectTransformManager {
    constructor(sceneManager, tweenGroup) {
        this.sceneManager = sceneManager;
        this.tweenGroup = tweenGroup;
        this.activeTweens = new Map();
    }

    /**
     * @param {string} bid
     * @param {{x: number, y: number, z: number}} position
     * @param {{x: number, y: number, z: number}} rotation - 欧拉角，单位为弧度
     * @param {number} [duration=0] - 动画时长，单位为毫秒
     * @param {Object} [options={}] - 位移与旋转共用的动画配置。
     * @param {'quadraticOut'|'linear'} [options.easing='quadraticOut'] - 减速缓动或线性进度。
     * @returns {boolean}
     */
    moveTo(bid, position, rotation, duration = 0, options = {}) {
        this._validateBid(bid);
        this._validateVector3(position, 'position');
        this._validateVector3(rotation, 'rotation');
        if (!Number.isFinite(duration) || duration < 0) {
            throw new RangeError('moveTo: duration must be a finite number greater than or equal to 0');
        }

        if (!options || typeof options !== 'object' || Array.isArray(options)) {
            throw new TypeError('moveTo: options must be an object');
        }
        const { easing = 'quadraticOut' } = options;
        if (easing !== 'quadraticOut' && easing !== 'linear') {
            throw new RangeError('moveTo: easing must be quadraticOut or linear');
        }

        const object = this.sceneManager.findObjectByBid(bid);
        if (!object) return false;

        this.stop(bid);

        const targetPosition = new THREE.Vector3(position.x, position.y, position.z);
        const targetEuler = new THREE.Euler(
            rotation.x,
            rotation.y,
            rotation.z,
            object.rotation.order
        );
        const targetQuaternion = new THREE.Quaternion().setFromEuler(targetEuler);

        if (duration === 0) {
            object.position.copy(targetPosition);
            object.rotation.copy(targetEuler);
            object.updateMatrixWorld(true);
            return true;
        }

        const startPosition = object.position.clone();
        const startQuaternion = object.quaternion.clone();
        const progress = { value: 0 };
        const tween = new Tween(progress, this.tweenGroup)
            .to({ value: 1 }, duration)
            .easing(easing === 'linear' ? Easing.Linear.None : Easing.Quadratic.Out)
            .onUpdate(() => {
                object.position.lerpVectors(startPosition, targetPosition, progress.value);
                object.quaternion.slerpQuaternions(
                    startQuaternion,
                    targetQuaternion,
                    progress.value
                );
                object.updateMatrixWorld(true);
            })
            .onComplete(() => {
                object.position.copy(targetPosition);
                object.rotation.copy(targetEuler);
                object.updateMatrixWorld(true);
                this.tweenGroup.remove(tween);
                if (this.activeTweens.get(bid) === tween) {
                    this.activeTweens.delete(bid);
                }
            });

        this.activeTweens.set(bid, tween);
        tween.start();
        return true;
    }

    stop(bid) {
        if (!bid) return false;
        const tween = this.activeTweens.get(bid);
        if (!tween) return false;
        tween.stop();
        this.tweenGroup.remove(tween);
        this.activeTweens.delete(bid);
        return true;
    }

    stopAll() {
        for (const tween of this.activeTweens.values()) {
            tween.stop();
            this.tweenGroup.remove(tween);
        }
        this.activeTweens.clear();
    }

    dispose() {
        this.stopAll();
        this.sceneManager = null;
        this.tweenGroup = null;
    }

    _validateBid(bid) {
        if (typeof bid !== 'string' || bid.trim() === '') {
            throw new TypeError('moveTo: bid must be a non-empty string');
        }
    }

    _validateVector3(value, name) {
        if (!value || typeof value !== 'object' || Array.isArray(value)
            || !Number.isFinite(value.x)
            || !Number.isFinite(value.y)
            || !Number.isFinite(value.z)) {
            throw new TypeError(`moveTo: ${name} must contain finite numeric x, y and z values`);
        }
    }
}
