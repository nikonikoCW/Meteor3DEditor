# 对象查询

Meteor3D 使用 BID 作为场景节点的持久化业务标识。与 Three.js 运行时 UUID 不同，BID 会随场景数据保存和恢复。

## getObjectByBid()

根据 BID 获取对应的 Three.js 场景节点。

```javascript
const object = meteor3d.getObjectByBid('bid_xxx')

if (object) {
  console.log(object.name)
  console.log(object.position)
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| bid | string | 场景节点的持久化 BID |

返回值：

```text
THREE.Object3D | null
```

BID 不存在时返回 `null`。

## moveTo()

签名：`moveTo(bid, position, rotation, duration = 0, options = {})`。

第五个参数可选，`options.easing` 支持：

- `'quadraticOut'`（默认）：保留原来的先快后慢效果。
- `'linear'`：每段内部线性推进位置和旋转，适合连续漫游。

```javascript
meteor3d.moveTo(bid, position, rotation, 1000, { easing: 'linear' })
```

旧的四参数调用保持不变。不支持的缓动值抛出 `RangeError`，配置不是对象时抛出 `TypeError`，且不会打断已有动画。线性缓动不消除定时器调度误差；各段距离不同但时长相同时，段与段之间仍会变速。

根据 BID 将节点移动并旋转到目标局部变换：

```javascript
const success = meteor3d.moveTo(
  'bid_xxx',
  { x: 10, y: 2, z: -5 },
  { x: 0, y: Math.PI / 2, z: 0 },
  1000
)
```

`position` 和 `rotation` 都是相对于父节点的局部变换；`rotation` 为 Three.js 欧拉角，单位是弧度，并保留节点现有的旋转顺序。`duration` 的单位是毫秒，默认值为 `0`；传入 `0` 时立即完成，大于 `0` 时使用 Tween.js 平滑过渡。

同一 BID 在动画尚未完成时再次调用 `moveTo()`，上一段动画会停止并从当前状态开始新动画。旋转使用四元数球面插值，以最短路径平滑旋转。

所有 `x`、`y`、`z` 都必须是有限数字；`duration` 必须是大于或等于 `0` 的有限数字。参数非法时抛出 `TypeError` 或 `RangeError`；BID 不存在时返回 `false`，成功启动或完成时返回 `true`。该接口只改变当前运行时场景，不会自动写回后端场景数据。

获取到的对象属于 SDK 内部正在渲染的场景。直接修改对象不会自动写回后端场景数据，业务交互优先使用 SDK 已提供的显隐、描边、高亮和聚焦 API。

相关接口：

- [`focusObject()`](/api/camera#focusobject)
- [`moveTo()`](/api/objects#moveto)
- [`setObjectVisible()`](/api/visibility#setobjectvisible)
- [`enableOutline()`](/api/outline#enableoutline)
- [`enableHighlight()`](/api/highlight#enablehighlight)
