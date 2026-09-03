import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/**
 * 标签管理器
 * 使用 CSS2DRenderer 在 3D 场景中渲染 HTML 标签
 */
export class LabelManager {
    /**
     * @param {THREE.WebGLRenderer} renderer - Three.js 渲染器
     * @param {THREE.Scene} scene - Three.js 场景
     * @param {THREE.Camera} camera - 相机
     * @param {Function} lngLatToWorld - 经纬度转世界坐标函数（可选）
     */
    constructor(renderer, scene, camera, lngLatToWorld = null) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.lngLatToWorld = lngLatToWorld;

        // 标签列表 (ID -> Label)
        this.labels = new Map();

        // 初始化 CSS2DRenderer
        this.cssRenderer = new CSS2DRenderer();
        this.cssRenderer.setSize(
            renderer.domElement.clientWidth,
            renderer.domElement.clientHeight
        );
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = '0';
        this.cssRenderer.domElement.style.left = '0';
        this.cssRenderer.domElement.style.pointerEvents = 'none';

        // 将 CSS2DRenderer 添加到 canvas 的父容器
        const container = renderer.domElement.parentElement;
        if (container) {
            container.style.position = 'relative';
            container.appendChild(this.cssRenderer.domElement);
        }
    }

    /**
     * 创建标签
     * @param {Object} options - 配置选项
     * @param {string} [options.id] - 唯一标识符
     * @param {Object} [options.position] - 世界坐标 {x, y, z}
     * @param {Object} [options.lngLat] - 经纬度 {lng, lat, height}
     * @param {string} options.content - HTML 内容
     * @param {Object} [options.style] - CSS 样式对象
     * @param {Object} [options.offset] - 屏幕像素偏移 {x, y}
     * @returns {string} 标签 ID
     */
    createLabel(options) {
        const { id = THREE.MathUtils.generateUUID(), position, lngLat, content, style = {}, offset = { x: 0, y: 0 } } = options;

        // 检查是否已存在
        if (this.labels.has(id)) {
            console.warn(`Label with id ${id} already exists.`);
            return id;
        }

        // 创建 DOM 元素
        const element = document.createElement('div');
        element.innerHTML = content;
        element.style.pointerEvents = 'auto';

        // 应用样式
        Object.assign(element.style, style);

        // 创建 CSS2DObject
        const labelObject = new CSS2DObject(element);

        // 设置位置
        let worldPos;
        if (position) {
            worldPos = new THREE.Vector3(position.x, position.y, position.z);
        } else if (lngLat && this.lngLatToWorld) {
            worldPos = this.lngLatToWorld(lngLat.lng, lngLat.lat, lngLat.height || 0);
            // lngLatToWorld 返回 null 表示 GIS 未配置，中断操作
            if (!worldPos) {
                return null;
            }
        } else {
            worldPos = new THREE.Vector3(0, 0, 0);
        }

        labelObject.position.copy(worldPos);

        // 应用偏移
        if (offset.x || offset.y) {
            element.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
        }

        // 添加到场景
        this.scene.add(labelObject);

        // 创建标签包装对象
        const label = new Label(labelObject, element, this, worldPos.clone());
        label.id = id; // 附加 ID
        this.labels.set(id, label);

        return id;
    }

    /**
     * 更新标签
     * @param {string} id - 标签ID
     * @param {Object} config - 更新配置
     */
    updateLabel(id, config) {
        const label = this.labels.get(id);
        if (!label) {
            console.warn(`Label not found: ${id}`);
            return;
        }

        if (config.position) label.setPosition(config.position);
        if (config.lngLat) label.setLngLat(config.lngLat);
        if (config.content) label.setContent(config.content);
        if (config.style) label.setStyle(config.style);
        if (config.offset) label.setOffset(config.offset);
    }

    /**
     * 移除标签
     * @param {string|Label} labelOrId 标签ID或实例
     */
    removeLabel(labelOrId) {
        let label = labelOrId;
        let id = labelOrId;

        if (labelOrId instanceof Label) {
            id = labelOrId.id;
        } else {
            label = this.labels.get(id);
        }

        if (label) {
            this.scene.remove(label._object);
            label._element.remove();
            this.labels.delete(id);
        }
    }

    /**
     * 清除所有标签
     */
    clearLabels() {
        for (const label of this.labels.values()) {
            this.scene.remove(label._object);
            label._element.remove();
        }
        this.labels.clear();
    }

    /**
     * 获取所有标签
     * @returns {Label[]}
     */
    getLabels() {
        return Array.from(this.labels.values());
    }

    /**
     * 更新渲染（在动画循环中调用）
     */
    update() {
        this.cssRenderer.render(this.scene, this.camera);
    }

    /**
     * 处理窗口大小变化
     * @param {number} width 
     * @param {number} height 
     */
    onResize(width, height) {
        this.cssRenderer.setSize(width, height);
    }

    /**
     * 销毁
     */
    dispose() {
        this.clearLabels();
        this.cssRenderer.domElement.remove();
    }
}

/**
 * 标签实例
 */
class Label {
    constructor(object, element, manager, initialPosition) {
        this._object = object;
        this._element = element;
        this._manager = manager;
        this._position = initialPosition;
        this._visible = true;
    }

    /**
     * 设置世界坐标位置
     * @param {{x: number, y: number, z: number}} position 
     */
    setPosition(position) {
        this._position.set(position.x, position.y, position.z);
        this._object.position.copy(this._position);
    }

    /**
     * 设置经纬度位置
     * @param {{lng: number, lat: number, height?: number}} lngLat 
     */
    setLngLat(lngLat) {
        if (!this._manager.lngLatToWorld) return;
        const worldPos = this._manager.lngLatToWorld(lngLat.lng, lngLat.lat, lngLat.height || 0);
        // GIS 未配置时 lngLatToWorld 返回 null 并已输出警告
        if (!worldPos) return;
        this._position.copy(worldPos);
        this._object.position.copy(this._position);
    }

    /**
     * 设置 HTML 内容
     * @param {string} content 
     */
    setContent(content) {
        this._element.innerHTML = content;
    }

    /**
     * 设置样式
     * @param {Object} style 
     */
    setStyle(style) {
        Object.assign(this._element.style, style);
    }

    /**
     * 设置偏移
     * @param {{x: number, y: number}} offset
     */
    setOffset(offset) {
        if (offset && (offset.x !== undefined || offset.y !== undefined)) {
            const x = offset.x || 0;
            const y = offset.y || 0;
            this._element.style.transform = `translate(${x}px, ${y}px)`;
        }
    }

    /**
     * 显示标签
     */
    show() {
        this._visible = true;
        this._object.visible = true;
    }

    /**
     * 隐藏标签
     */
    hide() {
        this._visible = false;
        this._object.visible = false;
    }

    /**
     * 检查是否可见
     * @returns {boolean}
     */
    isVisible() {
        return this._visible;
    }

    /**
     * 获取当前位置
     * @returns {THREE.Vector3}
     */
    getPosition() {
        return this._position.clone();
    }

    /**
     * 销毁标签
     */
    dispose() {
        this._manager.removeLabel(this);
    }
}
