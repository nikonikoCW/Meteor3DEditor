import Stats from 'three/examples/jsm/libs/stats.module.js';

/**
 * 性能监视器管理器
 * 封装 Three.js 的 Stats 模块，提供帧率和渲染时间监控
 * 可在场景右上角显示 FPS 和 ms 延迟
 */
export class StatsManager {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {HTMLElement} options.container - Stats 面板的容器元素（默认 document.body）
     * @param {string} options.position - 显示位置 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
     */
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.position = options.position || 'top-right';
        this.stats = null;
        this.enabled = false;
    }

    /**
     * 启用性能监视器
     * 创建并显示 Stats 面板
     */
    enable() {
        if (this.enabled) return;

        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb

        // 设置样式
        const dom = this.stats.dom;
        dom.style.position = 'absolute';
        dom.style.zIndex = '10000';

        // 根据位置设置偏移
        switch (this.position) {
            case 'top-left':
                dom.style.top = '0';
                dom.style.left = '0';
                dom.style.right = '';
                dom.style.bottom = '';
                break;
            case 'top-right':
                dom.style.top = '0';
                dom.style.right = '0';
                dom.style.left = '';
                dom.style.bottom = '';
                break;
            case 'bottom-left':
                dom.style.bottom = '0';
                dom.style.left = '0';
                dom.style.top = '';
                dom.style.right = '';
                break;
            case 'bottom-right':
                dom.style.bottom = '0';
                dom.style.right = '0';
                dom.style.top = '';
                dom.style.left = '';
                break;
            default:
                dom.style.top = '0';
                dom.style.right = '0';
        }

        this.container.appendChild(dom);
        this.enabled = true;
    }

    /**
     * 禁用性能监视器
     * 移除 Stats 面板
     */
    disable() {
        if (!this.enabled || !this.stats) return;

        if (this.stats.dom && this.stats.dom.parentElement) {
            this.stats.dom.parentElement.removeChild(this.stats.dom);
        }
        this.stats = null;
        this.enabled = false;
    }

    /**
     * 切换性能监视器显示状态
     * @param {boolean} show - true 显示，false 隐藏
     */
    toggle(show) {
        if (show) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * 切换显示的面板类型
     * @param {number} panel - 0: FPS, 1: MS, 2: MB (如果支持)
     */
    setPanel(panel) {
        if (this.stats) {
            this.stats.showPanel(panel);
        }
    }

    /**
     * 更新统计信息
     * 应该在每帧渲染循环中调用
     */
    update() {
        if (this.stats && this.enabled) {
            this.stats.update();
        }
    }

    /**
     * 开始统计（在渲染开始前调用）
     */
    begin() {
        if (this.stats && this.enabled) {
            this.stats.begin();
        }
    }

    /**
     * 结束统计（在渲染结束后调用）
     */
    end() {
        if (this.stats && this.enabled) {
            this.stats.end();
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
     * 设置容器
     * @param {HTMLElement} container - 新的容器元素
     */
    setContainer(container) {
        const wasEnabled = this.enabled;
        if (wasEnabled) {
            this.disable();
        }
        this.container = container;
        if (wasEnabled) {
            this.enable();
        }
    }
}
