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
                        originalData.push({
                            mesh: child,
                            materialIndex: index,
                            type: 'emissive',
                            originalEmissive: mat.emissive.clone(),
                            originalEmissiveIntensity: mat.emissiveIntensity
                        });

                        mat.emissive.set(color);
                        mat.emissiveIntensity = intensity;
                        mat.needsUpdate = true;
                    } else if (mat.color !== undefined) {
                        // 方案 B：不支持 emissive 的材质（如 MeshBasicMaterial）
                        // 使用颜色叠加方式
                        originalData.push({
                            mesh: child,
                            materialIndex: index,
                            type: 'color',
                            originalColor: mat.color.clone()
                        });

                        // 将高亮色与原色混合
                        const blendedColor = mat.color.clone().lerp(highlightColor, intensity);
                        mat.color.copy(blendedColor);
                        mat.needsUpdate = true;
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
        if (!record) return;

        record.originalData.forEach((data) => {
            const materials = Array.isArray(data.mesh.material)
                ? data.mesh.material
                : [data.mesh.material];

            const mat = materials[data.materialIndex];
            if (!mat) return;

            if (data.type === 'emissive' && mat.emissive) {
                mat.emissive.copy(data.originalEmissive);
                mat.emissiveIntensity = data.originalEmissiveIntensity;
                mat.needsUpdate = true;
            } else if (data.type === 'color' && mat.color) {
                mat.color.copy(data.originalColor);
                mat.needsUpdate = true;
            }
        });

        this.highlightedObjects.delete(uuid);
    }

    /**
     * 获取当前高亮对象的 UUID 列表
     * @returns {string[]}
     */
    getHighlightedUUIDs() {
        return Array.from(this.highlightedObjects.keys());
    }

    /**
     * 销毁并释放资源
     */
    dispose() {
        this.disableAll();
    }
}
