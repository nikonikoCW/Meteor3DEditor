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

/**
 * 获取组件支持的事件
 * @param {string} type - 组件类型
 * @returns {Array} - 事件列表
 */
export function getWidgetEvents(type) {
    const def = registry.get(type);
    return def?.config.events || [];
}

/**
 * 获取组件的数据配置 (用于 DataPanel)
 * @param {string} type - 组件类型
 * @returns {Array} - 数据配置列表
 */
export function getWidgetDataConfig(type) {
    const def = registry.get(type);
    return def?.config.dataConfig || [];
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
        },
        { name: 'zIndex', label: '层级', type: 'number', defaultValue: 1 }
    ]
};

// 图表组件配置
const chartConfig = {
    label: 'ECharts 图表',
    icon: '📊',
    category: '2d',
    defaultSize: { width: 400, height: 300 },
    minSize: { width: 150, height: 100 },
    props: [],
    dataConfig: [
        {
            name: 'code',
            label: 'ECharts 代码',
            type: 'code-editor',
            language: 'javascript',
            defaultValue: `option = {
  title: {
    text: 'ECharts 示例',
    textStyle: { color: '#ccc', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    axisLine: { lineStyle: { color: '#444' } },
    axisLabel: { color: '#888' }
  },
  yAxis: {
    type: 'value',
    axisLine: { lineStyle: { color: '#444' } },
    axisLabel: { color: '#888' },
    splitLine: { lineStyle: { color: '#333' } }
  },
  series: [{
    type: 'line',
    data: [120, 200, 150, 80, 70, 110, 130],
    itemStyle: { color: '#42b983' },
    areaStyle: { color: 'rgba(66,185,131,0.2)' }
  }]
};`,
            description: '支持 MakeAPie 代码格式'
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
        { name: 'fontSize', label: '字号', type: 'number', defaultValue: 14 },
        { name: 'borderRadius', label: '圆角', type: 'number', defaultValue: 4 },
        { name: 'zIndex', label: '层级', type: 'number', defaultValue: 1 }
    ],
    // 组件支持的事件
    events: [
        { name: 'click', label: '点击' }
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
        },
        { name: 'zIndex', label: '层级', type: 'number', defaultValue: 1 }
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
        },
        { name: 'zIndex', label: '层级', type: 'number', defaultValue: 1 }
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
        { name: 'color', label: '颜色', type: 'color', defaultValue: '#ffffff' },
        { name: 'backgroundColor', label: '背景色', type: 'color-alpha', defaultValue: '#000000' },
        { name: 'zIndex', label: '层级', type: 'number', defaultValue: 1 }
    ]
};

// 3D 标签组件配置
const labelConfig = {
    label: '3D 标签',
    icon: '🏷️',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [],
    // 数据面板配置
    dataConfig: [
        {
            name: 'template',
            label: '标签模板',
            type: 'code-editor',
            language: 'html',
            defaultValue: `
            <div class="label">
            <div class="title">{{name}}</div>
            <div class="value">温度: {{temperature}}°C</div>
            <div class="status {{statusClass}}">{{status}}</div>
            </div>`,
            description: '支持 {{variable}} 变量语法'
        },
        {
            name: 'style',
            label: '样式',
            type: 'code-editor',
            language: 'css',
            defaultValue: `.label {
  background: rgba(0, 0, 0, 0.8);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}`
        },
        {
            name: 'labels',
            label: '标签数据',
            type: 'json-editor',
            defaultValue: [
                { "id": "p1", "name": "监控点A", "temperature": 25.5, "status": "离线", "lng": 104.06506044769014, "lat": 30.550820587820624, "height": 60 },
                { "id": "p3", "name": "监控点C", "temperature": 56.3, "status": "正常", "lng": 104.06506044769014, "lat": 30.550820587820624, "height": 30 },
                { "id": "p2", "name": "监控点B", "temperature": -25.5, "status": "警告", "lng": 104.06596044769014, "lat": 30.550820587820624, "height": -20 }
            ],
            placeholder: `[
            {
                "id": "p1",
                "name": "监控点A",
                "temperature": 25.5,
                "status": "正常",
                "statusClass": "normal",
                "lng": 120.1,
                "lat": 30.2,
                "height": 10
            }
            ]`
        }
    ],
    actions: [
        { name: 'enable', label: '启用' },
        { name: 'disable', label: '禁用' }
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

// 性能监视器组件配置 (3D 逻辑组件)
const statsConfig = {
    label: '性能监视器',
    icon: '📈',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    // 3D 逻辑组件无属性面板
    props: [],
    // 暴露给交互系统的动作
    actions: [
        { name: 'enable', label: '启用' },
        { name: 'disable', label: '禁用' },
        { name: 'toggle', label: '切换' }
    ]
};

// 描边效果组件配置 (3D 逻辑组件)
const outlineConfig = {
    label: '描边效果',
    icon: '✏️',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        { name: 'uuid', label: '对象 UUID', type: 'text', defaultValue: '' },
        { name: 'color', label: '描边颜色', type: 'color', defaultValue: '#00ff00' },
        { name: 'thickness', label: '粗细', type: 'number', defaultValue: 1, min: 0.1, max: 10, step: 0.1 },
        { name: 'strength', label: '强度', type: 'number', defaultValue: 3, min: 0, max: 10, step: 0.5 }
    ],
    actions: [
        { name: 'enable', label: '启用描边' },
        { name: 'disable', label: '禁用描边' }
    ]
};

// 高亮效果组件配置 (3D 逻辑组件)
const highlightConfig = {
    label: '高亮效果',
    icon: '💡',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        { name: 'uuid', label: '对象 UUID', type: 'text', defaultValue: '' },
        { name: 'color', label: '高亮颜色', type: 'color', defaultValue: '#ffff00' },
        { name: 'intensity', label: '强度', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1 }
    ],
    actions: [
        { name: 'enable', label: '启用高亮' },
        { name: 'disable', label: '禁用高亮' }
    ]
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
    registerWidget('Stats', statsConfig, () => import('../components/widgets/StatsWidget.vue'));
    registerWidget('Outline', outlineConfig, () => import('../components/widgets/OutlineWidget.vue'));
    registerWidget('Highlight', highlightConfig, () => import('../components/widgets/HighlightWidget.vue'));
}
