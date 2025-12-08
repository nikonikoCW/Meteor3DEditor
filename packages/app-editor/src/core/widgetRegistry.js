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
            icon: def.config.icon
        });
    });
    return widgets;
}

// --- 初始化注册 ---

// 场景组件配置
const sceneConfig = {
    label: '3D 场景',
    icon: '🌍',
    defaultSize: { width: 600, height: 400 },
    props: [
        { 
            name: 'sceneId', 
            label: '选择场景', 
            type: 'select', 
            options: [], // 初始为空，组件加载时填充
            async fetchOptions() {
                // 动态获取选项的逻辑
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
    label: '图表 (ECharts)',
    icon: '📊',
    defaultSize: { width: 300, height: 200 },
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
    label: '交互按钮',
    icon: '🔘',
    defaultSize: { width: 100, height: 40 },
    props: [
        { name: 'label', label: '按钮文字', type: 'text', defaultValue: '点击我' },
        { name: 'color', label: '颜色', type: 'color', defaultValue: '#00ccff' }
    ]
};

// 统一注册
export function initRegistry() {
    registerWidget('Scene', sceneConfig, () => import('../components/widgets/SceneWidget.vue'));
    registerWidget('Chart', chartConfig, () => import('../components/widgets/ChartWidget.vue'));
    registerWidget('Button', buttonConfig, () => import('../components/widgets/ButtonWidget.vue'));
}

