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
    props: [
        { name: 'zIndex', label: '层级', type: 'number', defaultValue: 1 }
    ],
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
    icon: '�',
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
            name: 'labelConfig',
            label: '标签配置',
            type: 'label-editor',
            defaultValue: {
                template: `
                <div class="label-container">
                <div class="header">
                    <span class="title">{{name}}</span>
                    <div class="status-dot status-{{statusClass}}"></div>
                </div>
                <div class="content">
                    <div class="row">
                    <span class="label">设备状态</span>
                    <span class="value">{{status}}</span>
                    </div>
                    <div class="row">
                    <span class="label">当前温度</span>
                    <span class="value highlight">{{temperature}}°C</span>
                    </div>
                    <div class="row">
                    <span class="label">相对湿度</span>
                    <span class="value">{{humidity}}%</span>
                    </div>
                </div>
                </div>`,
                style: `.label-container {
                background: rgba(20, 20, 30, 0.75);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                padding: 16px;
                min-width: 220px;
                color: #fff;
                font-family: 'Inter', system-ui, sans-serif;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                transition: transform 0.2s, box-shadow 0.2s;
                pointer-events: auto;
                user-select: none;
                }

                .label-container:hover {
                transform: translateY(-5px);
                border-color: rgba(66, 185, 131, 0.5);
                box-shadow: 0 12px 40px rgba(66, 185, 131, 0.2);
                }

                .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .title {
                font-size: 15px;
                font-weight: 600;
                color: #fff;
                letter-spacing: 0.5px;
                }

                .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ccc;
                box-shadow: 0 0 8px currentColor;
                }

                .status-normal { background: #42b983; color: #42b983; }
                .status-warning { background: #e6a23c; color: #e6a23c; }
                .status-error { background: #f56c6c; color: #f56c6c; }

                .content {
                display: grid;
                gap: 8px;
                }

                .row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 13px;
                }

                .label {
                color: rgba(255, 255, 255, 0.6);
                }

                .value {
                font-weight: 500;
                color: rgba(255, 255, 255, 0.9);
                font-feature-settings: "tnum";
                }

                .value.highlight {
                color: #42b983;
                font-weight: 600;
                }`,
                labels: [
                    { "id": "d1", "name": "大雁塔北广场", "status": "运行中", "statusClass": "normal", "temperature": 24.5, "humidity": 45, "lng": 108.95940826330946, "lat": 34.219739657625965, "height": 10 },
                    { "id": "d2", "name": "大雁塔南广场", "status": "维护中", "statusClass": "warning", "temperature": 25.0, "humidity": 42, "lng": 108.964, "lat": 34.218, "height": 10 },
                    { "id": "d3", "name": "步行街西侧", "status": "故障警告", "statusClass": "error", "temperature": 28.2, "humidity": 38, "lng": 108.960, "lat": 34.220, "height": 10 }
                ]
            }
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

// 相机定位组件配置 (3D 逻辑组件)
const cameraConfig = {
    label: '相机定位',
    icon: '📷',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        {
            name: 'captureTrigger',
            label: '获取当前视角',
            type: 'button',
            buttonLabel: '点击获取',
            defaultValue: 0
        },
        {
            name: 'viewData',
            label: '视角数据',
            type: 'json',
            defaultValue: '{}',
            description: 'JSON 格式的视角数据'
        },
        {
            name: 'duration',
            label: '动画时间(ms)',
            type: 'number',
            defaultValue: 2000,
            min: 0
        }
    ],
    actions: [
        { name: 'enable', label: '恢复视角' }
    ]
};

// 下雨组件配置 (3D 逻辑组件)
const rainConfig = {
    label: '下雨效果',
    icon: '🌧️',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        { name: 'count', label: '雨量', type: 'number', defaultValue: 10000, min: 100, max: 50000, step: 100 },
        { name: 'speed', label: '速度', type: 'number', defaultValue: 2.0, min: 0, max: 10, step: 0.1 }
    ],
    actions: [
        { name: 'enable', label: '开始下雨' },
        { name: 'disable', label: '停止下雨' }
    ]
};

// 下雪组件配置 (3D 逻辑组件)
const snowConfig = {
    label: '下雪效果',
    icon: '❄️',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        { name: 'count', label: '雪量', type: 'number', defaultValue: 10000, min: 100, max: 30000, step: 100 },
        { name: 'size', label: '大小', type: 'number', defaultValue: 1.0, min: 0.1, max: 5.0, step: 0.1 },
        { name: 'speed', label: '速度', type: 'number', defaultValue: 1.0, min: 0, max: 5.0, step: 0.1 },
        { name: 'opacity', label: '透明度', type: 'number', defaultValue: 0.8, min: 0, max: 1, step: 0.1 },
        { name: 'color', label: '颜色', type: 'color', defaultValue: '#ffffff' }
    ],
    actions: [
        { name: 'enable', label: '开始下雪' },
        { name: 'disable', label: '停止下雪' }
    ]
};



// 能量盾组件配置 (3D 逻辑组件)
const shieldConfig = {
    label: '能量盾',
    icon: '🛡️',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        { name: 'color', label: '颜色', type: 'color', defaultValue: '#00ff00' },
        { name: 'scale', label: '缩放', type: 'number', defaultValue: 5, min: 0.1, step: 0.1 }
    ],
    dataConfig: [
        {
            name: 'config',
            label: '高级配置',
            type: 'json-editor',
            defaultValue: [
                {
                    "id": "d_1",
                    "lng": 116.39374398,
                    "lat": 39.91217581,
                    "height": 0
                },
                {
                    "id": "d_2",
                    "lng": 116.38299598,
                    "lat": 39.90645336,
                    "height": 0
                }
            ],
            description: 'JSON 格式的额外配置'
        }
    ],
    actions: [
        { name: 'enable', label: '启用' },
        { name: 'disable', label: '禁用' }
    ]
};

// 面板组件配置 (2D 组件)
const panelConfig = {
    label: '面板',
    icon: '🔲',
    category: '2d',
    defaultSize: { width: 400, height: 300 },
    minSize: { width: 50, height: 50 },
    props: [
        { name: 'backgroundColor', label: '背景色', type: 'color-alpha', defaultValue: 'rgba(30, 30, 40, 0.8)' },
        { name: 'borderRadius', label: '圆角', type: 'number', defaultValue: 8, min: 0 },
        { name: 'borderWidth', label: '边框宽', type: 'number', defaultValue: 1, min: 0 },
        { name: 'borderColor', label: '边框色', type: 'color-alpha', defaultValue: 'rgba(255, 255, 255, 0.1)' },
        { name: 'backdropBlur', label: '毛玻璃', type: 'number', defaultValue: 0, min: 0, max: 50 },
        { name: 'zIndex', label: '层级', type: 'number', defaultValue: 0 }
    ]
};

// 扩散扫描组件配置 (3D 逻辑组件)
const scanConfig = {
    label: '扩散扫描',
    icon: '📡',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        { name: 'color', label: '颜色', type: 'color', defaultValue: '#ff3300' },
        { name: 'scale', label: '缩放', type: 'number', defaultValue: 1, min: 0.1, step: 0.1 },
        { name: 'repeat', label: '纹理重复', type: 'number', defaultValue: 3.0, min: 1.0, step: 0.5 }
    ],
    dataConfig: [
        {
            name: 'config',
            label: '高级配置',
            type: 'json-editor',
            defaultValue: [
                {
                    "id": "p_1",
                    "lng": 116.39374398,
                    "lat": 39.91217581,
                    "height": 0
                }
            ],
            description: 'JSON 格式的额外配置'
        }
    ],
    actions: [
        { name: 'enable', label: '启用' },
        { name: 'disable', label: '禁用' }
    ]
};

// 相机控制模式组件配置 (3D 逻辑组件)
const cameraControlConfig = {
    label: '相机控制模式',
    icon: '🎮',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        {
            name: 'mode',
            label: '控制模式',
            type: 'select',
            options: [
                { label: '轨道模式 (Orbit)', value: 'orbit' },
                { label: '幽灵模式 (Ghost)', value: 'ghost' }
            ],
            defaultValue: 'orbit'
        },
        {
            name: 'pointerLock',
            label: '锁定鼠标 (Ghost)',
            type: 'switch',
            defaultValue: false
        }
    ],
    actions: [
        { name: 'enable', label: '应用此模式' },
        { name: 'disable', label: '重置为轨道' }
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
    registerWidget('Panel', panelConfig, () => import('../components/widgets/PanelWidget.vue'));

    // 3D 组件
    registerWidget('Label3D', labelConfig, () => import('../components/widgets/LabelWidget.vue'));
    registerWidget('Tour', tourConfig, () => import('../components/widgets/TourWidget.vue'));
    registerWidget('Stats', statsConfig, () => import('../components/widgets/StatsWidget.vue'));
    registerWidget('Outline', outlineConfig, () => import('../components/widgets/OutlineWidget.vue'));
    registerWidget('Highlight', highlightConfig, () => import('../components/widgets/HighlightWidget.vue'));
    registerWidget('Camera', cameraConfig, () => import('../components/widgets/CameraWidget.vue'));
    registerWidget('Rain', rainConfig, () => import('../components/widgets/RainWidget.vue'));
    registerWidget('Snow', snowConfig, () => import('../components/widgets/SnowWidget.vue'));
    registerWidget('Shield', shieldConfig, () => import('../components/widgets/ShieldWidget.vue'));
    registerWidget('Scan', scanConfig, () => import('../components/widgets/ScanWidget.vue'));
    registerWidget('CameraControl', cameraControlConfig, () => import('../components/widgets/CameraControlWidget.vue'));
}
