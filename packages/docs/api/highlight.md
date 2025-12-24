# 高亮效果

为 3D 对象添加高亮发光效果。

## enableHighlight()

启用对象高亮。

### 语法

```javascript
meteor3d.enableHighlight(uuid, options?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| uuid | string | ✅ | 对象 UUID |
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
meteor3d.enableHighlight(model.uuid, {
  color: 0xffff00,
  intensity: 0.5
});

// 强烈红色高亮
meteor3d.enableHighlight(model.uuid, {
  color: 0xff0000,
  intensity: 0.8
});
```

---

## disableHighlight()

禁用对象高亮。

### 语法

```javascript
meteor3d.disableHighlight(uuid?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| uuid | string | ❌ | 对象 UUID，不传则清除所有 |

### 示例

```javascript
// 禁用单个对象高亮
meteor3d.disableHighlight(model.uuid);

// 清除所有高亮
meteor3d.disableHighlight();
```

---

## getHighlightedObjects()

获取当前所有高亮对象的 UUID 列表。

### 语法

```javascript
const uuids = meteor3d.getHighlightedObjects()
```

### 返回值

`string[]` - UUID 数组

---

## 技术说明

高亮效果基于材质 Emissive 属性实现：

- **MeshStandardMaterial**: 使用 `emissive` + `emissiveIntensity`
- **MeshBasicMaterial**: 使用颜色混合 (lerp)

两种材质类型都能正确显示高亮效果。
