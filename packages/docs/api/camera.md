# 相机导航

相机导航 API 用于读取、恢复和切换场景视角。除 `getView()` 和控制模式查询外，动画方法都可以直接等待完成。

## fitCameraToScene()

调整相机位置和观察点，使当前场景中的所有对象进入视野。

```javascript
meteor3d.fitCameraToScene()
```

场景加载时默认也会自动执行该操作。可以通过 `loadScene()` 的 `config.fitCamera` 关闭：

```javascript
const meteor3d = await loadScene({
  sceneId,
  serverUrl,
  container,
  config: {
    fitCamera: false
  }
})
```

## focusObject()

根据 BID 聚焦指定场景节点，并从节点局部坐标系的指定面观察。

```javascript
await meteor3d.focusObject('bid_xxx', {
  face: 'front',
  duration: 1500,
  padding: 1.2
})
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| bid | string | - | 场景节点的持久化 BID |
| options.face | string | `front` | 观察面 |
| options.duration | number | `1500` | 动画时长，单位毫秒；`0` 表示立即定位 |
| options.padding | number | `1.2` | 留白倍率，值越大相机距离越远 |
| options.onComplete | function | - | 动画完成回调 |

支持的观察面：

| face | 节点局部方向 |
|------|--------------|
| `front` | +Z |
| `back` | -Z |
| `left` | -X |
| `right` | +X |
| `top` | +Y |
| `bottom` | -Y |

观察方向会应用节点的世界旋转。BID 不存在、观察面无效或参数非法时，Promise 会被拒绝。

## getView()

读取当前相机位置和观察点。

```javascript
const view = meteor3d.getView()

// {
//   position: { x, y, z },
//   target: { x, y, z }
// }
```

也可以传入回调：

```javascript
meteor3d.getView((view) => {
  console.log(view.position, view.target)
})
```

## setView()

设置相机位置和观察点，支持平滑动画。

```javascript
await meteor3d.setView({
  position: { x: 100, y: 80, z: 100 },
  target: { x: 0, y: 0, z: 0 },
  duration: 1500,
  onComplete() {
    console.log('相机定位完成')
  }
})
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| options.position | `{x,y,z}` | - | 相机目标位置，必填 |
| options.target | `{x,y,z}` | 当前观察点 | 目标观察点 |
| options.duration | number | `1500` | 动画时长，单位毫秒；`0` 表示立即定位 |
| options.onComplete | function | - | 动画完成回调 |

保存和恢复视角：

```javascript
const savedView = meteor3d.getView()

await meteor3d.setView({
  ...savedView,
  duration: 1000
})
```

## setControlMode()

切换用户交互使用的相机控制模式。

```javascript
meteor3d.setControlMode('orbit')

meteor3d.setControlMode('ghost', {
  pointerLock: true
})
```

| 参数 | 类型 | 说明 |
|------|------|------|
| mode | `'orbit' \| 'ghost'` | 轨道控制或幽灵/第一人称控制 |
| options.pointerLock | boolean | Ghost 模式是否锁定鼠标 |

返回 `boolean`，表示是否成功切换到指定模式。

## getControlMode()

返回当前相机控制模式：

```javascript
const mode = meteor3d.getControlMode()
// 'orbit' | 'ghost' | null
```
