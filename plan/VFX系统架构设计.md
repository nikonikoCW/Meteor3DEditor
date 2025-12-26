# 可编程特效系统架构设计 (Programmable VFX System)

为了兼顾易用性（内置特效）与灵活性（自定义特效），采用 **"核心驱动 + 通用组件 + 动态配置"** 的分层架构。

## 1. 核心层 (@meteor3d/core)
负责特效的生命周期管理与渲染实现。

-   **`VFXManager`**: 单例管理器，负责创建、更新、销毁特效实例。
-   **`BaseEffect`**: 所有特效的基类，定义统一接口 (`update`, `dispose`, `setParams`)。
-   **`CustomShaderEffect`**: 通用特效类，支持传入 Fragment Shader 代码和 Uniforms 配置，实现动态渲染。

## 2. 协议层 (Schema Protocol)
定义特效的参数结构，用于驱动编辑器生成 UI。

```json
// 示例：雷达扫描特效配置
{
  "type": "radar",
  "label": "雷达扫描",
  "shader": "gl_FragColor = ...", // 默认 Shader 代码
  "props": [
    { "name": "color", "type": "color", "label": "扫描颜色", "default": "#00ff00" },
    { "name": "speed", "type": "number", "label": "扫描速度", "default": 1.0, "min": 0.1, "max": 5.0 },
    { "name": "radius", "type": "number", "label": "半径", "default": 50 }
  ]
}
```

## 3. 应用层 (App Editor)
实现通用的特效组件 `VFXWidget.vue`，不为每个特效单独写 Widget。

-   **通用属性面板**：
    -   解析 `props` Schema，自动渲染对应的 UI 控件（ColorPicker, Slider, Input）。
    -   双向绑定：UI 变化 -> 更新 Widget Data -> 调用 Core `setParams`。
-   **自定义模式 (Custom Mode)**：
    -   提供代码编辑器 (`code-editor`) 供用户编写 Shader。
    -   提供 JSON 编辑器供用户定义参数 Schema。
    -   实时编译：代码修改后立即重新编译 Shader 并刷新属性面板。

## 4. 工作流
1.  **普通用户**：从下拉菜单选择 "雷达" -> 调整颜色/速度 -> 完成。
2.  **高级用户**：选择 "自定义" -> 编写 GLSL 代码 -> 定义 JSON 参数 -> 生成专属特效 -> (可选) 保存为预设。

## 5. 开发计划 (Development Plan)

### 第一阶段：核心能力建设 (@meteor3d/core)
1.  **实现 `VFXManager`**：
    -   管理特效实例的 Map。
    -   提供 `createEffect(type, config)` 和 `removeEffect(id)` 接口。
    -   在 `SceneManager` 的渲染循环中调用 `VFXManager.update()`。
2.  **实现 `BaseEffect` 和 `CustomShaderEffect`**：
    -   `BaseEffect`：封装 Three.js Mesh/Points 创建、销毁逻辑。
    -   `CustomShaderEffect`：继承基类，实现 `ShaderMaterial` 的动态创建，支持 Uniforms 注入。

### 第二阶段：内置特效示例
1.  **实现 `RadarEffect` (雷达)**：
    -   编写雷达扫描的 Shader。
    -   定义雷达的默认 Schema。
    -   注册到 `VFXManager` 的预置库中。

### 第三阶段：编辑器集成 (App Editor)
1.  **创建 `VFXWidget.vue`**：
    -   实现下拉菜单选择特效类型。
    -   实现动态属性面板（根据 Schema 生成 UI）。
    -   集成 `code-editor` 组件，支持 "Custom" 模式下的代码编辑。
2.  **联调验证**：
    -   在编辑器中添加雷达特效，调整参数，验证场景是否实时更新。
    -   尝试编写一段简单的自定义 Shader，验证动态编译功能。

## 6. 核心逻辑详解 (Core Logic Detail)

### 6.1 动态 Schema 驱动 UI
编辑器不硬编码任何特效的 UI。而是通过读取特效的 `props` 配置来动态生成。
-   `type: 'color'` -> 渲染 `<input type="color">`
-   `type: 'number'` -> 渲染 `<input type="range">`
-   `type: 'vector3'` -> 渲染 `X Y Z` 输入框

### 6.2 Shader 动态编译
当用户在编辑器中修改 Shader 代码或 JSON 配置时：
1.  `VFXWidget` 捕获变更事件（防抖处理）。
2.  调用 `VFXManager.updateEffect(id, { shader, props })`。
3.  `CustomShaderEffect` 接收到新 Shader 后：
    -   创建新的 `THREE.ShaderMaterial`。
    -   保留旧的 Uniforms 值（避免闪烁）。
    -   替换 Mesh 的材质。
    -   如果编译报错，捕获错误并在编辑器中提示用户。

### 6.3 坐标系同步
特效通常需要跟随某个地理坐标或物体。
-   `VFXManager` 需要处理坐标转换（经纬度 -> Three.js 世界坐标）。
-   在 `update` 循环中，如果特效绑定了动态物体，需要实时同步位置。
