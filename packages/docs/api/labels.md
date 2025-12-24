# 标签系统

在 3D 场景中创建 HTML 标签。

## createLabel()

创建一个标签。

### 语法

```javascript
const label = meteor3d.createLabel(options)
```

### 参数

#### options

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ❌ | 标签 ID，不填则自动生成 |
| position | `{x, y, z}` | ❌ | 世界坐标位置 |
| lngLat | `{lng, lat, height}` | ❌ | 经纬度位置（需配置 GIS） |
| content | string | ✅ | HTML 内容 |
| style | object | ❌ | CSS 样式对象 |
| offset | `{x, y}` | ❌ | 屏幕像素偏移 |

> 注意：`position` 和 `lngLat` 二选一

### 返回值

`Label` - 标签实例

### 示例

```javascript
// 使用世界坐标
const label = meteor3d.createLabel({
  position: { x: 0, y: 5, z: 0 },
  content: '<div class="label">建筑 A</div>',
  style: {
    padding: '4px 8px',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    borderRadius: '4px'
  }
});

// 使用经纬度
const label = meteor3d.createLabel({
  lngLat: { lng: 116.4, lat: 39.9, height: 10 },
  content: '<b>北京</b>',
  offset: { x: 0, y: -20 }
});
```

---

## Label 实例方法

### setPosition()

```javascript
label.setPosition(x, y, z)
```

### setLngLat()

```javascript
label.setLngLat(lng, lat, height)
```

### setContent()

```javascript
label.setContent('<div>新内容</div>')
```

### setStyle()

```javascript
label.setStyle({ color: 'red' })
```

### show() / hide()

```javascript
label.hide()
label.show()
```

### dispose()

```javascript
label.dispose() // 移除标签
```

---

## getLabels()

获取所有标签。

```javascript
const labels = meteor3d.getLabels()
```

---

## clearLabels()

清除所有标签。

```javascript
meteor3d.clearLabels()
```
