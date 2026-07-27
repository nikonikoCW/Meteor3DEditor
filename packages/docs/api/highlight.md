# 高亮效果

为 3D 对象添加高亮发光效果。

## enableHighlight()

启用对象高亮。

### 语法

```javascript
meteor3d.enableHighlight(bid, options?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bid | string | ✅ | 对象 BID |
| options | object | ❌ | 高亮配置 |

#### options

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| color | number | 0xffff00 | 高亮颜色 |
| intensity | number | 0.5 | 发光强度 (0-1) |

### 返回值

`boolean` - 是否成功

### 示例

```javascript
// 黄色高亮
meteor3d.enableHighlight(model.bid, {
  color: 0xffff00,
  intensity: 0.5
});

// 强烈红色高亮
meteor3d.enableHighlight(model.bid, {
  color: 0xff0000,
  intensity: 0.8
});
```

---

## disableHighlight()

禁用对象高亮。

### 语法

```javascript
meteor3d.disableHighlight(bid?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bid | string | ❌ | 对象 BID，不传则清除所有 |

### 示例

```javascript
// 禁用单个对象高亮
meteor3d.disableHighlight(model.bid);

// 清除所有高亮
meteor3d.disableHighlight();
```

---

## getHighlightedObjects()

获取当前所有高亮对象的 BID 列表。

### 语法

```javascript
const bids = meteor3d.getHighlightedObjects()
```

### 返回值

`string[]` - BID 数组

---

## 技术说明

高亮效果基于材质 Emissive 属性实现：

- **MeshStandardMaterial**: 使用 `emissive` + `emissiveIntensity`
- **MeshBasicMaterial**: 使用颜色混合 (lerp)

两种材质类型都能正确显示高亮效果。
