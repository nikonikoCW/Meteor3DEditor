# 相机导航

相机导航 API 用于读取、恢复和切换场景视角。除 `getView()` 和控制模式查询外，动画方法都可以直接等待完成。

## followObject(bid, options) / stopFollowing()

持续跟随场景中的模型，可与 `moveTo()` 配合。同步返回是否启用成功，BID 不存在返回 `false` 并保留原跟随；非法参数抛出 `TypeError` 或 `RangeError`，销毁后启用抛出 `Error`。

```javascript
meteor3d.followObject('npc-bid', {
  distance: 8,
  rotation: { pitch: -30, yaw: 0, roll: 0 },
  smoothing: 6
})

meteor3d.moveTo('npc-bid', { x: 10, y: 0, z: 0 }, { x: 0, y: Math.PI / 2, z: 0 }, 1000)

// 需要退出时调用，保留当前视角。
meteor3d.stopFollowing()
```

`distance` 为相机到模型原点（球心）的半径，默认 `5`，必须为正数，单位为世界单位。`rotation` 使用度，允许只填写部分角度，其余默认为 `0`：

| 角度 | 语义 |
| --- | --- |
| `pitch` | 范围 `[-90, 90]`，负值俯视、正值仰视；`-90` 正上方，`90` 正下方 |
| `yaw` | `0` 在模型后方，`90` 在模型右侧，`180` 在模型前方 |
| `roll` | 绕相机局部 +Z 轴旋转画面，不改变相机位置和观察点 |

角度相对于模型世界旋转后的坐标系，模型的俯仰和侧倾也会随动；默认前向为局部 `+Z`。距离忽略模型缩放。球心使用 BID 节点原点的世界位置，不使用包围盒中心或额外偏移；相机始终看向球心。

跟随视角统一由 `distance` 和 `rotation` 定义，不再支持`offset` 和 `targetOffset` 参数；传入旧参数会抛出 `TypeError`。参数非法不会打断已有跟随。

停止角度跟随后会保留相机位置和观察点，并恢复原上方向、取消画面 roll，以便恢复轨道操作。

`smoothing` 控制模型转向时的球面跟随平滑，默认 `6`，单位为秒的倒数；`0` 为直接转向。开启时立即进入指定半径的球面，随后模型平移同步更新球心，转向沿球面插值。每帧保持 `distance` 半径并看向球心，无需定时重复调用。此 API 不负责模型移动、骨骼动画或相机避障。

开启时切换到 orbit 并暂停手动相机操作和自动环绕更新。再次调用替换目标及配置。`stopFollowing()` 恢复 orbit 输入并返回是否停止了已有跟随，重复调用返回 `false`；原有自动环绕设置保留，退出后继续生效，不会恢复此前的 ghost 模式。

成功设置视角、聚焦、适配场景、切换控制模式或开启自动环绕会退出跟随；移除目标或其父节点、清空场景及销毁实例也会清理跟随状态。跟随属于运行时状态，不写入场景存档，恢复场景后可通过原 BID 重新开启。不改变既有 API 签名。

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
