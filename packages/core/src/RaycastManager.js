import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast, MeshBVHHelper } from 'three-mesh-bvh';

// 扩展 Mesh 的 raycast 方法使用 BVH 加速
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/**
 * 射线检测管理器
 * 使用 BVH 加速射线检测，管理 BVH 构建和缓存
 */
export class RaycastManager {
    constructor() {
        /** @type {WeakSet<THREE.BufferGeometry>} 已构建 BVH 的几何体 */
        this.builtGeometries = new WeakSet();

        /** @type {THREE.Raycaster} */
        this.raycaster = new THREE.Raycaster();

        /** @type {Map<THREE.Mesh, MeshBVHHelper>} BVH Helper 映射 */
        this.bvhHelpers = new Map();

        /** @type {number} 当前显示深度 */
        this.helperDepth = 10;

        /** @type {boolean} Helper 是否可见 */
        this.helpersVisible = false;
    }

    /**
     * 为网格对象构建 BVH
     * @param {THREE.Object3D} object - 要构建 BVH 的对象（会递归处理子对象）
     */
    buildBVH(object) {
        object.traverse((child) => {
            if (child.isMesh && child.geometry) {
                this._buildGeometryBVH(child.geometry);
            }
        });
    }

    /**
     * 为单个几何体构建 BVH
     * @param {THREE.BufferGeometry} geometry 
     */
    _buildGeometryBVH(geometry) {
        // 跳过已构建的
        if (this.builtGeometries.has(geometry)) {
            return;
        }

        // 跳过没有索引或位置属性的几何体
        if (!geometry.attributes.position) {
            return;
        }

        try {
            geometry.boundsTree = new MeshBVH(geometry);
            this.builtGeometries.add(geometry);
        } catch (error) {
            console.warn('[RaycastManager] Failed to build BVH for geometry:', error);
        }
    }

    /**
     * 检查对象是否已构建 BVH
     * @param {THREE.Object3D} object 
     * @returns {boolean}
     */
    hasBVH(object) {
        let hasAll = true;
        object.traverse((child) => {
            if (child.isMesh && child.geometry) {
                if (!this.builtGeometries.has(child.geometry)) {
                    hasAll = false;
                }
            }
        });
        return hasAll;
    }

    /**
     * 执行射线检测
     * @param {THREE.Vector2} screenPosition - 归一化屏幕坐标 (-1 到 1)
     * @param {THREE.Camera} camera - 相机
     * @param {THREE.Object3D[]} objects - 要检测的对象数组
     * @param {Object} options - 选项
     * @param {boolean} options.recursive - 是否递归检测子对象，默认 true
     * @returns {THREE.Intersection[]} 交点数组
     */
    raycast(screenPosition, camera, objects, options = {}) {
        const { recursive = true } = options;

        this.raycaster.setFromCamera(screenPosition, camera);
        return this.raycaster.intersectObjects(objects, recursive);
    }

    /**
     * 使用原始射线执行检测（用于 drop 等场景）
     * @param {THREE.Ray} ray - 射线
     * @param {THREE.Object3D[]} objects - 要检测的对象
     * @param {Object} options - 选项
     * @returns {THREE.Intersection[]}
     */
    raycastWithRay(ray, objects, options = {}) {
        const { recursive = true } = options;

        this.raycaster.ray.copy(ray);
        return this.raycaster.intersectObjects(objects, recursive);
    }

    /**
     * 与平面相交
     * @param {THREE.Vector2} screenPosition - 归一化屏幕坐标
     * @param {THREE.Camera} camera - 相机
     * @param {THREE.Plane} plane - 平面
     * @returns {THREE.Vector3|null} 交点
     */
    raycastPlane(screenPosition, camera, plane) {
        this.raycaster.setFromCamera(screenPosition, camera);
        const target = new THREE.Vector3();
        const result = this.raycaster.ray.intersectPlane(plane, target);
        return result ? target : null;
    }

    /**
     * 销毁 BVH
     * @param {THREE.Object3D} object 
     */
    disposeBVH(object) {
        object.traverse((child) => {
            if (child.isMesh && child.geometry && child.geometry.boundsTree) {
                child.geometry.boundsTree = null;
                this.builtGeometries.delete(child.geometry);
            }
        });
    }

    // ==================== BVH Helper 可视化 ====================

    /**
     * 显示 BVH Helper
     * @param {THREE.Scene} scene - 场景
     * @param {THREE.Object3D[]} objects - 要显示 Helper 的对象
     * @param {number} depth - 显示深度层级
     */
    showBVHHelpers(scene, objects, depth = 10) {
        this.helperDepth = depth;
        this.helpersVisible = true;

        objects.forEach(obj => {
            obj.traverse((child) => {
                if (child.isMesh && child.geometry && child.geometry.boundsTree) {
                    if (this.bvhHelpers.has(child)) {
                        // 已有 Helper，更新深度
                        const helper = this.bvhHelpers.get(child);
                        helper.depth = depth;
                        helper.update();
                    } else {
                        // 创建新 Helper
                        const helper = new MeshBVHHelper(child, depth);
                        scene.add(helper);
                        this.bvhHelpers.set(child, helper);
                    }
                }
            });
        });
    }

    /**
     * 隐藏并移除所有 BVH Helper
     * @param {THREE.Scene} scene - 场景
     */
    hideBVHHelpers(scene) {
        this.helpersVisible = false;

        this.bvhHelpers.forEach((helper, mesh) => {
            scene.remove(helper);
            helper.dispose();
        });
        this.bvhHelpers.clear();
    }

    /**
     * 更新 BVH Helper 深度
     * @param {number} depth - 新的深度层级
     */
    updateBVHDepth(depth) {
        this.helperDepth = depth;

        this.bvhHelpers.forEach((helper) => {
            helper.depth = depth;
            helper.update();
        });
    }

    /**
     * 检查 Helper 是否可见
     * @returns {boolean}
     */
    isBVHHelpersVisible() {
        return this.helpersVisible;
    }
}

