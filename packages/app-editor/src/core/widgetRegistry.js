import { defineAsyncComponent } from 'vue';
import { API_BASE_URL } from '../config';

// 组件定义映射
const registry = new Map();

/**
 * 注册组件
 * @param {string} type - 组件类型标识 (如 'Scene', 'Chart')
 * @param {Object} config - 组件配置
 * @param {Function} componentLoader - 异步加载组件函数
 */
export function registerWidget(type, config, componentLoader) {
    registry.set(type, {
        config,
        component: defineAsyncComponent(componentLoader)
    });
}

/**
 * 获取组件定义
 * @param {string} type 
 * @returns {Object|undefined}
 */
export function getWidgetDefinition(type) {
    return registry.get(type);
}

/**
 * 获取所有已注册的组件类型（用于左侧面板）
 */
export function getRegisteredWidgets() {
    const widgets = [];
    registry.forEach((def, type) => {
        widgets.push({
            type,
            label: def.config.label,
            icon: def.config.icon,
            category: def.config.category || 'other'
        });
    });
    return widgets;
}

/**
 * 按分类获取组件
 * @returns {Object} - { scene: [...], '2d': [...], '3d': [...] }
 */
export function getWidgetsByCategory() {
    const categories = {
        scene: [],
        '2d': [],
        '3d': []
    };

    registry.forEach((def, type) => {
        const cat = def.config.category || 'other';
        if (categories[cat]) {
            categories[cat].push({
                type,
                label: def.config.label,
                icon: def.config.icon
            });
        }
    });

    return categories;
}

// --- 组件配置 ---

// 场景组件配置
const sceneConfig = {
    label: '3D 场景',
    icon: '🌍',
    category: 'scene',
    defaultSize: { width: 600, height: 400 },
    minSize: { width: 200, height: 150 },
    props: [
        {
            name: 'sceneId',
            label: '选择场景',
            type: 'select',
            options: [],
            async fetchOptions() {
                try {
                    const response = await fetch(`${API_BASE_URL}/scene/list`);
                    const data = await response.json();
                    if (data.success) {
                        return data.scenes.map(s => ({ label: s.name, value: s.sceneId }));
                    }
                    return [];
                } catch (e) {
                    console.error('Failed to load scenes', e);
                    return [];
                }
            }
        }
    ]
};

// 图表组件配置
const chartConfig = {
    label: 'ECharts 图表',
    icon: '📊',
    category: '2d',
    defaultSize: { width: 400, height: 300 },
    minSize: { width: 150, height: 100 },
    props: [
        { name: 'title', label: '标题', type: 'text', defaultValue: '新图表' },
        {
            name: 'chartType',
            label: '图表类型',
            type: 'select',
            options: [
                { label: '折线图', value: 'line' },
                { label: '柱状图', value: 'bar' },
                { label: '饼图', value: 'pie' }
            ],
            defaultValue: 'line'
        }
    ]
};

// 按钮组件配置
const buttonConfig = {
    label: '按钮',
    icon: '🔘',
    category: '2d',
    defaultSize: { width: 120, height: 40 },
    minSize: { width: 60, height: 30 },
    props: [
        { name: 'label', label: '按钮文字', type: 'text', defaultValue: '点击我' },
        { name: 'color', label: '背景色', type: 'color', defaultValue: '#00ccff' },
        { name: 'fontSize', label: '字号', type: 'number', defaultValue: 14 }
    ]
};

// 图片组件配置
const imageConfig = {
    label: '图片',
    icon: '🖼️',
    category: '2d',
    defaultSize: { width: 200, height: 150 },
    minSize: { width: 50, height: 50 },
    props: [
        { name: 'src', label: '图片地址', type: 'text', defaultValue: '' },
        {
            name: 'objectFit',
            label: '填充方式',
            type: 'select',
            options: [
                { label: '覆盖', value: 'cover' },
                { label: '包含', value: 'contain' },
                { label: '拉伸', value: 'fill' }
            ],
            defaultValue: 'cover'
        }
    ]
};

// 文本组件配置
const textConfig = {
    label: '文本',
    icon: '📝',
    category: '2d',
    defaultSize: { width: 200, height: 60 },
    minSize: { width: 50, height: 20 },
    props: [
        { name: 'content', label: '文本内容', type: 'text', defaultValue: '文本内容' },
        { name: 'fontSize', label: '字号', type: 'number', defaultValue: 16 },
        { name: 'color', label: '颜色', type: 'color', defaultValue: '#ffffff' },
        {
            name: 'textAlign',
            label: '对齐',
            type: 'select',
            options: [
                { label: '左对齐', value: 'left' },
                { label: '居中', value: 'center' },
                { label: '右对齐', value: 'right' }
            ],
            defaultValue: 'left'
        }
    ]
};

// 时钟组件配置
const clockConfig = {
    label: '当前时间',
    icon: '🕐',
    category: '2d',
    defaultSize: { width: 200, height: 50 },
    minSize: { width: 100, height: 30 },
    props: [
        {
            name: 'format',
            label: '格式',
            type: 'select',
            options: [
                { label: '时:分:秒', value: 'HH:mm:ss' },
                { label: '年-月-日 时:分:秒', value: 'YYYY-MM-DD HH:mm:ss' },
                { label: '年-月-日', value: 'YYYY-MM-DD' }
            ],
            defaultValue: 'HH:mm:ss'
        },
        { name: 'fontSize', label: '字号', type: 'number', defaultValue: 24 },
        { name: 'color', label: '颜色', type: 'color', defaultValue: '#ffffff' }
    ]
};

// 3D 标签组件配置 (placeholder)
const labelConfig = {
    label: '3D 标签',
    icon: '🏷️',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        { name: 'text', label: '标签文字', type: 'text', defaultValue: '标签' }
    ]
};

// 漫游组件配置 (placeholder)
const tourConfig = {
    label: '漫游路径',
    icon: '🎬',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: []
};

// 统一注册
export function initRegistry() {
    // 场景组件
    registerWidget('Scene', sceneConfig, () => import('../components/widgets/SceneWidget.vue'));

    // 2D 组件
    registerWidget('ECharts', chartConfig, () => import('../components/widgets/EChartsWidget.vue'));
    registerWidget('Button', buttonConfig, () => import('../components/widgets/ButtonWidget.vue'));
    registerWidget('Image', imageConfig, () => import('../components/widgets/ImageWidget.vue'));
    registerWidget('Text', textConfig, () => import('../components/widgets/TextWidget.vue'));
    registerWidget('Clock', clockConfig, () => import('../components/widgets/ClockWidget.vue'));

    // 3D 组件
    registerWidget('Label3D', labelConfig, () => import('../components/widgets/LabelWidget.vue'));
    registerWidget('Tour', tourConfig, () => import('../components/widgets/TourWidget.vue'));
}
