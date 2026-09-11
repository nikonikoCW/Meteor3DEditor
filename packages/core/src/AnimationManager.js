import * as THREE from 'three';

const MIN_SPEED = 0.1;
const MAX_SPEED = 3;

/**
 * 按模型根节点 BID 管理 GLTF 动画混合器、动画动作和原始姿态快照。
 * 每个包含动画的模型对应一个控制器，负责片段选择、播放状态和速度等运行时状态。
 */
export class AnimationManager {
    /**
     * 创建动画管理器。
     * @param {Object} [options] - 可选配置。
     * @param {Function|null} [options.onStateChange=null] - 动画状态变化后的回调函数。
     */
    constructor({ onStateChange = null } = {}) {
        this.controllers = new Map();
        // 原始姿态独立保存在 WeakMap 中，避免被 userData 序列化或被持久化节点数据覆盖。
        this.originalPoses = new WeakMap();
        this.onStateChange = onStateChange;
        this.disposed = false;
    }

    /**
     * 从指定场景节点向上查找最近的动画根节点。
     * @param {THREE.Object3D|null|undefined} object - 任意模型节点。
     * @returns {THREE.Object3D|null} 包含动画片段的根节点，未找到时返回 null。
     */
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

    /**
     * 注册包含动画的对象树，并恢复其持久化动画配置。
     * 动画未启用时不会提前创建 AnimationMixer。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @param {Object} [initialState] - 初始动画状态。
     * @returns {boolean} 是否成功找到并注册动画根节点。
     */
    registerObject(object, initialState = object?.userData?.animationConfig || {}) {
        if (this.disposed || !object) return false;

        const root = this.resolveAnimationRoot(object);
        const rootBid = root?.userData?.bid;
        if (!root || !rootBid || this.controllers.has(rootBid)) return Boolean(rootBid);

        const clips = root.animations.filter((clip) => clip instanceof THREE.AnimationClip);
        if (clips.length === 0) return false;

        // 直接使用 SceneManager 的调用方可能不会经过 PersistenceManager；
        // 此时注册时的姿态就是当前能够取得的最早原始姿态。
        this.captureOriginalPose(root, clips);

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

    /**
     * 获取指定节点所属模型的动画片段描述。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @returns {Array<Object>} 可供界面展示和持久化的动画片段列表。
     */
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

    /**
     * 获取指定节点所属模型的当前动画状态副本。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @returns {Object|null} 动画状态；模型未注册时返回 null。
     */
    getAnimationState(object) {
        const controller = this.getController(object);
        return controller ? this.createStateSnapshot(controller) : null;
    }

    /**
     * 选择动画片段，优先校验名称与索引的组合，再分别回退匹配。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @param {{name?: string, index?: number, clipName?: string, clipIndex?: number}} selector - 片段选择条件。
     * @returns {boolean} 是否成功切换动画片段。
     */
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

    /**
     * 开启或关闭动画；关闭时停止动作并恢复 GLTF 原始姿态。
     * 即使动画已经关闭，传入 false 仍会执行一次原始姿态恢复。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @param {boolean} enabled - 是否启用动画。
     * @returns {boolean} 是否成功更新动画状态。
     */
    setAnimationEnabled(object, enabled) {
        if (typeof enabled !== 'boolean') {
            throw new TypeError('Animation enabled state must be a boolean');
        }

        const controller = this.getController(object);
        if (!controller) return false;
        if (enabled === controller.state.enabled && enabled) return true;

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
            // Mixer 的属性绑定可能创建于持久化动画帧写入之后，
            // 因此必须显式恢复应用持久化数据之前捕获的原始值。
            this.restoreOriginalPose(controller.root);
            controller.state.enabled = false;
            controller.state.playing = false;
        }

        this.commitState(controller);
        return true;
    }

    /**
     * 捕获动画轨道实际绑定属性的原始值。
     * 只记录受动画控制的属性，避免恢复姿态时误改模型摆放或其他场景编辑结果。
     * 同一个动画根节点只会捕获一次，后续调用不会覆盖最早的原始姿态。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @param {THREE.AnimationClip[]|null} [clips=null] - 可选动画片段列表；默认读取根节点 animations。
     * @returns {boolean} 是否找到动画根节点并成功保存至少一个绑定属性。
     */
    captureOriginalPose(object, clips = null) {
        const root = this.resolveAnimationRoot(object);
        if (!root || this.originalPoses.has(root)) return Boolean(root);

        const sourceClips = Array.isArray(clips)
            ? clips
            : root.animations?.filter((clip) => clip instanceof THREE.AnimationClip) || [];
        const entries = [];
        const capturedTracks = new Set();

        for (const clip of sourceClips) {
            for (const track of clip.tracks) {
                if (capturedTracks.has(track.name)) continue;
                capturedTracks.add(track.name);

                try {
                    const binding = THREE.PropertyBinding.create(root, track.name);
                    const value = new Float64Array(track.getValueSize());
                    binding.bind();
                    binding.getValue(value, 0);
                    entries.push({ binding, value });
                } catch (error) {
                    console.warn(`Unable to capture original animation property: ${track.name}`, error);
                }
            }
        }

        this.originalPoses.set(root, entries);
        return entries.length > 0;
    }

    /**
     * 恢复之前捕获的动画属性原始值，并立即更新模型世界矩阵。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @returns {boolean} 是否找到并恢复了原始姿态快照。
     */
    restoreOriginalPose(object) {
        const root = this.resolveAnimationRoot(object);
        const entries = root ? this.originalPoses.get(root) : null;
        if (!root || !entries) return false;

        for (const { binding, value } of entries) {
            binding.setValue(value, 0);
        }
        root.updateMatrixWorld(true);
        return true;
    }

    /**
     * 播放或暂停已开启的动画；暂停时保持当前姿态。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @param {boolean} playing - 是否继续播放。
     * @returns {boolean} 是否成功更新播放状态。
     */
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

    /**
     * 设置动画播放速度，允许范围为 0.1 倍至 3 倍。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @param {number} speed - 播放速度倍率。
     * @returns {boolean} 是否成功更新播放速度。
     */
    setAnimationSpeed(object, speed) {
        const normalizedSpeed = this.normalizeSpeed(speed);
        const controller = this.getController(object);
        if (!controller) return false;

        controller.state.speed = normalizedSpeed;
        controller.action?.setEffectiveTimeScale(normalizedSpeed);
        this.commitState(controller);
        return true;
    }

    /**
     * 推进所有已开启且正在播放的动画混合器。
     * @param {number} delta - 自上一帧起经过的秒数。
     * @returns {void}
     */
    update(delta) {
        if (this.disposed || !Number.isFinite(delta) || delta <= 0) return;
        for (const controller of this.controllers.values()) {
            if (controller.state.enabled && controller.state.playing && controller.mixer) {
                controller.mixer.update(delta);
            }
        }
    }

    /**
     * 注销并释放与对象或根节点 BID 关联的动画控制器。
     * @param {THREE.Object3D|string} target - 模型节点或动画根节点 BID。
     * @returns {boolean} 是否找到并注销了控制器。
     */
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

    /**
     * 释放全部动画控制器和状态回调。
     * @returns {void}
     */
    dispose() {
        if (this.disposed) return;
        for (const rootBid of [...this.controllers.keys()]) {
            this.unregisterObject(rootBid);
        }
        this.onStateChange = null;
        this.disposed = true;
    }

    /**
     * 获取指定节点所属动画根节点的内部控制器。
     * @param {THREE.Object3D} object - 模型根节点或其内部节点。
     * @returns {Object|null} 内部动画控制器。
     */
    getController(object) {
        const root = this.resolveAnimationRoot(object);
        return root?.userData?.bid ? this.controllers.get(root.userData.bid) || null : null;
    }

    /**
     * 确保控制器已创建 AnimationMixer 和当前片段对应的 AnimationAction。
     * @param {Object} controller - 内部动画控制器。
     * @param {boolean} [reset=false] - 是否将动作时间重置到片段起点。
     * @returns {THREE.AnimationAction|null} 当前动画动作。
     */
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

    /**
     * 根据名称和索引解析目标动画片段下标。
     * @param {THREE.AnimationClip[]} clips - 可选动画片段列表。
     * @param {Object} [selector={}] - 片段名称或索引选择条件。
     * @param {boolean} [useDefault=true] - 无匹配结果时是否默认选择第一个片段。
     * @returns {number} 片段下标；无法匹配时返回 -1。
     */
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

    /**
     * 将播放速度转换为有效数值并校验允许范围。
     * @param {number|string} speed - 待校验的播放速度。
     * @returns {number} 规范化后的播放速度。
     * @throws {TypeError|RangeError} 速度不是有限数值或超出允许范围时抛出。
     */
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

    /**
     * 创建可安全对外返回的动画状态副本。
     * @param {Object} controller - 内部动画控制器。
     * @returns {Object} 不包含 Three.js 运行时对象的纯数据状态。
     */
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

    /**
     * 将控制器状态写入模型 userData，供场景持久化使用。
     * @param {Object} controller - 内部动画控制器。
     * @returns {void}
     */
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

    /**
     * 保存控制器状态并通知外部监听者。
     * @param {Object} controller - 内部动画控制器。
     * @returns {void}
     */
    commitState(controller) {
        this.storeState(controller);
        this.onStateChange?.({
            rootBid: controller.root.userData.bid,
            state: this.createStateSnapshot(controller)
        });
    }
}
