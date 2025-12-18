# App Editor 重构计划

> 本文档详细描述 `@meteor3d/app-editor` 应用编辑器的完整重构方案。

---

## 一、项目背景

当前 app-editor 是一个简单的低代码应用编辑器，需要进行全面重构以支持更丰富的组件类型、更完善的交互能力、以及后端持久化功能。

### 核心目标

1. **布局重构**：左侧分为组件树 + 组件菜单，右侧改为可切换的三个面板
2. **组件扩展**：新增 2D/3D 组件分类，支持更多组件类型
3. **交互增强**：支持组件拖拽改变大小和位置
4. **持久化**：场景数据通过后端保存（全量保存）

---

## 二、布局架构

### 2.1 整体布局

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Header                                    │
│  [Logo]  App Editor                              [编辑开关] [保存]   │
├──────────────┬────────────────────────────┬────────────────────────┤
│   Left       │                            │      Right Panel       │
│   Panel      │                            │  ┌──────────────────┐  │
│ ┌──────────┐ │                            │  │ 属性 │ 数据 │ 交互 │  │
│ │ 组件树    │ │                            │  ├──────────────────┤  │
│ │ (已添加)  │ │        Canvas             │  │                  │  │
│ ├──────────┤ │         画布               │  │   当前 Tab 内容   │  │
│ │ 组件菜单  │ │                            │  │                  │  │
│ │ 场景组件  │ │                            │  │                  │  │
│ │ 2D 组件   │ │                            │  │                  │  │
│ │ 3D 组件   │ │                            │  │                  │  │
│ └──────────┘ │                            │  └──────────────────┘  │
└──────────────┴────────────────────────────┴────────────────────────┘
```

### 2.2 左侧面板 (LeftPanel)

| 区域 | 说明 |
|------|------|
| **组件树 (ComponentTree)** | 展示画布上已添加的组件列表，支持选中、删除操作 |
| **组件菜单 (ComponentMenu)** | 按分类展示可拖拽添加的组件 |

### 2.3 右侧面板 (RightPanel)

三个可切换的 Tab 面板：

| Tab | 说明 |
|-----|------|
| **属性面板 (PropertyPanel)** | 编辑选中组件的基础属性（位置、大小、组件特有属性） |
| **数据面板 (DataPanel)** | 配置组件的数据源 (**本次仅 placeholder UI**) |
| **交互面板 (InteractionPanel)** | 配置组件的交互事件 (**本次仅 placeholder UI**) |

---

## 三、组件体系

### 3.1 组件分类

```
组件菜单
├── 🌍 场景组件
│   └── SceneWidget (已有，接入 scene-editor 场景)
├── 📊 2D 组件
│   ├── EChartsWidget    - ECharts 图表
│   ├── ButtonWidget     - 按钮 (已有，需增强)
│   ├── ImageWidget      - 图片
│   ├── TextWidget       - 文本
│   └── ClockWidget      - 当前时间
└── 🎯 3D 组件
    ├── LabelWidget      - 3D 标签 (placeholder)
    └── TourWidget       - 漫游路径 (placeholder)
```

### 3.2 组件注册表结构

```javascript
{
  type: 'ECharts',
  category: '2d',           // 'scene' | '2d' | '3d'
  label: 'ECharts 图表',
  icon: '📊',
  defaultSize: { width: 400, height: 300 },
  resizable: true,          // 是否可调整大小
  props: [...],             // 属性配置
  dataConfig: {...},        // 数据配置
  events: [...]             // 可绑定的事件
}
```

### 3.3 各组件详细设计

#### 3.3.1 SceneWidget (场景组件) - 保持现有逻辑

- 属性：`sceneId` (从后端获取场景列表)
- 数据：无
- 交互：暂无

#### 3.3.2 EChartsWidget (图表组件)

- 属性：`chartType` (line/bar/pie/scatter/radar)、`title`、`showLegend`
- 数据：支持静态 JSON 或 API URL
- 交互：点击图表元素事件

#### 3.3.3 ButtonWidget (按钮组件)

- 属性：`label`、`color`、`fontSize`、`borderRadius`
- 数据：无
- 交互：点击事件（可触发其他组件动作）

#### 3.3.4 ImageWidget (图片组件)

- 属性：`src` (URL 或上传)、`objectFit` (cover/contain/fill)
- 数据：无
- 交互：点击事件

#### 3.3.5 TextWidget (文本组件)

- 属性：`content`、`fontSize`、`color`、`fontWeight`、`textAlign`
- 数据：可绑定动态数据
- 交互：无

#### 3.3.6 ClockWidget (时间组件)

- 属性：`format` (HH:mm:ss / YYYY-MM-DD HH:mm:ss)、`fontSize`、`color`
- 数据：自动更新当前时间
- 交互：无

#### 3.3.7 LabelWidget (3D 标签) - Placeholder

- 属性：`text`、`position` (3D 坐标)、`style`
- 数据：暂无
- 交互：暂无
- 备注：需要与 SceneWidget 联动

#### 3.3.8 TourWidget (漫游组件) - Placeholder

- 属性：`waypoints` (路径点列表)、`speed`、`loop`
- 数据：暂无
- 交互：暂无
- 备注：需要与 SceneWidget 联动

---

## 四、画布交互

### 4.1 组件选中与操作

- 点击组件：选中，显示选中边框
- 点击空白区域：取消选中
- Delete 键：删除选中组件

### 4.2 拖拽移动

- 鼠标按住组件内部拖拽
- 实时更新 `position.x` / `position.y`

### 4.3 拖拽缩放

在选中组件时显示 8 个缩放手柄：

```
┌───────●───────┐
│               │
●               ●
│               │
└───────●───────┘
  (四角 + 四边中点)
```

| 手柄位置 | 缩放方向 |
|---------|----------|
| 四角 | 自由缩放 (宽+高) |
| 左右中点 | 仅宽度 |
| 上下中点 | 仅高度 |

### 4.4 旋转

- 选中组件时显示旋转手柄（顶部中点上方）
- 拖拽旋转手柄改变组件角度
- 实时更新 `rotation` 属性（单位：度）

### 4.5 吸附 (Snapping)

- **网格吸附**：移动/缩放时自动对齐到网格
- **元素吸附**：靠近其他组件边缘时自动对齐
- **中心吸附**：组件中心对齐画布中心或其他组件中心

### 4.6 辅助线 (Guidelines)

- 移动组件时显示对齐参考线
- 水平/垂直方向的对齐提示
- 显示与其他组件的对齐关系

### 4.7 最小尺寸限制

每个组件类型定义 `minSize`，防止缩放过小。

### 4.8 技术选型：Moveable

> ⚠️ **重要**：吸附、旋转、辅助线等功能使用第三方库 **Moveable** 实现，不自行开发。

[Moveable](https://github.com/daybrush/moveable) 是专门为低代码/设计器工具设计的成熟库，具有以下优势：

| 功能 | 说明 |
|------|------|
| Draggable | 拖拽移动 |
| Resizable | 8 方向缩放 |
| Rotatable | 旋转 |
| Snappable | 网格吸附 + 元素吸附 |
| Guidelines | 自动显示对齐参考线 |
| Groupable | 多选成组操作 |

**使用 Vue3 封装版本**：[vue3-moveable](https://github.com/daybrush/moveable/tree/master/packages/vue3-moveable)

```bash
pnpm --filter @meteor3d/app-editor add vue3-moveable
```

---

## 五、数据持久化

### 5.1 应用数据结构

```javascript
{
  appId: 'uuid',
  name: '我的应用',
  description: '',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  canvas: {
    width: 1920,
    height: 1080,
    background: '#1a1a1a'
  },
  widgets: [
    {
      id: 'widget-uuid-1',
      type: 'Scene',
      position: { x: 0, y: 0 },
      size: { width: 800, height: 600 },
      rotation: 0,                           // 旋转角度 (度)
      data: { sceneId: 'scene-123' }
    },
    {
      id: 'widget-uuid-2',
      type: 'ECharts',
      position: { x: 820, y: 0 },
      size: { width: 400, height: 300 },
      rotation: 0,
      data: { chartType: 'line', title: '销量趋势' }
    }
  ]
}
```

### 5.2 后端 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/app/list` | 获取应用列表 |
| GET | `/api/app/:id` | 获取应用详情 |
| POST | `/api/app` | 创建应用 |
| PUT | `/api/app/:id` | 更新应用 (全量保存) |
| DELETE | `/api/app/:id` | 删除应用 |

---

## 六、文件结构 (重构后)

```
packages/app-editor/src/
├── main.js
├── App.vue
├── config.js
├── stores/
│   └── appStore.js              # 应用状态管理 (重构)
├── services/
│   └── appService.js            # 后端 API 调用 (新增)
├── views/
│   └── AppEditorView.vue        # 主视图布局 (重构)
├── components/
│   ├── header/
│   │   └── EditorHeader.vue     # 顶部工具栏 (新增)
│   ├── left/
│   │   ├── LeftPanel.vue        # 左侧面板容器 (新增)
│   │   ├── ComponentTree.vue    # 组件树 (新增)
│   │   └── ComponentMenu.vue    # 组件菜单 (重构自 WidgetPanel)
│   ├── canvas/
│   │   ├── AppCanvas.vue        # 画布 (重构自 AppViewport)
│   │   ├── WidgetWrapper.vue    # 组件包装器 (新增，处理选中/缩放)
│   │   └── ResizeHandles.vue    # 缩放手柄 (新增)
│   ├── right/
│   │   ├── RightPanel.vue       # 右侧面板容器 (新增)
│   │   ├── PropertyPanel.vue    # 属性面板 (重构)
│   │   ├── DataPanel.vue        # 数据面板 (新增)
│   │   └── InteractionPanel.vue # 交互面板 (新增)
│   └── widgets/
│       ├── SceneWidget.vue      # 场景组件 (保留)
│       ├── EChartsWidget.vue    # 图表组件 (新增)
│       ├── ButtonWidget.vue     # 按钮组件 (增强)
│       ├── ImageWidget.vue      # 图片组件 (新增)
│       ├── TextWidget.vue       # 文本组件 (新增)
│       ├── ClockWidget.vue      # 时间组件 (新增)
│       ├── LabelWidget.vue      # 3D 标签 (新增 placeholder)
│       └── TourWidget.vue       # 漫游组件 (新增 placeholder)
└── core/
    └── widgetRegistry.js        # 组件注册表 (重构)
```

---

## 七、实施阶段

### 阶段 1：布局重构 (预计 2-3 天)

- [ ] 创建 `EditorHeader.vue` 顶部工具栏
- [ ] 创建 `LeftPanel.vue` 左侧面板容器
- [ ] 创建 `ComponentTree.vue` 组件树
- [ ] 重构 `ComponentMenu.vue` 组件菜单 (分类展示)
- [ ] 创建 `RightPanel.vue` 右侧 Tab 面板容器
- [ ] 重构 `PropertyPanel.vue`
- [ ] 创建 `DataPanel.vue` (**placeholder UI**)
- [ ] 创建 `InteractionPanel.vue` (**placeholder UI**)
- [ ] 重构 `AppEditorView.vue` 整合新布局

### 阶段 2：画布交互增强 (预计 2 天)

- [ ] 安装并集成 `vue3-moveable`
- [ ] 创建 `WidgetWrapper.vue` 组件包装器 (使用 Moveable)
- [ ] 实现拖拽移动 (Draggable)
- [ ] 实现拖拽缩放 (Resizable, 8 方向)
- [ ] 实现旋转功能 (Rotatable)
- [ ] 配置吸附功能 (Snappable)
- [ ] 配置辅助线 (Guidelines)
- [ ] 实现最小尺寸限制
- [ ] 重构 `AppCanvas.vue`

### 阶段 3：2D 组件开发 (预计 2-3 天)

- [ ] 重构 `widgetRegistry.js` 支持分类
- [ ] 创建 `EChartsWidget.vue` (真实渲染)
- [ ] 增强 `ButtonWidget.vue`
- [ ] 创建 `ImageWidget.vue`
- [ ] 创建 `TextWidget.vue`
- [ ] 创建 `ClockWidget.vue`

### 阶段 4：3D 组件占位 (预计 0.5 天)

- [ ] 创建 `LabelWidget.vue` (placeholder UI)
- [ ] 创建 `TourWidget.vue` (placeholder UI)

### 阶段 5：后端持久化 (预计 1-2 天)

- [ ] 后端：创建 App Model 和数据库表
- [ ] 后端：实现 CRUD API (全量保存)
- [ ] 前端：创建 `appService.js`
- [ ] 前端：实现手动保存功能

### 阶段 6：集成测试 (预计 1 天)

- [ ] 整体功能联调
- [ ] 边界情况测试
- [ ] 性能优化

---

## 八、技术选型

| 功能 | 技术方案 |
|------|----------|
| 图表渲染 | ECharts 5.x |
| 画布控制器 | **vue3-moveable** (拖拽/缩放/旋转/吸附/辅助线) |
| Tab 切换 | 原生 CSS + Vue |
| 状态管理 | Pinia (现有) |

---

## 九、风险与注意事项

1. **SceneWidget 保持兼容**：场景组件已接入 `@meteor3d/core`，重构时需确保不破坏现有逻辑
2. **3D 组件联动**：LabelWidget 和 TourWidget 需要与 SceneWidget 通信，后续需设计好 API
3. **性能考虑**：大量组件时的渲染性能，考虑虚拟化或懒加载

---

## 十、附录

### A. 依赖安装

```bash
# ECharts 图表
pnpm --filter @meteor3d/app-editor add echarts

# Moveable 画布控制器 (拖拽/缩放/旋转/吸附/辅助线)
pnpm --filter @meteor3d/app-editor add vue3-moveable
```

### B. 参考资料

- [ECharts 官方文档](https://echarts.apache.org/)
- [Moveable GitHub](https://github.com/daybrush/moveable)
- [vue3-moveable 文档](https://daybrush.com/moveable/)
