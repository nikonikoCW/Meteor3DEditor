/**
 * 三角形统计管理器
 * 提供场景中三角形数量的统计功能
 * - GPU 实际渲染的三角形数量（经过 LOD、剔除后）
 * - 场景总几何三角形数量（无论可见与否）
 * 
 * 性能优化：
 * - 使用缓存和脏标记模式，避免每次都遍历场景
 * - 监听场景变化事件自动标记脏
 */
export class TriangleStatsManager {
    /**
     * 构造函数
     * @param {THREE.WebGLRenderer} renderer - Three.js 渲染器
     * @param {THREE.Scene} scene - Three.js 场景
     */
    constructor(renderer, scene) {
        this.renderer = renderer;
        this.scene = scene;
        this.updateInterval = null;
        this.enabled = false;
        this.callback = null;

        // 缓存相关
        this._cachedTotalTriangles = 0;
        this._isDirty = true;  // 初始状态为脏，需要首次计算
        this._lastObjectCount = 0;  // 用于检测场景对象数量变化
    }

    /**
     * 获取 GPU 实际渲染的三角形数量
     * 此值来自 renderer.info.render.triangles，反映经过 LOD、视锥剔除后的真实渲染数量
     * @returns {number}
     */
    getRenderedTriangles() {
        if (!this.renderer || !this.renderer.info) {
            return 0;
        }
        return this.renderer.info.render.triangles || 0;
    }

    /**
     * 获取场景中所有几何体的总三角形数量
     * 使用缓存优化，只在场景变化时重新计算
     * @returns {number}
     */
    getTotalTriangles() {
        if (!this.scene) {
            return 0;
        }

        // 快速检测场景变化：通过对象数量变化判断
        const currentObjectCount = this._countObjects();
        if (currentObjectCount !== this._lastObjectCount) {
            this._isDirty = true;
            this._lastObjectCount = currentObjectCount;
        }

        // 如果缓存有效，直接返回
        if (!this._isDirty) {
            return this._cachedTotalTriangles;
        }

        // 重新计算
        let total = 0;
        this.scene.traverse((object) => {
            if (object.isMesh && object.geometry) {
                const geometry = object.geometry;
                if (geometry.index) {
                    // 索引几何体：三角形数 = 索引数量 / 3
                    total += geometry.index.count / 3;
                } else if (geometry.attributes && geometry.attributes.position) {
                    // 非索引几何体：三角形数 = 顶点数量 / 3
                    total += geometry.attributes.position.count / 3;
                }
            }
        });

        this._cachedTotalTriangles = Math.floor(total);
        this._isDirty = false;

        return this._cachedTotalTriangles;
    }

    /**
     * 快速统计场景中的 Mesh 对象数量
     * @returns {number}
     * @private
     */
    _countObjects() {
        let count = 0;
        this.scene.traverse((object) => {
            if (object.isMesh) {
                count++;
            }
        });
        return count;
    }

    /**
     * 标记场景为脏，下次获取时重新计算
     * 应在添加/删除对象后调用
     */
    markDirty() {
        this._isDirty = true;
    }

    /**
     * 获取 Draw Calls 数量
     * 此值来自 renderer.info.render.calls，反映每帧的绘制调用次数
     * @returns {number}
     */
    getDrawCalls() {
        if (!this.renderer || !this.renderer.info) {
            return 0;
        }
        return this.renderer.info.render.calls || 0;
    }

    /**
     * 获取 GPU 中纹理数量
     * 此值来自 renderer.info.memory.textures
     * @returns {number}
     */
    getTextureCount() {
        if (!this.renderer || !this.renderer.info) {
            return 0;
        }
        return this.renderer.info.memory.textures || 0;
    }

    /**
     * 获取 GPU 中几何体数量
     * 此值来自 renderer.info.memory.geometries
     * @returns {number}
     */
    getGeometryCount() {
        if (!this.renderer || !this.renderer.info) {
            return 0;
        }
        return this.renderer.info.memory.geometries || 0;
    }

    /**
     * 获取三角形及渲染统计数据
     * @returns {{rendered: number, total: number, drawCalls: number, textureCount: number, geometryCount: number}}
     */
    getStats() {
        return {
            rendered: this.getRenderedTriangles(),
            total: this.getTotalTriangles(),
            drawCalls: this.getDrawCalls(),
            textureCount: this.getTextureCount(),
            geometryCount: this.getGeometryCount()
        };
    }

    /**
     * 开启实时更新
     * @param {function} callback - 回调函数，接收统计数据 {rendered, total}
     * @param {number} interval - 更新间隔（毫秒），默认 200ms（优化后可用更长间隔）
     */
    startLiveUpdate(callback, interval = 200) {
        if (this.updateInterval) {
            this.stopLiveUpdate();
        }

        this.callback = callback;
        this.enabled = true;

        this.updateInterval = setInterval(() => {
            if (this.callback && this.enabled) {
                this.callback(this.getStats());
            }
        }, interval);
    }

    /**
     * 停止实时更新
     */
    stopLiveUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.enabled = false;
        this.callback = null;
    }

    /**
     * 切换实时更新状态
     * @param {boolean} enable - 是否启用
     * @param {function} callback - 回调函数（启用时必须提供）
     * @param {number} interval - 更新间隔（毫秒）
     */
    toggle(enable, callback, interval = 200) {
        if (enable) {
            this.startLiveUpdate(callback, interval);
        } else {
            this.stopLiveUpdate();
        }
    }

    /**
     * 获取当前是否启用
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * 销毁管理器，清理资源
     */
    dispose() {
        this.stopLiveUpdate();
        this.renderer = null;
        this.scene = null;
        this._cachedTotalTriangles = 0;
        this._isDirty = true;
    }
}

