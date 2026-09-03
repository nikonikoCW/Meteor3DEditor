import * as THREE from 'three';

/**
 * 高亮效果管理器
 * 使用 Material Emissive 实现对象高亮效果
 */
export class HighlightManager {
    constructor() {
        // 记录高亮对象映射: uuid -> { object, originalData[] }
        this.highlightedObjects = new Map();
    }

    /**
     * 启用对象高亮
     * @param {THREE.Object3D} object - 目标对象
     * @param {Object} options - 配置选项
     * @param {number} [options.color=0xffff00] - 高亮颜色
     * @param {number} [options.intensity=0.5] - 发光强度
     */
    enable(object, options = {}) {
        if (!object || !object.uuid) return false;

        const color = options.color !== undefined ? options.color : 0xffff00;
        const intensity = options.intensity !== undefined ? options.intensity : 0.5;
        const highlightColor = new THREE.Color(color);

        // 如果已经高亮，先恢复
        if (this.highlightedObjects.has(object.uuid)) {
            this._restoreObject(object.uuid);
        }

        // 收集所有需要修改的材质信息
        const originalData = [];
        let meshCount = 0;
        let highlightedCount = 0;

        object.traverse((child) => {
            if (child.isMesh && child.material) {
                meshCount++;
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach((mat, index) => {
                    highlightedCount++;

                    if (mat.emissive !== undefined) {
                        // 方案 A：支持 emissive 的材质（如 MeshStandardMaterial）
                        // 为了避免同一资产的多个克隆对象共享同一材质导致同时高亮，这里必须克隆材质
                        const originalMaterial = mat;
                        const highlightMat = mat.clone();

                        highlightMat.emissive.set(color);
                        highlightMat.emissiveIntensity = intensity;
                        highlightMat.needsUpdate = true;

                        originalData.push({
                            mesh: child,
                            materialIndex: index,
                            type: 'material', // 统一使用 material 类型以便恢复
                            originalMaterial: originalMaterial
                        });

                        // 替换为高亮材质副本
                        if (Array.isArray(child.material)) {
                            child.material[index] = highlightMat;
                        } else {
                            child.material = highlightMat;
                        }
                    } else if (mat.color !== undefined) {
                        // 方案 B：不支持 emissive 的材质（如 MeshBasicMaterial）
                        // 保存原始材质引用，创建高亮材质副本
                        const originalMaterial = mat;
                        const highlightMat = mat.clone();

                        // 将高亮色与原色混合（intensity 限制在 0-1）
                        const clampedIntensity = Math.min(1, Math.max(0, intensity));
                        highlightMat.color.lerp(highlightColor, clampedIntensity);
                        highlightMat.needsUpdate = true;

                        // 保存原始材质引用
                        originalData.push({
                            mesh: child,
                            materialIndex: index,
                            type: 'material',
                            originalMaterial: originalMaterial
                        });

                        // 替换为高亮材质
                        if (Array.isArray(child.material)) {
                            child.material[index] = highlightMat;
                        } else {
                            child.material = highlightMat;
                        }
                    }
                });
            }
        });

        console.log(`[HighlightManager] Object: ${object.name || object.uuid}, Meshes: ${meshCount}, Highlighted: ${highlightedCount}`);

        // 记录
        this.highlightedObjects.set(object.uuid, {
            object,
            originalData
        });

        return originalData.length > 0;
    }

    /**
     * 禁用对象高亮
     * @param {THREE.Object3D} object - 目标对象，不传则清除所有
     */
    disable(object) {
        if (!object) {
            this.disableAll();
            return true;
        }

        if (object.uuid && this.highlightedObjects.has(object.uuid)) {
            this._restoreObject(object.uuid);
            return true;
        }

        return false;
    }

    /**
     * 清除所有高亮
     */
    disableAll() {
        for (const uuid of this.highlightedObjects.keys()) {
            this._restoreObject(uuid);
        }
    }

    /**
     * 恢复对象的原始材质
     * @private
     */
    _restoreObject(uuid) {
        const record = this.highlightedObjects.get(uuid);
        if (!record) {
            console.warn(`[HighlightManager] _restoreObject: No record found for ${uuid}`);
            return;
        }

        console.log(`[HighlightManager] Restoring ${record.originalData.length} materials for ${uuid}`);

        record.originalData.forEach((data) => {
            const materials = Array.isArray(data.mesh.material)
                ? data.mesh.material
                : [data.mesh.material];

            const mat = materials[data.materialIndex];
            if (!mat) return;

            if (data.type === 'material') {
                // 销毁临时高亮克隆材质，防止显存泄漏
                if (mat && typeof mat.dispose === 'function') {
                    mat.dispose();
                }

                // 恢复原始材质引用
                if (Array.isArray(data.mesh.material)) {
                    data.mesh.material[data.materialIndex] = data.originalMaterial;
                } else {
                    data.mesh.material = data.originalMaterial;
                }
                console.log(`[HighlightManager] Restored original material for mesh`);
            }
        });

        this.highlightedObjects.delete(uuid);
    }

    /**
     * 获取当前高亮对象的 Three.js 运行时 UUID 列表，仅供内部兼容。
     * @deprecated 业务层请使用 getHighlightedBIDs()。
     * @returns {string[]}
     */
    getHighlightedUUIDs() {
        return Array.from(this.highlightedObjects.keys());
    }

    /**
     * 获取当前高亮对象的 BID 列表。
     * @returns {string[]}
     */
    getHighlightedBIDs() {
        return Array.from(this.highlightedObjects.values())
            .map((record) => record.object?.userData?.bid)
            .filter(Boolean);
    }

    /**
     * 销毁并释放资源
     */
    dispose() {
        this.disableAll();
    }
}
