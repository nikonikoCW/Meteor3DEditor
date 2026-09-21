import * as THREE from 'three';

/**
 * BaseEffect - 所有特效的基类
 */
export class BaseEffect {
    constructor(config) {
        this.config = config || {};
        this.mesh = null;
        this.id = null; // 由 VFXManager 分配
    }

    /**
     * 挂载到场景
     * @param {THREE.Scene} scene 
     */
    mount(scene) {
        if (this.mesh) {
            scene.add(this.mesh);
        }
    }

    /**
     * 从场景卸载
     * @param {THREE.Scene} scene 
     */
    unmount(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.dispose();
        }
    }

    /**
     * 更新逻辑 (每帧调用)
     * @param {number} dt Delta time in seconds
     * @param {number} time Total time in seconds
     */
    update(dt, time) {
        // 子类实现
    }

    /**
     * 更新参数
     * @param {Object} params 
     */
    setParams(params) {
        // 子类实现
    }

    /**
     * 销毁资源
     */
    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
        }
    }
}
