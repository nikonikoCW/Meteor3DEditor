# 模型动画

模型动画 API 用于控制 GLTF/GLB 模型自带的 `AnimationClip`。所有方法都接收持久化 BID；传入模型内部节点 BID 时，SDK 会自动定位到所属动画根节点。

## getAnimations()

获取模型可用的动画片段。

```javascript
const clips = meteor3d.getAnimations(modelBid)
```

返回值示例：

```javascript
[
  {
    index: 0,
    name: 'Walk',
    label: 'Walk',
    duration: 2.35
  }
]
```

对象不存在或没有动画时返回空数组。

## getAnimationState()

获取模型当前动画状态。

```javascript
const state = meteor3d.getAnimationState(modelBid)
```

```javascript
{
  rootBid: 'bid_xxx',
  enabled: true,
  playing: false,
  clipIndex: 0,
  clipName: 'Walk',
  speed: 1,
  loop: 'repeat'
}
```

对象不存在或没有动画时返回 `null`。

## setAnimationClip()

按名称或索引选择动画片段。

```javascript
meteor3d.setAnimationClip(modelBid, { name: 'Walk' })
meteor3d.setAnimationClip(modelBid, { index: 0 })
```

同时提供名称和索引时，SDK 会优先验证二者是否对应；名称找不到时回退到有效索引。

## setAnimationSpeed()

设置播放速度，支持范围为 `0.1～3`。

```javascript
meteor3d.setAnimationSpeed(modelBid, 1.5)
```

无效数值会抛出 `TypeError` 或 `RangeError`。

## setAnimationEnabled()

开启或关闭动画功能。

```javascript
meteor3d.setAnimationEnabled(modelBid, true)
```

- 开启后停在所选动画第一帧，等待播放。
- 关闭会停止 Action，并恢复模型初始姿势。
- 关闭时 `playing` 同步变为 `false`。

## setAnimationPlaying()

播放或暂停已经开启的动画。

```javascript
meteor3d.setAnimationPlaying(modelBid, true)  // 播放
meteor3d.setAnimationPlaying(modelBid, false) // 暂停并保持姿势
```

动画未开启时调用会返回 `false`。

## 状态事件

片段、速度、开启状态或播放状态变化后，会触发 `animation-state-changed`：

```javascript
const handleAnimationState = ({ rootBid, state }) => {
  console.log(rootBid, state)
}

meteor3d.on('animation-state-changed', handleAnimationState)
meteor3d.off('animation-state-changed', handleAnimationState)
```

## 场景持久化

动画配置随具体 SceneObject 保存，包括片段、速度、开启状态和播放状态。场景重新加载时从动画起点恢复，不保存退出前的播放时间。
