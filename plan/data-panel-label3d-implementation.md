# 数据面板配置化 & Label3D 组件实施方案

> 日期：2024-12-22

## 一、背景与目标

### 1.1 问题

当前 DataPanel 是占位状态，未来需要支持多种数据配置场景：
- Label3D：模板代码 + 样式代码 + JSON 数据
- ECharts：数据源配置 + API 地址 + 静态数据
- 其他组件：各类自定义数据输入

如果每个组件的数据面板逻辑硬编码在 `DataPanel.vue` 中，将导致代码臃肿且难以扩展。

### 1.2 目标

1. **配置驱动**：数据面板根据 `widgetRegistry` 中的 `dataConfig` 自动渲染
2. **统一模式**：与 PropertyPanel 的 `props` 配置保持一致的设计模式
3. **可扩展性**：新增组件只需定义配置，无需修改 DataPanel 源码

---

## 二、架构设计

### 2.1 配置结构

在 `widgetRegistry.js` 中，为每个组件添加 `dataConfig` 字段：

```javascript
const labelConfig = {
    label: '3D 标签',
    icon: '🏷️',
    category: '3d',
    defaultSize: { width: 150, height: 80 },
    
    // 属性配置 (PropertyPanel)
    props: [],
    
    // 数据配置 (DataPanel)
    dataConfig: [
        {
            name: 'template',
            label: '标签模板',
            type: 'code-editor',
            language: 'html',
            defaultValue: '<div class="label">{{name}}</div>',
            description: '支持 {{变量}} 语法'
        },
        {
            name: 'style',
            label: '样式',
            type: 'code-editor',
            language: 'css',
            defaultValue: '.label { background: rgba(0,0,0,0.8); color: #fff; padding: 8px; }'
        },
        {
            name: 'labels',
            label: '标签数据',
            type: 'json-editor',
            defaultValue: [],
            schema: {
                type: 'array',
                items: {
                    id: 'string',
                    name: 'string',
                    lng: 'number',
                    lat: 'number',
                    height: 'number'
                }
            }
        }
    ]
};
```

### 2.2 支持的配置类型

| type | 说明 | 渲染方式 | 属性 |
|------|------|----------|------|
| `text` | 文本输入 | `<input>` | - |
| `number` | 数字输入 | `<input type="number">` | `min`, `max`, `step` |
| `select` | 下拉选择 | `<select>` | `options` |
| `color` | 颜色选择 | `<input type="color">` | - |
| `code-editor` | 代码编辑器 | CodeMirror 6 | `language` |
| `json-editor` | JSON 编辑器 | CodeMirror + 校验 | `schema` |
| `button` | 弹窗按钮 | 自定义组件 | `component` |

### 2.3 组件层次

```
DataPanel.vue
├── 遍历 dataConfig
├── 根据 type 动态渲染:
│   ├── DataTextInput.vue
│   ├── DataNumberInput.vue
│   ├── DataSelect.vue
│   ├── DataColorPicker.vue
│   ├── DataCodeEditor.vue    ← 代码编辑器
│   └── DataJsonEditor.vue    ← JSON 编辑器
```

---

## 三、Label3D 组件设计

### 3.1 数据结构

```javascript
// widget.data 结构
{
    // 模板 HTML (支持 {{变量}} 语法)
    template: '<div class="label"><span>{{name}}</span></div>',
    
    // 样式 CSS
    style: '.label { background: rgba(0,0,0,0.8); color: #fff; padding: 8px 12px; border-radius: 4px; }',
    
    // 标签数据列表
    labels: [
        { id: 'p1', name: '监控点A', lng: 120.123, lat: 30.456, height: 10 },
        { id: 'p2', name: '监控点B', lng: 120.234, lat: 30.567, height: 15 }
    ]
}
```

### 3.2 模板变量替换

```javascript
// 将模板 + 数据 → 最终 HTML
function renderTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
    });
}

// 示例
renderTemplate('<div>{{name}}</div>', { name: '监控点A' })
// → '<div>监控点A</div>'
```

### 3.3 LabelWidget 生命周期

```
┌─────────────────────────────────────────────────────────────────┐
│  LabelWidget.vue (3D 逻辑组件)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  onMounted / watch(enabled)                                     │
│      │                                                          │
│      ├── enabled = true                                         │
│      │      ├── 注入 <style> 到页面                              │
│      │      ├── 遍历 labels 数据                                 │
│      │      └── 调用 Core.createLabel() 批量创建                 │
│      │                                                          │
│      └── enabled = false                                        │
│             ├── 调用 Core.clearLabels() 清除                     │
│             └── 移除 <style>                                     │
│                                                                 │
│  watch(data.labels) - 数据变化时更新标签                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、代码编辑器组件设计

### 4.1 依赖安装

```bash
cd packages/app-editor
pnpm add codemirror @codemirror/lang-html @codemirror/lang-css @codemirror/lang-json vue-codemirror
```

### 4.2 DataCodeEditor.vue 布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  [模板编辑器]                                              [X]      │
├────────────────────────────────────────────┬─────────────────────────┤
│                                            │                         │
│  Template (HTML)                           │                         │
│  ┌────────────────────────────────────┐    │      实 时 预 览        │
│  │ <div class="label">                │    │                         │
│  │   <span>{{name}}</span>            │    │   ┌─────────────────┐   │
│  │ </div>                             │    │   │   监控点A       │   │
│  └────────────────────────────────────┘    │   └─────────────────┘   │
│                                            │                         │
│  Style (CSS)                               │                         │
│  ┌────────────────────────────────────┐    │                         │
│  │ .label {                           │    │                         │
│  │   background: rgba(0,0,0,0.8);     │    │                         │
│  │   color: #fff;                     │    │                         │
│  │ }                                  │    │                         │
│  └────────────────────────────────────┘    │                         │
│                                            │                         │
├────────────────────────────────────────────┴─────────────────────────┤
│                                          [取消]  [应用]              │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.3 预览逻辑

- 左侧代码变化时，右侧实时更新
- 使用示例数据 `{ name: '预览标签' }` 渲染模板
- 将 CSS 注入到 iframe 或 scoped 容器中

---

## 五、实施清单

### 阶段 1：基础设施

- [ ] 安装 codemirror 依赖
- [ ] 扩展 widgetRegistry 添加 `dataConfig` 字段
- [ ] 添加 `getWidgetDataConfig(type)` 函数

### 阶段 2：DataPanel 改造

- [ ] 创建 `DataCodeEditor.vue` (代码编辑器组件)
- [ ] 创建 `DataJsonEditor.vue` (JSON 编辑器组件)
- [ ] 改造 `DataPanel.vue` 配置驱动渲染

### 阶段 3：LabelWidget 实现

- [ ] 创建 `LabelTemplateEditorModal.vue` (模板编辑弹窗)
- [ ] 实现 `LabelWidget.vue` 核心逻辑
  - [ ] 注入样式
  - [ ] 模板变量替换
  - [ ] 批量创建标签
  - [ ] 启用/禁用生命周期
- [ ] 配置 labelConfig 的 dataConfig

### 阶段 4：验证测试

- [ ] 添加场景组件 → 选择场景
- [ ] 添加 Label3D → 打开模板编辑器 → 编写模板
- [ ] 打开数据编辑器 → 添加标签点位
- [ ] 预览模式验证标签显示
- [ ] 保存/加载验证数据持久化

---

## 六、注意事项

1. **XSS 安全**：用户输入的 HTML/CSS 需要考虑安全性（当前场景为内部使用，可暂不处理）
2. **性能优化**：大量标签时考虑虚拟化或分页加载
3. **错误处理**：JSON 解析失败、坐标越界等异常要友好提示
4. **GIS 依赖**：标签使用经纬度时需确保场景已配置 GIS

---

## 七、预期产出

1. **配置驱动的 DataPanel**：可复用于任何组件
2. **Label3D 组件**：完整的 3D 标签编辑能力
3. **代码编辑器组件**：支持 HTML/CSS/JSON 多语言
4. **模板系统**：支持 `{{变量}}` 语法的简单模板引擎
