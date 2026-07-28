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

获取到的对象属于 SDK 内部正在渲染的场景。直接修改对象不会自动写回后端场景数据，业务交互优先使用 SDK 已提供的显隐、描边、高亮和聚焦 API。

相关接口：

- [`focusObject()`](/api/camera#focusobject)
- [`setObjectVisible()`](/api/visibility#setobjectvisible)
- [`enableOutline()`](/api/outline#enableoutline)
- [`enableHighlight()`](/api/highlight#enablehighlight)
