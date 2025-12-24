# GIS 功能

支持经纬度坐标与 Three.js 世界坐标的转换。

## setGisConfig()

配置 GIS 中心点。

### 语法

```javascript
meteor3d.setGisConfig(config)
```

### 参数

#### config

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| center | `{lng, lat}` | ✅ | 中心点经纬度 |
| size | number | ❌ | 覆盖范围（米），默认 1000 |

### 示例

```javascript
// 设置北京为中心点
meteor3d.setGisConfig({
  center: { lng: 116.397428, lat: 39.90923 },
  size: 2000
});
```

---

## lngLatToWorld()

经纬度转世界坐标。

### 语法

```javascript
const worldPos = meteor3d.lngLatToWorld(lng, lat, height?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| lng | number | ✅ | 经度 |
| lat | number | ✅ | 纬度 |
| height | number | ❌ | 高度（米），默认 0 |

### 返回值

`THREE.Vector3 | null`

### 示例

```javascript
const pos = meteor3d.lngLatToWorld(116.4, 39.9, 10);
if (pos) {
  console.log('世界坐标:', pos.x, pos.y, pos.z);
}
```

---

## worldToLngLat()

世界坐标转经纬度。

### 语法

```javascript
const geo = meteor3d.worldToLngLat(worldPos)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| worldPos | THREE.Vector3 | ✅ | 世界坐标 |

### 返回值

```javascript
{ lng: number, lat: number, height: number } | null
```

---

## 坐标系说明

Meteor3D 使用以下坐标映射：

| 方向 | 地理 | Three.js |
|------|------|----------|
| 东 | +经度 | +X |
| 北 | +纬度 | +Z |
| 上 | +高度 | +Y |

GIS 中心点 → Three.js 原点 (0, 0, 0)
