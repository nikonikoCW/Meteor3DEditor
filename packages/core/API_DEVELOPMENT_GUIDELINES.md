# @meteor3d/core API 开发规范

> 本规范面向 `@meteor3d/core` 的开发者和 AI 编程助手，用于约束新增、修改、废弃和验证 SDK API 的方式。
>
> 规范以当前源码为基础。判断真实行为时，优先级依次为：源码与构建结果、根目录 `PROJECT.md`、本文档、其他说明或 `plan/` 文档。

## 1. 目标与适用范围

本规范适用于以下改动：

- 修改 `loadScene()` 的参数、加载流程或返回结果。
- 为 `Meteor3DInstance` 新增或修改公开方法、属性和事件。
- 为 `SceneManager` 或各专用 Manager 增加可被上层消费的能力。
- 修改 `index.js` 的包级导出。
- 修改场景对象身份、持久化协议、GIS 坐标或资源生命周期。

规范的目标是让 SDK API：

- 具有清晰且稳定的公开边界。
- 能同时被场景编辑器、应用编辑器、AI 场景助手和第三方页面安全使用。
- 不泄漏不必要的内部实现。
- 可以正确销毁，不产生动画帧、监听器、DOM、GPU 或加载任务泄漏。
- 在场景保存与恢复后仍能通过 BID 保持业务绑定。

## 2. API 分层与稳定性

Core API 分为三个层级。

### 2.1 一级：`Meteor3DInstance` 公开 API

`loadScene()` 返回的实例是第三方集成的首选入口。公开方法统一在 `src/loadScene.js` 的 `createMeteor3DInstance()` 中声明。

```javascript
const instance = await loadScene(options);
instance.focusObject(bid);
instance.setRain(true, config);
instance.dispose();
```

一级 API 属于稳定契约。新增场景运行时能力时，默认应通过这一层提供，而不是要求调用者访问内部 Manager。

### 2.2 二级：包级导出

`index.js` 当前直接导出 `SceneManager`、`PersistenceManager`、`DBManager`、`BidRegistry` 等类。这些接口用于编辑器集成或高级定制，稳定性要求低于 `Meteor3DInstance`，但仍属于可被外部导入的 API。

新增包级导出必须满足以下至少一项：

- 调用者确实需要独立创建该模块。
- 该模块不依赖编辑器 Store、DOM 全局变量或未公开的运行时状态。
- 仅通过 `Meteor3DInstance` 无法合理完成目标。

不要因为“文件已经存在”就将类或工具加入 `index.js`。

### 2.3 三级：内部实现

以下内容默认不是稳定 API：

- `instance._internal`。
- `sceneManager` 上未通过实例门面暴露的方法。
- `labelManager`、`lineManager`、`vfxManager` 等专用 Manager 的内部状态。
- 以下划线开头的字段或方法。
- 仅服务于编辑器的 Store、`window.editor` 和 DOM 自定义事件。

新功能不得要求普通调用者使用 `_internal`。如果上层存在合理需求，应补充正式 API。

## 3. 新增 API 的标准实现路径

新增 API 必须按以下顺序设计和实现：

1. 明确能力属于哪个模块，例如相机、标签、天气、VFX、GIS 或持久化。
2. 在对应的专用 Manager 中实现具体逻辑和资源管理。
3. 如该能力属于通用场景运行时，在 `SceneManager` 中增加薄门面。
4. 如该能力需要提供给 SDK 使用者，在 `createMeteor3DInstance()` 中显式暴露。
5. 只有确有独立实例化需求时，才修改 `index.js` 增加包级导出。
6. 补充完整 JSDoc、调用示例和兼容性说明。
7. 验证 Core 构建，并检查三个主要消费者：`scene-editor`、`app-editor`、`ai-scene`。

推荐调用链：

```text
Meteor3DInstance
  -> SceneManager 公共门面
  -> 专用 Manager
  -> Three.js / 浏览器资源
```

不推荐：

```text
业务页面
  -> instance._internal
  -> 修改 scene/camera/renderer 或 Manager 内部字段
```

## 4. API 命名规范

方法使用 `camelCase`，类使用 `PascalCase`，事件使用 `kebab-case`。

| 前缀 | 语义 | 要求 |
|---|---|---|
| `getXxx` | 获取当前值 | 不产生业务副作用；找不到时按契约返回 `null` |
| `isXxx` | 获取布尔状态 | 返回 `boolean`；若“对象不存在”是有效情况，可明确返回 `boolean|null` |
| `setXxx` | 设置确定状态 | 应尽量幂等；相同参数重复调用结果一致 |
| `enableXxx` | 启用能力 | 返回是否成功，或在异步初始化时返回 `Promise` |
| `disableXxx` | 禁用能力 | 应允许重复调用并安全清理 |
| `toggleXxx` | 按显式布尔参数切换 | 新 API 不应依赖隐式反转状态 |
| `createXxx` | 创建资源 | 返回稳定 ID、公开句柄或明确类型的实例 |
| `removeXxx` | 删除单个资源 | 通过稳定 ID 定位，返回是否找到并删除 |
| `clearXxx` | 清空某类资源 | 应幂等，不因集合为空而报错 |
| `updateXxx` | 更新已有配置 | 说明是合并还是整体替换 |
| `on` / `off` | 订阅和取消事件 | 使用同一个回调引用取消订阅 |
| `dispose` | 释放实例 | 必须幂等，调用后不得继续产生渲染和事件 |

避免含糊名称，例如 `handleData()`、`doEffect()`、`process()`。名称必须说明被操作的领域对象。

## 5. 参数设计规范

### 5.1 使用配置对象

除简单且稳定的 1～2 个参数外，新 API 应使用 `options` 或 `config` 对象，避免后续扩展破坏位置参数。

```javascript
// 推荐
instance.focusObject(bid, {
    face: 'front',
    duration: 1500,
    padding: 1.2
});

// 不推荐
instance.focusObject(bid, 'front', 1500, 1.2, callback);
```

### 5.2 默认值与单位

每个可选参数必须在 JSDoc 中写明默认值。数值必须写明单位，例如：

- 动画时长：毫秒。
- 世界坐标与 GIS 高度：米。
- 角度：明确使用弧度或度。
- 颜色：明确使用十六进制数字、CSS 字符串或 `THREE.Color`。
- 屏幕坐标：明确是像素、NDC `[-1, 1]` 还是容器局部坐标。

### 5.3 输入校验

- 缺少必需参数或类型明显错误时，抛出 `TypeError`。
- 数值范围非法时，抛出 `RangeError`，或在文档明确允许钳制后统一钳制。
- 不得静默把无法识别的枚举值替换为默认值。
- 不要修改调用者传入的对象；需要保存时应复制必要字段。
- 浏览器、WebGL 或扩展能力不支持时，错误信息必须包含缺失的能力名称。

### 5.4 优先使用可序列化数据

公开配置和事件载荷应优先使用普通对象、数组、字符串、数字和布尔值。只有明确属于 Three.js 高级接口时，才直接暴露 `THREE.Object3D`、`Vector3` 或 `Intersection`。

## 6. BID 与对象身份规范

BID 是持久化业务节点 ID，Three.js UUID 只是单次运行时标识。

所有跨保存、恢复、资产版本和应用绑定的 API 必须遵守：

- 公共对象定位参数使用 `bid`，不得使用 UUID 作为业务主键。
- 新建或导入持久化对象时必须生成或恢复 `userData.bid`。
- 加入场景时必须注册到 `BidRegistry`。
- 删除对象、清空场景和销毁实例时必须解除注册。
- 克隆对象时不得复制出冲突 BID；应按业务语义生成新 BID 或恢复已声明的 BID。
- 重复 BID 必须立即报错，不得静默覆盖注册表。
- 返回对象列表时，应优先返回 BID；UUID 只能作为调试信息。

查找对象应使用：

```javascript
sceneManager.findObjectByBid(bid);
instance.getObjectByBid(bid);
```

不得为新业务增加基于 UUID 的查找接口。

## 7. 返回值与错误处理

同一类 API 必须使用一致语义。

### 7.1 推荐返回约定

| 场景 | 返回值 |
|---|---|
| 查询成功 | 查询值或只读结果对象 |
| 查询目标不存在 | `null` |
| 命令执行成功 | `true` |
| 命令目标不存在或未执行 | `false` |
| 创建资源成功 | 稳定 ID 或公开句柄 |
| 清空、禁用、销毁 | 可返回 `void`，但必须幂等 |
| 异步加载或动画 | `Promise<结果>` |
| 批量加载 | 带成功、失败和详情的结果报告 |

不要在相同方法中混用 `undefined`、`null` 和 `false` 表达同一种情况。

### 7.2 必须抛错的情况

- 参数格式错误。
- 实例已经销毁，且操作无法安全执行。
- 网络请求失败或服务端明确返回失败。
- 关键资源加载失败。
- BID 冲突。
- 持久化数据不完整，继续保存可能破坏数据。

错误信息应包含动作和目标，例如：

```javascript
throw new Error(`Failed to focus object: BID not found (${bid})`);
```

不得仅记录 `console.error()` 后伪装成功。可恢复的批量错误应写入结构化结果，不得吞掉失败原因。

## 8. 异步行为与就绪状态

- 网络请求、资源加载、场景恢复和动画完成应返回 `Promise`。
- `loadScene()` 解析成功不等于场景完全有效；调用者应检查 `instance.isReady` 和 `instance.loadResult`。
- 关键资源未恢复时不得把 `isReady` 设置为 `true`。
- 并发调用需要定义覆盖、排队或取消策略，不得由竞态随机决定最终状态。
- 销毁后，未完成加载任务应取消或忽略结果，不能重新向场景写入资源。
- 进度回调使用结构化对象，至少包含 `loaded`、`total` 和当前目标标识。

## 9. 事件规范

公开事件通过 `instance.on()` 和 `instance.off()` 提供，不应要求第三方监听页面全局事件。

新增事件必须遵守：

- 事件名使用 `kebab-case`，例如 `scene-ready`、`scene-click`、`control-mode-changed`。
- 事件载荷始终为对象，即使当前只有一个字段。
- 载荷字段命名和类型一经公开，应视为兼容性契约。
- 事件应描述已经发生的事实，不使用含糊的 `change`、`update`。
- 高频事件必须考虑节流，不得在每帧分配大量临时对象。
- 销毁时清除全部订阅，Manager 不得继续发送事件。
- 回调中的单个异常不应阻止其他订阅者执行；如调整现有事件分发机制，需补充隔离处理。

新增事件时必须在 JSDoc 中记录事件名、触发时机和完整载荷。

## 10. SceneManager 与专用 Manager 的职责

`SceneManager` 是运行时中枢，但不应持续堆积所有具体实现。

- 场景、相机、渲染循环、对象注册和跨模块协调由 `SceneManager` 负责。
- 标签、描边、高亮、天气、VFX、流动线和统计逻辑放入各自 Manager。
- `SceneManager` 对外提供稳定薄门面，负责对象查找、参数转换和错误语义统一。
- 专用 Manager 不应直接依赖 Vue、Pinia、编辑器组件或 `window.editor`。
- Manager 需要外部能力时通过构造参数注入，不读取隐式全局状态。
- 循环依赖应通过职责拆分或回调注入解决，不通过全局变量绕过。

## 11. 持久化与场景恢复规范

- `PersistenceManager.restoreScene(sceneData, options)` 是编辑器和 SDK 共用的唯一场景恢复流程。
- `loadScene(sceneId)` 只负责取数和调用统一恢复流程，不得复制另一套反序列化逻辑。
- 当前场景以整场批量方式保存，不得假定单对象 API 已完整实现。
- `Asset` 表示可复用资源；`SceneObject` 表示资源在场景中的实例，两者不可混用。
- 改变序列化字段时，必须同时更新保存、恢复、后端模型和已有数据兼容逻辑。
- 新字段应具有向后兼容默认值；读取旧数据时不得因字段缺失直接失败，除非该字段确属关键身份数据。
- 资源 URL 必须兼容绝对 URL、`/uploads` 相对地址和云存储 URL。
- 3D Tiles 应保留地理参考变换，不套用普通 GLB 的居中逻辑。
- Gaussian Splat 的变换与释放应遵守其加载器能力，不假设与普通 Mesh 完全一致。

涉及持久化协议的改动，必须同时检查：

```text
Core 序列化
  <-> Core 恢复
  <-> meteor3d-server 模型与控制器
  <-> scene-editor
  <-> app-editor
  <-> ai-scene
```

## 12. GIS API 规范

- 对外地理坐标使用 WGS84，经纬度字段使用 `lng`、`lat`、`height`。
- Three.js 局部世界坐标约定为 X 向东、Y 向上、负 Z 向北。
- GIS 未配置时，坐标转换查询返回 `null`，不能伪造零坐标。
- API 必须明确输入输出是经纬度、Web Mercator、ECEF 还是局部世界坐标。
- 浮动原点、场景中心或坐标轴约定变化属于破坏性协议变更，不能作为内部重构直接发布。

## 13. 资源与生命周期规范

创建下列任意资源的模块都必须实现对应清理：

- `requestAnimationFrame`。
- `ResizeObserver`、DOM 事件、窗口事件和自定义事件。
- Three.js Geometry、Material、Texture、RenderTarget 和后处理 Pass。
- Worker、定时器、网络请求和加载器回调。
- BVH、3D Tiles、Gaussian Splat、CSS 标签 DOM 和特效资源。
- Manager 内部 Map、Set、缓存及事件订阅。

要求：

- 每个长期存活的 Manager 提供 `dispose()`。
- `dispose()` 必须可以重复调用。
- 父对象销毁时负责调用子 Manager 的 `dispose()`。
- 移除单个资源时立即释放该资源，不等到整个场景销毁。
- 销毁后不再触发事件、不再提交渲染、不再修改 DOM。
- SDK 自动创建的 DOM 由 SDK 删除；调用者传入的容器或 Canvas 不得擅自删除。

## 14. 安全规范

- 标签 HTML、AI 输出和外部文本在渲染前必须按信任边界进行清洗。
- 不在 Core 内执行不可信 JavaScript，不引入 `eval` 或 `new Function`。
- URL 参数应限制为预期协议；不得把密钥或认证信息写入日志。
- 错误对象和事件载荷不得包含服务端密钥、完整认证头或用户敏感数据。
- 新增网络 API 时需考虑跨域、认证、超时、取消和非 2xx 响应。

## 15. JSDoc 与文档要求

每个公开方法、属性和事件必须包含：

- 一句话说明用途。
- 每个参数的类型、语义、单位和默认值。
- 返回类型与“目标不存在”等边界情况。
- 是否异步、是否可取消、何时完成。
- 可能抛出的关键错误。
- 至少一个最小调用示例，复杂 API 还应提供完整配置示例。

推荐模板：

```javascript
/**
 * 设置对象的可见状态。
 * @param {string} bid - 持久化业务节点 BID。
 * @param {boolean} visible - 是否可见。
 * @returns {boolean} 找到并更新对象时返回 true，否则返回 false。
 * @throws {TypeError} bid 为空或 visible 不是布尔值时抛出。
 */
setObjectVisible(bid, visible) {
    // ...
}
```

注释必须描述实际行为，不能只重复方法名。修改行为时必须同步更新注释和示例。

## 16. 兼容性、废弃与版本管理

以下改动属于破坏性变更：

- 删除或重命名公开方法、属性、事件或包级导出。
- 改变参数含义、默认值、单位或坐标系。
- 改变同步/异步性质。
- 改变返回值类型、错误语义或事件载荷字段。
- 改变 BID、持久化字段或场景恢复规则。

破坏性变更必须走主版本升级，或先提供废弃周期：

1. 保留旧 API，并添加 `@deprecated` 和替代方式。
2. 内部将旧 API 转发到新实现，避免两套行为分叉。
3. 更新全部仓库内消费者。
4. 在约定版本中移除旧 API。

不要直接更改现有默认值来实现新的产品行为；应增加显式配置或发布破坏性版本。

## 17. 当前一级 API 基线

以下为 `Meteor3DInstance` 当前公开能力。新增或删除成员时应同步更新本节。

### 状态与事件

```text
isReady, loadResult
on, off, getObjectByBid
```

### 性能与统计

```text
enableStats, disableStats, toggleStats, isStatsEnabled
toggleTriangleStats, getTriangleStats, isTriangleStatsEnabled
```

### 相机与尺寸

```text
fitCameraToScene, focusObject, resize
getView, setView, setControlMode, getControlMode
```

### 射线与 GIS

```text
raycastObjects, raycastGround
lngLatToWorld, worldToLngLat
```

### 辅助显示与标签

```text
setGridHelper, setAxesHelper
createLabel, getLabels, clearLabels
```

### 对象、描边与高亮

```text
setObjectVisible, showObject, hideObject, isObjectVisible
enableOutline, disableOutline, getOutlinedObjects
enableHighlight, disableHighlight, getHighlightedObjects
```

### 模型动画

```text
getAnimations, getAnimationState
setAnimationClip, setAnimationSpeed
setAnimationEnabled, setAnimationPlaying
```

### 天气、特效与流动线

```text
setSnow, updateSnowConfig, getSnowConfig
setRain, updateRainConfig, getRainConfig
createEffect, removeEffect, vfxManager
createLine, removeLine, clearLines
```

### 生命周期与内部兼容入口

```text
dispose
_internal（不稳定，不得作为新功能依赖）
```

## 18. 实现示例

以下示例展示新增 `setFog()` 的推荐结构，仅说明分层方式。

### 18.1 专用 Manager

```javascript
export class FogManager {
    constructor(scene) {
        this.scene = scene;
        this.disposed = false;
    }

    setEnabled(enabled, config = {}) {
        if (this.disposed) throw new Error('FogManager has been disposed');
        if (typeof enabled !== 'boolean') {
            throw new TypeError('enabled must be a boolean');
        }
        // 创建、更新或释放雾效资源。
        return true;
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        // 释放资源并清空引用。
    }
}
```

### 18.2 SceneManager 门面

```javascript
/**
 * 设置雾效。
 * @param {boolean} enabled - 是否启用。
 * @param {Object} [config] - 雾效配置。
 * @returns {boolean} 是否成功应用。
 */
setFog(enabled, config = {}) {
    return this.fogManager.setEnabled(enabled, config);
}
```

### 18.3 SDK 实例门面

```javascript
setFog: (enabled, config) => sceneManager.setFog(enabled, config),
```

不要直接暴露：

```javascript
fogManager: sceneManager.fogManager
```

除非调用者确实需要独立的高级控制面，并且该 Manager 已被设计为稳定公共 API。

## 19. 验证与交付清单

每次新增或修改公开 API，开发者或 AI 必须逐项确认：

- [ ] 能力放在正确的 Manager 中，`SceneManager` 只承担门面与协调职责。
- [ ] 需要第三方使用的能力已在 `Meteor3DInstance` 显式暴露。
- [ ] 没有新增对 `_internal`、`window.editor` 或编辑器 Store 的依赖。
- [ ] 公共对象定位使用 BID，不使用 UUID。
- [ ] 参数、默认值、单位、返回值和异常具有完整 JSDoc。
- [ ] 同步与异步语义明确，没有吞掉失败。
- [ ] 重复启用、禁用、清空和销毁不会产生异常或资源重复。
- [ ] 新建的监听器、动画帧、DOM、GPU 资源和加载任务均可释放。
- [ ] 场景保存后重新加载，API 仍能通过原 BID 找到目标。
- [ ] 旧场景数据缺少新增字段时仍可恢复，或已提供明确迁移方案。
- [ ] 事件名称与载荷已记录，取消订阅有效。
- [ ] Core 构建成功：`pnpm build:core`。
- [ ] 检查 `scene-editor`、`app-editor` 和 `ai-scene` 的兼容性。
- [ ] 若修改数据协议，同步检查后端模型、控制器和 API。
- [ ] 更新本文档的 API 基线以及相关示例或 SDK 文档。

## 20. 给 AI 编程助手的执行要求

处理 Core API 任务时，AI 必须：

1. 先读取根目录 `PROJECT.md`、本文档和相关源码，不以 `plan/` 文档推断功能已经实现。
2. 搜索所有现有调用方后再修改签名或行为。
3. 优先扩展现有 Manager，不重复实现已有场景加载、对象查找或资源释放逻辑。
4. 将 `Meteor3DInstance` 视为首选公开边界，将 `_internal` 视为待消除的兼容入口。
5. 涉及对象身份时审计 BID 的生成、注册、恢复、克隆和释放全链路。
6. 涉及持久化时同时检查序列化、恢复、后端协议和旧数据兼容。
7. 实现后运行可用的构建或测试；若无法运行，应明确说明未验证部分和原因。
8. 不为了让构建通过而删除既有能力、弱化错误处理或绕过类型/参数校验。
9. 交付时说明新增 API、兼容性影响、验证结果和仍存在的限制。

