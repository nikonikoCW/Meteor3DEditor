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
            type: 'scene-select',
            pageSize: 10,
            options: [],
            async fetchOptions(page = 1, pageSize = 10) {
                const params = new URLSearchParams({ page, pageSize });
                const response = await fetch(`${API_BASE_URL}/scene/list?${params}`);
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || '加载场景列表失败');
                }

                return {
                    options: data.scenes.map(scene => ({
                        label: scene.name,
                        value: scene.sceneId
                    })),
                    pagination: data.pagination
                };
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
        { name: 'backgroundColor', label: '背景色', type: 'color-alpha', defaultValue: 'rgba(0, 0, 0, 0)' },
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
        { name: 'borderRadius', label: '圆角', type: 'number', defaultValue: 0, min: 0 },
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
        {
            name: 'fontWeight',
            label: '字重',
            type: 'number',
            defaultValue: 400,
            min: 100,
            max: 900,
            step: 100
        },
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
                template: `<div class="app-label-anchor">
<div class="app-label-billboard">
    <div class="app-label-billboard__card">
      <div class="app-label-billboard__header">
        <span class="app-label-billboard__status"></span>
        {{title}}
        <span class="app-label-billboard__code">{{code}}</span>
      </div>
      <div class="app-label-billboard__rows">
        <div><span>设备名称</span><strong>{{name}}</strong></div>
        <div><span>运行状态</span><strong class="is-normal">{{status}}</strong></div>
        <div><span>实时温度</span><strong>{{temperature}} ℃</strong></div>
        <div><span>工作电压</span><strong>{{voltage}} V</strong></div>
        <div><span>当前功率</span><strong>{{power}} kW</strong></div>
        <div><span>累计时长</span><strong>{{hours}} h</strong></div>
        <div><span>所属区域</span><strong>{{area}}</strong></div>
        <div><span>更新时间</span><strong>{{updatedAt}}</strong></div>
      </div>
    </div>
    <div class="app-label-billboard__stem"></div>
    <div class="app-label-billboard__anchor"></div>
  </div>
</div>`,
                style: `.app-label-anchor {
  position: relative;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
}

.app-label-anchor, .app-label-anchor * {
  box-sizing: border-box;
}

.app-label-billboard {
  position: absolute;
  bottom: 0;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 270px;
  color: #d9f7ff;
  font-size: 12px;
  line-height: 1.35;
  pointer-events: none;
  transform: translateX(-50%);
}

.app-label-billboard__card {
  width: 270px;
  overflow: hidden;
  border: 1px solid rgba(80, 220, 255, 0.8);
  border-radius: 5px;
  background:
    linear-gradient(135deg, rgba(14, 46, 68, 0.96), rgba(6, 20, 34, 0.92)),
    rgba(8, 26, 42, 0.94);
  box-shadow:
    0 0 18px rgba(0, 184, 255, 0.2),
    inset 0 0 20px rgba(46, 203, 255, 0.06);
  backdrop-filter: blur(5px);
}

.app-label-billboard__header {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(80, 220, 255, 0.28);
  background: rgba(35, 145, 190, 0.16);
  color: #f1fcff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.app-label-billboard__status {
  width: 8px;
  height: 8px;
  margin-right: 7px;
  border-radius: 50%;
  background: #48f0a5;
  box-shadow: 0 0 8px rgba(72, 240, 165, 0.9);
}

.app-label-billboard__code {
  margin-left: auto;
  color: #6edfff;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0;
}

.app-label-billboard__rows {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 6px 10px 9px;
}

.app-label-billboard__rows > div {
  display: flex;
  min-width: 0;
  padding: 5px 4px;
  border-bottom: 1px dashed rgba(126, 214, 240, 0.12);
}

.app-label-billboard__rows span {
  flex-shrink: 0;
  margin-right: 7px;
  color: #7fa9b8;
}

.app-label-billboard__rows strong {
  min-width: 0;
  overflow: hidden;
  color: #e5faff;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-label-billboard__rows strong.is-normal {
  color: #48f0a5;
}

.app-label-billboard__stem {
  width: 1px;
  height: 58px;
  background: linear-gradient(to bottom, #55ddff, rgba(85, 221, 255, 0.24));
  box-shadow: 0 0 5px rgba(85, 221, 255, 0.55);
}

.app-label-billboard__anchor {
  width: 8px;
  height: 8px;
  border: 2px solid #64e4ff;
  border-radius: 50%;
  background: rgba(8, 30, 48, 0.92);
  box-shadow:
    0 0 0 4px rgba(80, 220, 255, 0.12),
    0 0 10px rgba(80, 220, 255, 0.7);
}

/* 标签编辑器中按正常文档流展示完整示例。 */
.preview-wrapper > .app-label-anchor {
  width: 270px;
  height: auto;
  margin: 24px auto;
}

.preview-wrapper > .app-label-anchor > .app-label-billboard {
  position: relative;
  bottom: auto;
  left: auto;
  transform: none;
}`,
                labels: [
                    {
                        "id": "d1",
                        "title": "设备运行信息",
                        "code": "EQ-001",
                        "name": "一号监测设备",
                        "status": "正常",
                        "temperature": 36.8,
                        "voltage": 220,
                        "power": 18.6,
                        "hours": "1,286",
                        "area": "A 区",
                        "updatedAt": "刚刚",
                        "lng": 108.95940826330946,
                        "lat": 34.219739657625965,
                        "height": 10
                    },
                    {
                        "id": "d2",
                        "title": "设备运行信息",
                        "code": "EQ-002",
                        "name": "二号监测设备",
                        "status": "正常",
                        "temperature": 35.2,
                        "voltage": 220,
                        "power": 16.2,
                        "hours": "968",
                        "area": "B 区",
                        "updatedAt": "刚刚",
                        "lng": 108.964,
                        "lat": 34.218,
                        "height": 10
                    },
                    {
                        "id": "d3",
                        "title": "设备运行信息",
                        "code": "EQ-003",
                        "name": "三号监测设备",
                        "status": "正常",
                        "temperature": 37.1,
                        "voltage": 220,
                        "power": 19.4,
                        "hours": "1,052",
                        "area": "C 区",
                        "updatedAt": "刚刚",
                        "lng": 108.96,
                        "lat": 34.22,
                        "height": 10
                    }
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
        { name: 'bid', label: '对象 BID', type: 'text', defaultValue: '' },
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
        { name: 'bid', label: '对象 BID', type: 'text', defaultValue: '' },
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

// AI 大脑组件配置 (2D 组件)
const aiBrainConfig = {
    label: 'AI 大脑',
    icon: '🧠',
    category: '2d',
    defaultSize: { width: 72, height: 72 },
    minSize: { width: 72, height: 72 },
    props: [
        {
            name: 'model',
            label: '模型',
            type: 'select',
            options: [
                { label: 'GLM-4.7-Flash（免费）', value: 'glm-4.7-flash' },
                { label: 'GLM-4.7', value: 'glm-4.7' }
            ],
            defaultValue: 'glm-4.7-flash'
        },
        {
            name: 'apiToken',
            label: 'API Token',
            type: 'password',
            defaultValue: '',
            placeholder: '留空则使用服务器环境变量'
        },
        { name: 'zIndex', label: '层级', type: 'number', defaultValue: 10 }
    ]
};

// 中心旋转组件配置 (3D 逻辑组件)
const centerRotateConfig = {
    label: '中心旋转',
    icon: '🔄',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [
        {
            name: 'speed',
            label: '旋转速度',
            type: 'number',
            defaultValue: 2.0,
            min: 0.5,
            max: 15,
            step: 0.5
        }
    ],
    actions: [
        { name: 'enable', label: '开始旋转' },
        { name: 'disable', label: '停止旋转' }
    ]
};

// 广告牌：配置直接对应 Core API，空间旋转统一使用角度。
const billboardConfig = {
    label: '广告牌',
    icon: '🖼️',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [],
    dataConfig: [{
        name: 'config', label: '广告牌配置', type: 'json-editor',
        defaultValue: [{
            url: '', type: 'video', width: 4, height: 2,
            position: { x: 0, y: 2, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            mediaRotation: 0
        }],
        description: '每项为一块广告牌的完整 API 参数；rotation 为 XYZ 角度，mediaRotation 为 0/90/180/270。空数组清除全部广告牌。'
    }],
    actions: [{ name: 'enable', label: '启用' }, { name: 'disable', label: '禁用' }]
};
const videoMonitorConfig = {
    label: '视频监控',
    icon: '📹',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    minSize: { width: 80, height: 40 },
    props: [],
    dataConfig: [{
        name: 'config', label: '视频监控配置', type: 'json-editor',
        defaultValue: [{
            position: { x: 0, y: 2, z: 0 },
            width: 320, height: 180, url: ''
        }],
        description: '每项为一个监控：position 为 XYZ 点位，width/height 为像素，url 为浏览器可播放的视频地址。也支持 x/y/z 或 lng/lat/height（经纬度模式请用 videoHeight 指定播放器像素高度）。暂不支持 RTSP。'
    }],
    actions: [{ name: 'enable', label: '启用' }, { name: 'disable', label: '禁用' }]
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
    registerWidget('AIBrain', aiBrainConfig, () => import('../components/widgets/AIBrainWidget.vue'));

    // 3D 组件
    registerWidget('Label3D', labelConfig, () => import('../components/widgets/LabelWidget.vue'));
    registerWidget('VideoMonitor', videoMonitorConfig, () => import('../components/widgets/VideoMonitorWidget.vue'));
    registerWidget('Tour', tourConfig, () => import('../components/widgets/TourWidget.vue'));
    registerWidget('Stats', statsConfig, () => import('../components/widgets/StatsWidget.vue'));
    registerWidget('Outline', outlineConfig, () => import('../components/widgets/OutlineWidget.vue'));
    registerWidget('Highlight', highlightConfig, () => import('../components/widgets/HighlightWidget.vue'));
    registerWidget('Camera', cameraConfig, () => import('../components/widgets/CameraWidget.vue'));
    registerWidget('Rain', rainConfig, () => import('../components/widgets/RainWidget.vue'));
    registerWidget('Snow', snowConfig, () => import('../components/widgets/SnowWidget.vue'));
    registerWidget('Shield', shieldConfig, () => import('../components/widgets/ShieldWidget.vue'));
    registerWidget('Scan', scanConfig, () => import('../components/widgets/ScanWidget.vue'));
    registerWidget('Billboard', billboardConfig, () => import('../components/widgets/BillboardWidget.vue'));
    registerWidget('CameraControl', cameraControlConfig, () => import('../components/widgets/CameraControlWidget.vue'));
    registerWidget('CenterRotate', centerRotateConfig, () => import('../components/widgets/CenterRotateWidget.vue'));
}
