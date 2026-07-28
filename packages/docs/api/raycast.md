# 射线检测

射线检测 API 用于根据屏幕位置查询场景对象或地面交点。

## raycastObjects()

检测归一化屏幕坐标处命中的场景对象。

```javascript
const intersections = meteor3d.raycastObjects(
  { x: 0, y: 0 },
  {
    recursive: true,
    includeTileMap: true
  }
)
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| screenPosition | `{x,y}` | - | NDC 坐标，X/Y 范围均为 `[-1, 1]` |
| options.recursive | boolean | `true` | 是否递归检测子节点 |
| options.includeTileMap | boolean | `true` | 是否把 GIS 影像底图加入检测 |

返回 `THREE.Intersection[]`，按距离从近到远排序。

将鼠标像素坐标转换为 NDC：

```javascript
function toNdc(event, element) {
  const rect = element.getBoundingClientRect()

  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1
  }
}

canvas.addEventListener('click', (event) => {
  const hits = meteor3d.raycastObjects(toNdc(event, canvas))
  const object = hits[0]?.object ?? null
  console.log(object)
})
```

## raycastGround()

计算射线与世界坐标 `Y = 0` 平面的交点。

```javascript
const point = meteor3d.raycastGround({
  x: 0,
  y: 0
})
```

返回值：

```text
THREE.Vector3 | null
```

射线与地面平面没有交点时返回 `null`。

## scene-click 事件

SDK 已经在 Canvas 左键点击时执行射线检测，可以直接订阅：

```javascript
meteor3d.on('scene-click', (event) => {
  console.log(event.object)
  console.log(event.worldPosition)
  console.log(event.lngLat)
})
```

事件数据：

| 字段 | 类型 | 说明 |
|------|------|------|
| screenPosition | `{x,y}` | 浏览器像素坐标 |
| originalEvent | MouseEvent | 原始鼠标事件 |
| object | `THREE.Object3D \| null` | 命中的对象 |
| point | `THREE.Vector3 \| null` | 精确交点 |
| face | `THREE.Face \| null` | 命中的几何面 |
| worldPosition | `{x,y,z} \| null` | 世界坐标 |
| lngLat | `{lng,lat,height} \| null` | GIS 经纬度坐标 |
