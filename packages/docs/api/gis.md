# GIS 功能

场景的 GIS 中心点和底图配置由场景编辑器保存，并在 `loadScene()` 时从场景元数据恢复。公共 SDK 提供坐标转换能力。

## lngLatToWorld()

将经纬度和高度转换为 Three.js 世界坐标。

```javascript
const position = meteor3d.lngLatToWorld(
  116.397428,
  39.90923,
  10
)
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| lng | number | 是 | 经度 |
| lat | number | 是 | 纬度 |
| height | number | 否 | 高度，默认 `0` |

返回 `THREE.Vector3 | null`。场景未启用 GIS 时返回 `null`。

## worldToLngLat()

将 Three.js 世界坐标转换为经纬度。

```javascript
const lngLat = meteor3d.worldToLngLat({
  x: 100,
  y: 20,
  z: 200
})
```

| 参数 | 类型 | 说明 |
|------|------|------|
| worldPos | `{x,y,z}` | 世界坐标 |

返回：

```javascript
{
  lng: number,
  lat: number,
  height: number
} | null
```

场景未启用 GIS 时返回 `null`。

## 坐标方向

| 世界方向 | Three.js 坐标 |
|----------|----------------|
| 东 | +X |
| 北 | +Z |
| 上 | +Y |
