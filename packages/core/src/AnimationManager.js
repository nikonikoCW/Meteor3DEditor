import * as THREE from 'three';

const MIN_SPEED = 0.1;
const MAX_SPEED = 3;

/** 按模型根节点 BID 管理 GLTF 动画混合器和动画动作。 */
export class AnimationManager {
    constructor({ onStateChange = null } = {}) {
        this.controllers = new Map();
        this.onStateChange = onStateChange;
        this.disposed = false;
    }

    /** 从选中的场景节点向上查找最近的动画根节点。 */
    resolveAnimationRoot(object) {
        let current = object;
        while (current) {
            if (Array.isArray(current.animations) && current.animations.length > 0) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    /** 注册包含动画的对象树，但暂不创建动画混合器。 */
    registerObject(object, initialState = object?.userData?.animationConfig || {}) {
        if (this.disposed || !object) return false;

        const root = this.resolveAnimationRoot(object);
        const rootBid = root?.userData?.bid;
        if (!root || !rootBid || this.controllers.has(rootBid)) return Boolean(rootBid);

        const clips = root.animations.filter((clip) => clip instanceof THREE.AnimationClip);
        if (clips.length === 0) return false;

        const clipIndex = this.resolveClipIndex(clips, initialState);
        const controller = {
            root,
            clips,
            mixer: null,
            action: null,
            state: {
                enabled: Boolean(initialState.enabled),
                playing: Boolean(initialState.enabled && (initialState.playing ?? initialState.enabled)),
                clipIndex,
                clipName: clips[clipIndex]?.name || '',
                speed: this.normalizeSpeed(initialState.speed ?? 1),
                loop: 'repeat'
            }
        };

        this.controllers.set(rootBid, controller);
        this.storeState(controller);

        if (controller.state.enabled) {
            const action = this.ensureAction(controller, true);
            if (action) {
                action.play();
                action.paused = !controller.state.playing;
                if (!controller.state.playing) controller.mixer.update(0);
            }
        }

        return true;
    }

    /** 返回选中节点所属模型根节点的可序列化动画片段描述。 */
    getAnimations(object) {
        const controller = this.getController(object);
        if (!controller) return [];

        return controller.clips.map((clip, index) => ({
            index,
            name: clip.name || '',
            label: clip.name?.trim() || `动画 ${index + 1}`,
            duration: Number.isFinite(clip.duration) ? clip.duration : 0
        }));
    }

    /** 返回选中节点当前动画状态的副本。 */
    getAnimationState(object) {
        const controller = this.getController(object);
        return controller ? this.createStateSnapshot(controller) : null;
    }

    /** 选择动画片段，优先按名称匹配，无法匹配时回退到索引。 */
    setAnimationClip(object, selector = {}) {
        if (!selector || typeof selector !== 'object') {
            throw new TypeError('Animation clip selector must be an object');
        }

        const controller = this.getController(object);
        if (!controller) return false;

        const nextIndex = this.resolveClipIndex(controller.clips, selector, false);
        if (nextIndex < 0) return false;
        if (nextIndex === controller.state.clipIndex) return true;

        const previousClip = controller.clips[controller.state.clipIndex];
        controller.action?.stop();
        if (controller.mixer && previousClip) {
            controller.mixer.uncacheAction(previousClip, controller.root);
        }
        controller.action = null;
        controller.state.clipIndex = nextIndex;
        controller.state.clipName = controller.clips[nextIndex]?.name || '';

        if (controller.state.enabled) {
            const action = this.ensureAction(controller, true);
            if (action) {
                action.play();
                action.paused = !controller.state.playing;
                if (!controller.state.playing) controller.mixer.update(0);
            }
        }

        this.commitState(controller);
        return true;
    }

    /** 开启或关闭动画；关闭时停止动作并恢复模型初始姿势。 */
    setAnimationEnabled(object, enabled) {
        if (typeof enabled !== 'boolean') {
            throw new TypeError('Animation enabled state must be a boolean');
        }

        const controller = this.getController(object);
        if (!controller) return false;
        if (enabled === controller.state.enabled) return true;

        if (enabled) {
            const action = this.ensureAction(controller, true);
            if (!action) return false;
            action.play();
            action.paused = true;
            controller.mixer.update(0);
            controller.state.enabled = true;
            controller.state.playing = false;
        } else {
            controller.action?.stop();
            controller.mixer?.stopAllAction();
            controller.mixer?.uncacheRoot(controller.root);
            controller.action = null;
            controller.mixer = null;
            controller.state.enabled = false;
            controller.state.playing = false;
        }

        this.commitState(controller);
        return true;
    }

    /** 播放或暂停已开启的动画；暂停时保持当前姿势。 */
    setAnimationPlaying(object, playing) {
        if (typeof playing !== 'boolean') {
            throw new TypeError('Animation playing state must be a boolean');
        }

        const controller = this.getController(object);
        if (!controller || !controller.state.enabled) return false;

        const action = this.ensureAction(controller);
        if (!action) return false;

        if (playing) {
            action.paused = false;
            if (!action.isRunning()) action.play();
        } else {
            action.paused = true;
        }

        controller.state.playing = playing;
        this.commitState(controller);
        return true;
    }

    /** 设置播放速度，编辑器支持的范围为 0.1 倍至 3 倍。 */
    setAnimationSpeed(object, speed) {
        const normalizedSpeed = this.normalizeSpeed(speed);
        const controller = this.getController(object);
        if (!controller) return false;

        controller.state.speed = normalizedSpeed;
        controller.action?.setEffectiveTimeScale(normalizedSpeed);
        this.commitState(controller);
        return true;
    }

    /** 仅推进已开启且正在播放的动画混合器。 */
    update(delta) {
        if (this.disposed || !Number.isFinite(delta) || delta <= 0) return;
        for (const controller of this.controllers.values()) {
            if (controller.state.enabled && controller.state.playing && controller.mixer) {
                controller.mixer.update(delta);
            }
        }
    }

    /** 释放与对象或根节点 BID 关联的动画控制器。 */
    unregisterObject(target) {
        const controller = typeof target === 'string'
            ? this.controllers.get(target)
            : this.getController(target);
        if (!controller) return false;

        const rootBid = controller.root.userData.bid;
        this.storeState(controller);
        controller.action?.stop();
        controller.mixer?.stopAllAction();
        controller.mixer?.uncacheRoot(controller.root);
        controller.action = null;
        controller.mixer = null;
        this.controllers.delete(rootBid);
        return true;
    }

    dispose() {
        if (this.disposed) return;
        for (const rootBid of [...this.controllers.keys()]) {
            this.unregisterObject(rootBid);
        }
        this.onStateChange = null;
        this.disposed = true;
    }

    getController(object) {
        const root = this.resolveAnimationRoot(object);
        return root?.userData?.bid ? this.controllers.get(root.userData.bid) || null : null;
    }

    ensureAction(controller, reset = false) {
        const clip = controller.clips[controller.state.clipIndex];
        if (!clip) return null;

        if (!controller.mixer) controller.mixer = new THREE.AnimationMixer(controller.root);
        if (!controller.action) {
            controller.action = controller.mixer.clipAction(clip, controller.root);
            controller.action.setLoop(THREE.LoopRepeat, Infinity);
        }

        controller.action.enabled = true;
        controller.action.setEffectiveTimeScale(controller.state.speed);
        if (reset) controller.action.reset();
        return controller.action;
    }

    resolveClipIndex(clips, selector = {}, useDefault = true) {
        const requestedIndex = Number.isInteger(selector.clipIndex)
            ? selector.clipIndex
            : Number.isInteger(selector.index) ? selector.index : -1;
        const requestedName = typeof selector.clipName === 'string'
            ? selector.clipName
            : typeof selector.name === 'string' ? selector.name : '';

        if (
            requestedIndex >= 0 &&
            requestedIndex < clips.length &&
            (!requestedName || clips[requestedIndex]?.name === requestedName)
        ) {
            return requestedIndex;
        }

        if (requestedName) {
            const namedIndex = clips.findIndex((clip) => clip.name === requestedName);
            if (namedIndex >= 0) return namedIndex;
        }

        if (requestedIndex >= 0 && requestedIndex < clips.length) return requestedIndex;
        return useDefault && clips.length > 0 ? 0 : -1;
    }

    normalizeSpeed(speed) {
        const numericSpeed = Number(speed);
        if (!Number.isFinite(numericSpeed)) {
            throw new TypeError('Animation speed must be a finite number');
        }
        if (numericSpeed < MIN_SPEED || numericSpeed > MAX_SPEED) {
            throw new RangeError(`Animation speed must be between ${MIN_SPEED} and ${MAX_SPEED}`);
        }
        return numericSpeed;
    }

    createStateSnapshot(controller) {
        return {
            rootBid: controller.root.userData.bid,
            enabled: controller.state.enabled,
            playing: controller.state.playing,
            clipIndex: controller.state.clipIndex,
            clipName: controller.state.clipName,
            speed: controller.state.speed,
            loop: controller.state.loop
        };
    }

    storeState(controller) {
        controller.root.userData.animationConfig = {
            enabled: controller.state.enabled,
            playing: controller.state.playing,
            clipIndex: controller.state.clipIndex,
            clipName: controller.state.clipName,
            speed: controller.state.speed,
            loop: controller.state.loop
        };
    }

    commitState(controller) {
        this.storeState(controller);
        this.onStateChange?.({
            rootBid: controller.root.userData.bid,
            state: this.createStateSnapshot(controller)
        });
    }
}
