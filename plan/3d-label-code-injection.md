# 3D 标签代码注入功能实施计划

> 版本: 1.0  
> 日期: 2025-12-19  
> 状态: 待审批

## 📋 功能概述

在 **app-editor** 中实现 3D 标签组件的代码注入功能，允许用户：
1. 通过代码编辑器自定义标签的 HTML 模板和 CSS 样式
2. 实时预览标签效果
3. 配置 JSON 数据源（包含坐标和业务数据）
4. 批量创建绑定到 3D 场景的标签

```
┌─────────────────────────────────────────────────────────────────┐
│                    用户工作流程                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. 拖拽 LabelWidget 到画布                                      │
│                    ↓                                            │
│  2. 在属性面板选择绑定的 SceneWidget                              │
│                    ↓                                            │
│  3. 点击 [代码注入] 按钮 → 打开代码编辑弹窗                        │
│     ├── 编辑 HTML 模板 (支持 {{ variable }} 语法)                │
│     ├── 编辑 CSS 样式                                            │
│     └── 点击 [运行] 实时预览                                      │
│                    ↓                                            │
│  4. 在数据面板配置 JSON 数据源                                    │
│     [{ name: "POI-1", lng: 120.1, lat: 30.2, height: 0 }, ...]  │
│                    ↓                                            │
│  5. 预览/运行 → 批量调用 createLabel() 创建 3D 标签              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ 技术架构

### 组件依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                      app-editor                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐     ┌─────────────────────────────┐    │
│  │  LabelWidget    │────▶│  SceneWidget                │    │
│  │  (3D标签配置)    │     │  (Meteor3D Instance)        │    │
│  └────────┬────────┘     └──────────────┬──────────────┘    │
│           │                             │                   │
│           ▼                             ▼                   │
│  ┌─────────────────┐     ┌─────────────────────────────┐    │
│  │ LabelCodeEditor │     │  @meteor3d/core             │    │
│  │ (代码编辑弹窗)   │     │  └── createLabel()         │    │
│  └─────────────────┘     └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 数据结构设计

```javascript
// LabelWidget 的 data 结构
{
  // 绑定的场景组件 ID
  sceneWidgetId: 'widget-scene-xxx',
  
  // HTML 模板 (支持 {{ variable }} 模板语法)
  template: `
    <div class="poi-label">
      <div class="title">{{ name }}</div>
      <div class="value">{{ value }} 米</div>
    </div>
  `,
  
  // CSS 样式
  style: `
    .poi-label {
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #00ccff;
      border-radius: 4px;
      padding: 8px 12px;
      color: #ffffff;
    }
    .poi-label .title {
      font-size: 14px;
      font-weight: bold;
    }
    .poi-label .value {
      font-size: 12px;
      color: #00ccff;
    }
  `,
  
  // 数据源 (JSON 数组)
  dataSource: [
    { name: 'A栋', value: 120, lng: 120.155, lat: 30.285, height: 50 },
    { name: 'B栋', value: 85, lng: 120.156, lat: 30.286, height: 30 }
  ],
  
  // 偏移量
  offset: { x: 0, y: -20 }
}
```

---

## 📁 文件变更清单

### 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/widgets/LabelCodeEditor.vue` | 代码编辑弹窗组件 |
| `src/components/common/CodeEditor.vue` | 通用代码编辑器封装 |

### 修改文件

| 文件路径 | 变更内容 |
|----------|----------|
| `src/core/widgetRegistry.js` | 更新 Label3D 的 props 配置 |
| `src/components/widgets/LabelWidget.vue` | 集成场景绑定和标签创建逻辑 |
| `src/components/right/PropertyPanel.vue` | 添加"代码注入"按钮入口 |
| `src/components/right/DataPanel.vue` | 实现 JSON 数据编辑功能 |
| `src/stores/appStore.js` | 添加场景实例引用管理 |

---

## 📝 详细实施步骤

### Phase 1: 基础设施 (预计 0.5 天)

#### 1.1 安装代码编辑器依赖

```bash
cd packages/app-editor
pnpm add @codemirror/view @codemirror/state @codemirror/lang-html @codemirror/lang-css @codemirror/lang-json @codemirror/theme-one-dark
```

> 选用 **CodeMirror 6**，体积小 (~200KB)，支持 HTML/CSS/JSON 语法高亮。

#### 1.2 创建通用代码编辑器组件

**文件**: `src/components/common/CodeEditor.vue`

```vue
<template>
  <div ref="editorRef" class="code-editor"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

const props = defineProps({
  modelValue: { type: String, default: '' },
  language: { type: String, default: 'html' }, // html | css | json
  readonly: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue']);

const editorRef = ref(null);
let editorView = null;

const languageExtensions = {
  html: html(),
  css: css(),
  json: json()
};

onMounted(() => {
  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      languageExtensions[props.language] || html(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString());
        }
      }),
      EditorView.editable.of(!props.readonly)
    ]
  });

  editorView = new EditorView({
    state,
    parent: editorRef.value
  });
});

onUnmounted(() => {
  editorView?.destroy();
});

// 外部值变化时更新编辑器
watch(() => props.modelValue, (newVal) => {
  if (editorView && newVal !== editorView.state.doc.toString()) {
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: newVal }
    });
  }
});
</script>

<style scoped>
.code-editor {
  width: 100%;
  height: 100%;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
}
</style>
```

---

### Phase 2: 代码编辑弹窗 (预计 1 天)

#### 2.1 创建 LabelCodeEditor 组件

**文件**: `src/components/widgets/LabelCodeEditor.vue`

**功能要点**:
- 左侧：Tab 切换 Template / Style 编辑器
- 右侧：实时预览区域
- 顶部工具栏：运行按钮、保存按钮
- 模板语法支持：`{{ variableName }}`

**UI 布局**:

```
┌──────────────────────────────────────────────────────────────┐
│  [✕] 代码编辑器                                    [运行] [保存] │
├────────────────────────────┬─────────────────────────────────┤
│  [Template] [Style]        │         预览区域                 │
├────────────────────────────┤                                 │
│                            │     ┌─────────────────┐         │
│  <div class="label">       │     │   A栋           │         │
│    <span>{{ name }}</span> │     │   120 米        │         │
│  </div>                    │     └─────────────────┘         │
│                            │                                 │
│                            │    (使用 dataSource[0] 预览)     │
└────────────────────────────┴─────────────────────────────────┘
```

#### 2.2 核心逻辑

```javascript
// 模板渲染函数
function renderTemplate(template, data) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

// 样式注入函数 (使用 scoped style)
function injectStyle(css, scopeId) {
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-label-scope', scopeId);
  // 为选择器添加 scope 前缀
  const scopedCss = css.replace(/(^|\})\s*([^{]+)\s*\{/g, (match, prefix, selector) => {
    const scopedSelector = selector.split(',')
      .map(s => `[data-scope="${scopeId}"] ${s.trim()}`)
      .join(', ');
    return `${prefix} ${scopedSelector} {`;
  });
  styleEl.textContent = scopedCss;
  document.head.appendChild(styleEl);
  return styleEl;
}
```

---

### Phase 3: 属性面板集成 (预计 0.5 天)

#### 3.1 更新 widgetRegistry.js

```javascript
// 3D 标签组件配置
const labelConfig = {
  label: '3D 标签',
  icon: '🏷️',
  category: '3d',
  defaultSize: { width: 200, height: 120 },
  minSize: { width: 120, height: 80 },
  props: [
    {
      name: 'sceneWidgetId',
      label: '绑定场景',
      type: 'scene-select',  // 自定义类型：选择画布中的 SceneWidget
      defaultValue: ''
    },
    {
      name: 'codeEditor',
      label: '代码注入',
      type: 'button',        // 按钮类型：点击打开弹窗
      action: 'openLabelCodeEditor'
    },
    {
      name: 'offset',
      label: '偏移量',
      type: 'offset',
      defaultValue: { x: 0, y: -20 }
    }
  ]
};
```

#### 3.2 扩展 PropertyPanel.vue

- 支持 `type: 'scene-select'`：下拉选择画布中的 SceneWidget
- 支持 `type: 'button'`：渲染按钮，触发指定 action
- 监听 `openLabelCodeEditor` action，打开代码编辑弹窗

---

### Phase 4: 数据面板 (预计 0.5 天)

#### 4.1 实现 DataPanel.vue

**功能**:
- JSON 格式数据编辑（使用 CodeEditor，language="json"）
- 数据校验（必须包含 lng/lat 字段）
- 数据预览表格

**UI 布局**:

```
┌──────────────────────────────────────┐
│  数据源                              │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ [                              │  │
│  │   { "name": "A栋",             │  │
│  │     "lng": 120.155,            │  │
│  │     "lat": 30.285,             │  │
│  │     "height": 50 }             │  │
│  │ ]                              │  │
│  └────────────────────────────────┘  │
│                                      │
│  数据预览 (共 2 条)                   │
│  ┌────────┬─────────┬─────────────┐  │
│  │ name   │ lng     │ lat         │  │
│  ├────────┼─────────┼─────────────┤  │
│  │ A栋    │ 120.155 │ 30.285      │  │
│  │ B栋    │ 120.156 │ 30.286      │  │
│  └────────┴─────────┴─────────────┘  │
└──────────────────────────────────────┘
```

---

### Phase 5: LabelWidget 集成 (预计 0.5 天)

#### 5.1 更新 LabelWidget.vue

**核心逻辑**:

```javascript
import { watch, inject, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  data: Object,
  isEditMode: Boolean
});

// 获取 appStore 中的场景实例映射
const sceneInstances = inject('sceneInstances');

// 存储创建的标签实例
let createdLabels = [];

// 监听数据变化，重新创建标签
watch(
  () => [props.data.template, props.data.style, props.data.dataSource, props.data.sceneWidgetId],
  () => {
    if (!props.isEditMode) {
      recreateLabels();
    }
  },
  { deep: true }
);

function recreateLabels() {
  // 1. 清除旧标签
  createdLabels.forEach(label => label.dispose());
  createdLabels = [];

  // 2. 获取绑定的场景实例
  const sceneInstance = sceneInstances.get(props.data.sceneWidgetId);
  if (!sceneInstance) {
    console.warn('未找到绑定的场景实例');
    return;
  }

  // 3. 注入样式
  const scopeId = `label-${Date.now()}`;
  injectScopedStyle(props.data.style, scopeId);

  // 4. 批量创建标签
  const { template, dataSource, offset } = props.data;
  dataSource.forEach(item => {
    const content = `<div data-scope="${scopeId}">${renderTemplate(template, item)}</div>`;
    const label = sceneInstance.createLabel({
      lngLat: { lng: item.lng, lat: item.lat, height: item.height || 0 },
      content,
      offset
    });
    if (label) {
      createdLabels.push(label);
    }
  });
}

// 组件销毁时清理
onUnmounted(() => {
  createdLabels.forEach(label => label.dispose());
});
```

---

### Phase 6: 场景实例管理 (预计 0.5 天)

#### 6.1 更新 appStore.js

```javascript
// 添加场景实例映射
const sceneInstances = ref(new Map());

// 注册场景实例
function registerSceneInstance(widgetId, instance) {
  sceneInstances.value.set(widgetId, instance);
}

// 注销场景实例
function unregisterSceneInstance(widgetId) {
  const instance = sceneInstances.value.get(widgetId);
  if (instance) {
    instance.dispose();
    sceneInstances.value.delete(widgetId);
  }
}

// 获取场景实例
function getSceneInstance(widgetId) {
  return sceneInstances.value.get(widgetId);
}
```

#### 6.2 更新 SceneWidget.vue

在 `loadScene` 成功后注册实例：

```javascript
onMounted(async () => {
  if (props.data.sceneId) {
    const instance = await loadScene({
      sceneId: props.data.sceneId,
      serverUrl: API_BASE_URL,
      container: containerRef.value
    });
    
    // 注册到 appStore
    appStore.registerSceneInstance(props.widgetId, instance);
  }
});

onUnmounted(() => {
  appStore.unregisterSceneInstance(props.widgetId);
});
```

---

## ✅ 验收标准

| 编号 | 验收项 | 验收方式 |
|------|--------|----------|
| AC-1 | 拖拽 LabelWidget 到画布，显示 placeholder | 手动测试 |
| AC-2 | 属性面板显示"绑定场景"下拉框，可选择 SceneWidget | 手动测试 |
| AC-3 | 点击"代码注入"按钮，弹出代码编辑器 | 手动测试 |
| AC-4 | 代码编辑器支持 HTML/CSS 语法高亮 | 手动测试 |
| AC-5 | 点击"运行"按钮，右侧实时预览标签样式 | 手动测试 |
| AC-6 | 数据面板支持 JSON 编辑和校验 | 手动测试 |
| AC-7 | 切换到预览模式，3D 场景中显示标签 | 手动测试 |
| AC-8 | 标签位置正确（根据 lng/lat 转换为世界坐标） | 手动测试 |
| AC-9 | 应用保存后重新加载，标签配置恢复正常 | 手动测试 |

---

## 🕐 时间估算

| 阶段 | 任务 | 预计耗时 |
|------|------|----------|
| Phase 1 | 基础设施 (CodeMirror 集成) | 0.5 天 |
| Phase 2 | 代码编辑弹窗 | 1 天 |
| Phase 3 | 属性面板集成 | 0.5 天 |
| Phase 4 | 数据面板 | 0.5 天 |
| Phase 5 | LabelWidget 集成 | 0.5 天 |
| Phase 6 | 场景实例管理 | 0.5 天 |
| **总计** | | **3.5 天** |

---

## ⚠️ 风险与依赖

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| CodeMirror 6 体积 | 增加 ~200KB 包体积 | 可接受，按需加载 |
| GIS 未配置时标签创建失败 | 用户困惑 | 增加提示："请先在场景编辑器中配置 GIS" |
| 多个 LabelWidget 绑定同一 SceneWidget | 标签重复 | 每个 LabelWidget 独立管理自己的标签列表 |

---

## 📌 后续扩展

- [ ] 标签点击事件绑定 (交互面板)
- [ ] 标签分组管理
- [ ] 标签动画效果 (进入/退出)
- [ ] 标签数据源支持 API 接口
