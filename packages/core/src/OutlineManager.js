import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * 描边效果管理器
 * 使用后处理实现选中对象的描边效果
 */
export class OutlineManager {
    /**
     * @param {THREE.WebGLRenderer} renderer - 渲染器
     * @param {THREE.Scene} scene - 场景
     * @param {THREE.Camera} camera - 相机
     * @param {HTMLElement} container - 容器元素
     */
    constructor(renderer, scene, camera, container) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.container = container;

        // 记录描边对象映射: uuid -> Object3D
        this.outlinedObjects = new Map();

        // 初始化后处理
        this._initComposer();
    }

    /**
     * 初始化后处理管道
     */
    _initComposer() {
        const size = this.renderer.getSize(new THREE.Vector2());

        // 创建 EffectComposer
        this.composer = new EffectComposer(this.renderer);

        // 渲染通道
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        // 描边通道
        this.outlinePass = new OutlinePass(
            new THREE.Vector2(size.x, size.y),
            this.scene,
            this.camera
        );

        // 默认描边样式
        this.outlinePass.edgeStrength = 3;
        this.outlinePass.edgeGlow = 0;
        this.outlinePass.edgeThickness = 0.1;
        this.outlinePass.visibleEdgeColor.set(0x00ff00);
        this.outlinePass.hiddenEdgeColor.set(0x00ff00);

        this.composer.addPass(this.outlinePass);

        // 输出通道 - 恢复正确的颜色空间
        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);
    }

    /**
     * 启用对象描边
     * @param {THREE.Object3D} object - 目标对象
     * @param {Object} options - 配置选项
     * @param {number} [options.color=0x00ff00] - 描边颜色
     * @param {number} [options.thickness=1] - 描边粗细
     * @param {number} [options.strength=3] - 描边强度
     */
    enable(object, options = {}) {
        if (!object || !object.uuid) return false;

        // 记录对象
        this.outlinedObjects.set(object.uuid, object);

        // 更新描边列表
        this._updateOutlineList();

        // 应用样式 (如果传入)
        if (options.color !== undefined) {
            this.outlinePass.visibleEdgeColor.set(options.color);
            this.outlinePass.hiddenEdgeColor.set(options.color);
        }
        if (options.thickness !== undefined) {
            this.outlinePass.edgeThickness = options.thickness;
        }
        if (options.strength !== undefined) {
            this.outlinePass.edgeStrength = options.strength;
        }

        return true;
    }

    /**
     * 禁用对象描边
     * @param {THREE.Object3D} object - 目标对象，不传则清除所有
     */
    disable(object) {
        if (!object) {
            // 清除所有
            this.outlinedObjects.clear();
        } else if (object.uuid) {
            this.outlinedObjects.delete(object.uuid);
        }

        this._updateOutlineList();
        return true;
    }

    /**
     * 清除所有描边
     */
    disableAll() {
        this.outlinedObjects.clear();
        this._updateOutlineList();
    }

    /**
     * 获取当前描边对象的 Three.js 运行时 UUID 列表，仅供内部兼容。
     * @deprecated 业务层请使用 getOutlinedBIDs()。
     * @returns {string[]}
     */
    getOutlinedUUIDs() {
        return Array.from(this.outlinedObjects.keys());
    }

    /**
     * 获取当前描边对象的 BID 列表。
     * @returns {string[]}
     */
    getOutlinedBIDs() {
        return Array.from(this.outlinedObjects.values())
            .map((object) => object.userData?.bid)
            .filter(Boolean);
    }

    /**
     * 更新 OutlinePass 的选中对象列表
     */
    _updateOutlineList() {
        this.outlinePass.selectedObjects = Array.from(this.outlinedObjects.values());
    }

    /**
     * 处理窗口大小变化
     * @param {number} width 
     * @param {number} height 
     */
    resize(width, height) {
        this.composer.setSize(width, height);
        this.outlinePass.resolution.set(width, height);
    }

    /**
     * 渲染描边效果
     * 在动画循环中调用，替代 renderer.render()
     */
    render() {
        if (this.outlinedObjects.size > 0) {
            // 有描边对象时使用 composer 渲染
            this.composer.render();
            return true;
        }
        return false;
    }

    /**
     * 销毁并释放资源
     */
    dispose() {
        this.outlinedObjects.clear();
        this.composer.dispose();
    }
}
