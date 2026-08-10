# GLTF 动画控制系统架构设计

本文档定义 Meteor3D 中 GLTF 动画从资产加载、运行时控制、编辑器交互到后续持久化和 SDK 开放的整体架构。

## 1. 目标

- GLTF/GLB 包含动画时，模型进入场景后可在动画面板中发现动画片段。
- 支持选择动画、播放/暂停和调整播放速度。
- 动画运行逻辑由 Core 统一管理，UI 不直接持有 `AnimationMixer`。
- 支持选中 GLTF 内部节点时定位到所属动画根对象。
- 对象删除、场景清空和运行时销毁时完整释放动画资源。
- 后续可将动画配置保存到 SceneObject，并通过 SDK 对外开放。

## 2. 当前问题

`GLTFLoader` 将动画放在 `gltf.animations`，而不是自动放入 `gltf.scene.animations`。当前 `PersistenceManager.loadGLTFModel()` 只缓存和克隆 `gltf.scene`，导致导入场景后的模型 `animations` 为空。

当前动画面板也只读取对象属性并维护本地状态，没有真正的运行时控制能力。

## 3. 分层架构

```text
GLTFLoader
  -> gltf.scene + gltf.animations
  -> PersistenceManager 将 clips 挂到模型根节点
  -> SceneManager.addObject()
  -> AnimationManager 注册模型动画
  -> SceneManager.animate(delta) 推进 Mixer

AnimationPanel
  -> SceneManager 动画门面 API
  -> AnimationManager
  -> THREE.AnimationMixer / AnimationAction
```

### 3.1 PersistenceManager

职责：

- 保留 `gltf.animations`。
- 继续负责模型模板缓存和 `SkeletonUtils.clone()`。
- 不创建 Mixer，不负责播放状态。
- 后续在序列化和恢复阶段读写动画配置。

### 3.2 AnimationManager

新增 `packages/core/src/AnimationManager.js`，负责：

- 按模型根 BID 注册动画控制器。
- 延迟创建 `AnimationMixer` 和 `AnimationAction`。
- 枚举 AnimationClip。
- 切换片段、播放/暂停、设置速度。
- 每帧更新已启用的 Mixer。
- 删除对象或销毁运行时时释放 Mixer 缓存。

运行时结构：

```javascript
Map<rootBid, {
  root,
  clips,
  mixer,
  action,
  state: {
    enabled,
    playing,
    clipIndex,
    clipName,
    speed,
    loop
  }
}>
```

`AnimationMixer` 和 `AnimationAction` 只存在于 Manager 内，不进入 Pinia、`userData` 或数据库。

### 3.3 SceneManager

职责：

- 在 `addObject()` 时注册动画模型。
- 在 `removeObject()`、`clearScene()` 和 `dispose()` 时注销动画。
- 在 `animate(delta)` 中调用 `animationManager.update(delta)`。
- 提供基于 BID 的稳定门面 API。
- 将内部节点 BID 解析到所属 GLTF 动画根节点。

### 3.4 AnimationPanel

职责：

- 根据当前选中对象 BID 查询动画列表和状态。
- 将下拉框、速度条和开关操作转发给 SceneManager。
- 展示无选中对象、无动画和不可用状态。
- 不创建 Mixer、不参与每帧更新、不直接修改 AnimationAction。

## 4. Core API

第一阶段 SceneManager 提供：

```javascript
getAnimations(bid)
getAnimationState(bid)
setAnimationClip(bid, { index, name })
setAnimationSpeed(bid, speed)
setAnimationEnabled(bid, enabled)
setAnimationPlaying(bid, playing)
```

动画描述结构：

```javascript
{
  index: 0,
  name: 'Walk',
  label: 'Walk',
  duration: 2.35
}
```

状态结构：

```javascript
{
  rootBid: 'bid_xxx',
  enabled: false,
  playing: false,
  clipIndex: 0,
  clipName: 'Walk',
  speed: 1,
  loop: 'repeat'
}
```

片段定位同时保存名称和索引：优先按名称恢复，名称为空、重复或不存在时回退到索引。

## 5. 播放语义

- 开启：创建或复用 Action，定位到动画第一帧，但保持暂停状态。
- 关闭：停止 Action，清除动画对骨骼和节点变换的影响，恢复模型初始姿势。
- 播放：仅在动画已开启时生效，从当前时间继续推进。
- 暂停：停止时间推进并保持当前姿势，不重置播放时间。
- 切换动画：停止旧 Action，新动画从头开始；如果正在播放则继续播放，否则停在新动画第一帧。
- 调速：第一阶段限制为 `0.1～3.0`。
- 循环：第一阶段固定使用 `THREE.LoopRepeat`。

## 6. 对象身份

- 所有公共控制接口使用 BID，不使用 Three.js UUID。
- 动画控制器以 GLTF 根对象 BID 为键。
- 用户选中内部 Mesh 时，Core 从当前节点向父级查找带动画的 GLTF 根对象。
- `AnimationClip` 不生成 BID，也不作为场景节点保存。

## 7. 生命周期

注册：

```text
SceneManager.addObject()
  -> AnimationManager.registerObject(root)
```

注销：

```text
SceneManager.removeObject()/clearScene()
  -> action.stop()
  -> mixer.stopAllAction()
  -> mixer.uncacheRoot(root)
  -> controllers.delete(rootBid)
```

`removeObject()` 用于可撤销操作。注销时将纯配置暂存在 `root.userData.animationConfig`，重新添加时可恢复当前会话状态，但第一阶段不将它保存到数据库。

## 8. 持久化设计（第二阶段，已实现）

动画配置属于具体 SceneObject，不属于 Asset。GLTF SceneObject 已增加：

```javascript
animation: {
  enabled: true,
  playing: true,
  clipIndex: 0,
  clipName: 'Walk',
  speed: 1,
  loop: 'repeat'
}
```

不保存 AnimationClip、Mixer、Action 和默认播放时间。场景恢复时从 GLB 重新获得 Clip，并从动画起点播放。

第二阶段已同步修改：

- `PersistenceManager.serializeObject()`。
- `PersistenceManager.deserializeObject()` 或统一恢复流程。
- 后端 SceneObject Mongoose Schema。
- `loadScene()` 返回的 `Meteor3DInstance` 动画门面。
- SDK 文档和 API 基线。

## 9. 事件设计（已实现）

已增加 `animation-state-changed`：

```javascript
{
  rootBid,
  state: {
    enabled,
    playing,
    clipIndex,
    clipName,
    speed,
    loop
  }
}
```

不应每帧发送播放进度事件。时间轴功能需要时再增加节流事件。

## 10. 实施阶段

### 第一阶段：编辑器运行时控制

- [x] 设计整体架构。
- [x] `loadGLTFModel()` 保留动画片段，并显式复制到每个克隆实例。
- [x] 新增 AnimationManager。
- [x] 接入 SceneManager 生命周期和门面 API。
- [x] 动画面板接入 Core API。
- [x] 自动化验证动画轨道、骨骼节点、多实例、暂停/调速/切换、撤销重注册和释放行为。

第一阶段最初只实现运行时控制；持久化和 `Meteor3DInstance` 已在第二阶段补齐。

### 第二阶段：持久化和 SDK

- [x] SceneObject 保存动画配置。
- [x] 场景恢复动画配置。
- [x] 后端 Schema 支持动画字段。
- [x] `Meteor3DInstance` 暴露动画接口。
- [x] SDK 文档和 API 基线更新。
- [ ] App Editor 和 AI Scene 接入（本次按要求排除）。

### 第三阶段：高级动画能力

- [ ] LoopOnce、LoopRepeat、LoopPingPong。
- [ ] CrossFade 和多 Action 混合。
- [ ] 时间轴、进度和跳转。
- [ ] 动画完成事件。
- [ ] Morph Target 动画编辑。

## 11. 验收标准

- 有动画的 GLB 拖入后，下拉框能列出全部 Clip。
- 选中模型根节点或内部节点都能控制同一动画根对象。
- 开启/关闭开关可以启用动画并在关闭时恢复模型初始姿势。
- 播放/暂停开关可以保持当前姿势并从当前位置继续播放。
- 速度条可以实时调整速度。
- 切换 Clip 不残留旧 Action。
- 同一资产的多个场景实例互不影响。
- 删除并撤销对象后不会残留 Mixer，且当前会话配置可恢复。
- 清空场景或销毁 SceneManager 后无 Mixer 和 Action 残留。
- 无动画模型的面板保持禁用并显示空状态。

