import { ShieldEffect } from './effects/ShieldEffect.js';
import { ScanEffect } from './effects/ScanEffect.js';

/**
 * VFXManager - 特效系统管理器
 * 负责创建、更新和销毁所有视觉特效
 */
export class VFXManager {
    /**
     * @param {THREE.Scene} scene 
     */
    constructor(scene) {
        this.scene = scene;
        this.effects = new Map();

        // 注册可用特效
        this.effectTypes = {
            'shield': ShieldEffect,
            'scan': ScanEffect
        };
    }

    /**
     * 创建特效
     * @param {string} type 特效类型 (如 'shield')
     * @param {Object} config 特效配置参数
     * @returns {BaseEffect|null} 创建的特效实例
     */
    createEffect(type, config) {
        const EffectClass = this.effectTypes[type];
        if (!EffectClass) {
            console.warn(`[VFXManager] Unknown effect type: ${type}`);
            return null;
        }

        const effect = new EffectClass(config);

        // 生成唯一ID
        const id = Math.random().toString(36).substr(2, 9);
        effect.id = id;

        // 挂载到场景
        effect.mount(this.scene);
        this.effects.set(id, effect);

        console.log(`[VFXManager] Created effect: ${type} (${id})`);
        return effect;
    }

    /**
     * 移除特效
     * @param {string} id 特效ID
     */
    removeEffect(id) {
        const effect = this.effects.get(id);
        if (effect) {
            effect.unmount(this.scene);
            this.effects.delete(id);
            console.log(`[VFXManager] Removed effect: ${id}`);
        }
    }

    /**
     * 移除所有特效
     */
    clear() {
        this.effects.forEach(effect => {
            effect.unmount(this.scene);
        });
        this.effects.clear();
    }

    /**
     * 更新循环
     * @param {number} dt Delta time (seconds)
     * @param {number} time Total time (seconds)
     */
    update(dt, time) {
        this.effects.forEach(effect => {
            effect.update(dt, time);
        });
    }
}
