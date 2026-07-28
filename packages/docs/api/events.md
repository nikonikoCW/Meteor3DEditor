# 事件与状态

## isReady

场景完成加载后为 `true`：

```javascript
const ready = meteor3d.isReady
```

## on()

订阅 SDK 事件。

```javascript
meteor3d.on(event, callback)
```

实际可用事件：

| 事件 | 数据 | 说明 |
|------|------|------|
| `scene-ready` | `{ isReady: true }` | SceneManager 被标记为就绪 |
| `scene-click` | 点击和射线检测结果 | Canvas 左键点击 |
| `control-mode-changed` | `{ mode, previous }` | 相机控制模式发生变化 |

```javascript
const handleSceneClick = (event) => {
  console.log(event.object)
  console.log(event.worldPosition)
}

meteor3d.on('scene-click', handleSceneClick)
```

`scene-click` 的完整字段参见 [射线检测](/api/raycast#scene-click-事件)。

## off()

取消订阅事件。必须传入订阅时使用的同一个回调函数。

```javascript
meteor3d.off('scene-click', handleSceneClick)
```
