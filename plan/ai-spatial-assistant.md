# Spatial AI (空间智能助手) 接入计划方案

## 1. 方案可行性评估

基于 `Meteor3D` 工程现有的 `@meteor3d/core` 核心渲染库的模块化与面向状态设计，该构思**非常可行，且极具前瞻性**。
平台现有的架构天然契合大语言模型（LLM）的 **Function Calling（函数调用）** 模式。大模型生成的场景控制指令可以直接映射到底层 API，如 `HighlightManager`、`SceneManager` 的各类控制方法和 `GisProjection` 等。这为构建具有三维空间理解与操控能力的 “智能体 (Agentic 3D)” 提供了绝佳的基础。

---

## 2. 核心对接架构思路

系统的核心链路为： **自然语言解析 ➡️ 意图提取与指令生成 (Function Calling) ➡️ 前端中枢拦截分发 ➡️ Core 引擎渲染执行**。

### 阶段一：搭建存粹的“大屏预览页” (Preview View)
目标是在 `packages/scene-editor` 中提供一个干净的 3D 渲染与对话基座。
1. **新建路由**：在 Vue 中新建一个 `PreviewView.vue` 页面。
2. **精简 UI**：隐藏掉原有的 `Toolbar`、`SceneTree`、`PropertiesPanel` 等用于构建场景的侧边栏。
3. **引入核心视图**：仅仅挂载核心的 `Viewport.vue`（或直接使用 `@meteor3d/core` 的 `loadScene` 方法进行独立初始化）。
4. **添加对话窗**：在页面前端（如右下角）悬浮一个基于 WebSocket 或 HTTP 的 AI Agent 对话窗体验模块。

### 阶段二：打通指令链路 (AI Bridge / Function Calling)
打通自然语言到业务逻辑调用的关键层。
1. **定义场景操作工具箱 (Tools List)**：将系统能够执行的三维方法声明封装为 JSON Schema 并提交给大语言模型（如 ChatGPT / Claude / DeepSeek）。例如：
   ```json
   {
      "name": "focusObject",
      "description": "移动相机聚焦到场景中的某个特定物体",
      "parameters": {
          "type": "object",
          "properties": {
              "objectName": { "type": "string", "description": "目标物体的名字，如 '楼栋A'" }
          },
          "required": ["objectName"]
      }
   }
   ```
2. **场景上下文注入**：当用户在输入框发起自然语言对话时，除了文字本身，后台还可以悄悄携带当前场景结构特征（如场景中拥有的关键模型名称、树形拓扑结构清单等），以此提升 LLM 生成正确调用参数的准确率。
3. **前端执行调用栈**：前端解析大模型接口返回的指令标识（如 `call_function: focusObject(楼宇)`），截获后映射调用 Three.js 控制器 `sceneManager.cameraControl.flyTo(object)` 并辅以 Tween.js 相机平滑过渡补间动画。

### 阶段三：高级场景动作的逻辑落地
针对构想中的复杂操作，可进行如下落地拆解：

- **聚焦/高亮某个物体**
  - **链路：** 模型理解意图 ➡️ 下发高亮及聚焦指令 ➡️ 前端遍历场景树通过名字获取 Mesh 节点 ➡️ 投入 `HighlightManager.addHighlight()` 添加高亮红边 ➡️ 根据该 Mesh 的 BoundingBox 计算目标视点并移动 Camera。

- **炸开楼房并聚焦到某一间**
  - **前提：** 构建模型时需要保留完善的零部件父子节点层级（如建筑为父，各楼层/房间为子级）。
  - **链路：** LLM 下发 `explode('写字楼')` 展开函数指令 ➡️ 前端引擎截取节点下的全体子网格对象 ➡️ 利用 Tween.js 为各组件赋予向外的放射状位移向量（形成剖面/爆炸展开动画） ➡️ 根据房间号重新计算局部相机视锥体并向前推进。

- **接入实时轨迹数据**
  - **链路：** 借助 LLM 担任配置员的职能。用户说“把张三的定位数据接进来” ➡️ LLM 生成下发“建立 WebSocket 连接监听特定实体”的指令 ➡️ 前端建立数据推流连接，接收含有经纬度的数据帧 ➡️ 利用现有的 `GisProjection` 将经纬度解算为 Three.js 局部空间坐标系下的世界坐标 ➡️ 在渲染帧循环中，通过 `Tween` 更新指定标签或 3D 小车的 `position` 与旋转方向信息。

---

## 3. 落地建议与实施路径

建议采用敏捷迭代、小步快跑的方式验证这套方案：

- **Step 1 (MVP验证)**：不涉及复杂的界面，就在现有的 `TestView.vue` 内或者新建最基础的 `PreviewView.vue` 页面。硬编码接入一个大模型 API（如 DeepSeek、Kimi 或者通义千问等的接口），做一个纯粹的前端直连测试。
- **Step 2 (单个意图打通)**：选取最简单的场景意图调通全链路。例如指令：“帮我切换为夜晚的 HDR”，让大模型返回 `setEnvironment('night')` JSON，前端收到 JSON 载入指定的贴图。
- **Step 3 (体系化演进)**：完善大模型与服务端对话的鉴权管理、历史记录以及复杂多级参数下发，在前端构筑标准化的 Dispatcher 路由处理器专门处理从 AI 下发到 Three.js 引擎层的所有功能指令分发。
