# ECharts 代码编辑器开发计划

## 目标

支持用户粘贴 MakeAPie 代码到 ECharts 组件，实现自定义图表渲染。

---

## 任务清单

### Phase 1: 代码编辑器扩展

- [x] 1.1 `DataCodeEditor.vue` 添加 JavaScript 语言支持
  - 安装 `@codemirror/lang-javascript`
  - 扩展 extensions 计算属性

### Phase 2: 代码执行器

- [x] 2.1 创建 `utils/codeExecutor.js`
  - 实现沙箱执行 `new Function()`
  - 禁止危险 API：`setTimeout`, `setInterval`, `fetch`, `XMLHttpRequest`
  - 返回 option 对象

### Phase 3: EChartsWidget 改造

- [x] 3.1 修改 `EChartsWidget.vue`
  - 从 `data.code` 读取用户代码
  - 调用执行器获取 option
  - 错误处理与提示

- [x] 3.2 更新 `widgetRegistry.js`
  - 添加 `code` 字段（type: `code-editor`, language: `javascript`）
  - 移除旧的 `chartType` 配置

---

## 技术方案

### 代码执行器

```javascript
// utils/codeExecutor.js
export function executeEChartsCode(code, echarts) {
  // 禁止的全局对象
  const forbidden = {
    setTimeout: undefined,
    setInterval: undefined,
    fetch: undefined,
    XMLHttpRequest: undefined,
    eval: undefined
  };

  const fn = new Function(
    'echarts', 
    ...Object.keys(forbidden),
    `var option = null; ${code}; return option;`
  );

  return fn(echarts, ...Object.values(forbidden));
}
```

### 安全边界

| API | 处理 |
|-----|------|
| `setTimeout/setInterval` | 传入 undefined 屏蔽 |
| `fetch/XMLHttpRequest` | 传入 undefined 屏蔽 |
| `eval` | 传入 undefined 屏蔽 |
| `console` | 保留（调试用） |

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `DataCodeEditor.vue` | 修改 - 添加 JS 语言 |
| `utils/codeExecutor.js` | 新建 |
| `EChartsWidget.vue` | 修改 - 使用执行器 |
| `widgetRegistry.js` | 修改 - 更新配置 |
| `package.json` | 修改 - 添加依赖 |

---

## 预期效果

1. 用户拖入 ECharts 组件
2. 点击"编辑"打开代码编辑器弹窗
3. 粘贴 MakeAPie 代码
4. 点击"应用"，图表实时渲染
