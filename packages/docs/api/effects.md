# VFX 特效

VFX API 用于创建和移除 SDK 注册的三维视觉特效。当前注册的类型为 `shield` 和 `scan`。

## createEffect()

创建特效并挂载到当前场景。

```javascript
const effect = meteor3d.createEffect('shield', {
  position: { x: 0, y: 2, z: 0 },
  scale: 5,
  color: '#00aaff',
  rimColor: '#00ffff'
})
```

| 参数 | 类型 | 说明 |
|------|------|------|
| type | `'shield' \| 'scan'` | 特效类型 |
| config | object | 对应特效的配置 |

通用配置：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| position | `{x,y,z}` | `{0,0,0}` | 世界坐标位置 |
| scale | number | `1` | 缩放 |
| color | string | 取决于特效 | 主颜色 |

`shield` 额外支持 `rimColor`；`scan` 额外支持 `repeat`。

返回特效实例；类型未注册时返回 `null`。实例包含由 SDK 生成的 `id`，并支持通过 `setParams()` 更新参数：

```javascript
effect?.setParams({
  position: { x: 10, y: 2, z: 5 },
  scale: 8,
  color: '#ff6600'
})
```

## removeEffect()

根据特效 ID 移除特效并释放其几何体和材质资源。

```javascript
if (effect) {
  meteor3d.removeEffect(effect.id)
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | `createEffect()` 返回实例的 ID |
