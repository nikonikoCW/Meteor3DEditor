# 描边效果

为 3D 对象添加轮廓描边效果。

## enableOutline()

启用对象描边。

### 语法

```javascript
meteor3d.enableOutline(bid, options?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bid | string | ✅ | 对象 BID |
| options | object | ❌ | 描边配置 |

#### options

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| color | number | 0x00ff00 | 描边颜色 |
| thickness | number | 1 | 描边粗细 |
| strength | number | 3 | 描边强度 |

### 返回值

`boolean` - 是否成功

### 示例

```javascript
// 绿色描边
meteor3d.enableOutline(model.bid, {
  color: 0x00ff00,
  thickness: 1,
  strength: 3
});

// 红色粗描边
meteor3d.enableOutline(model.bid, {
  color: 0xff0000,
  thickness: 2,
  strength: 5
});
```

---

## disableOutline()

禁用对象描边。

### 语法

```javascript
meteor3d.disableOutline(bid?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bid | string | ❌ | 对象 BID，不传则清除所有 |

### 示例

```javascript
// 禁用单个对象描边
meteor3d.disableOutline(model.bid);

// 清除所有描边
meteor3d.disableOutline();
```

---

## getOutlinedObjects()

获取当前所有描边对象的 BID 列表。

### 语法

```javascript
const bids = meteor3d.getOutlinedObjects()
```

### 返回值

`string[]` - BID 数组

### 示例

```javascript
const outlinedUuids = meteor3d.getOutlinedObjects();
console.log('描边对象:', outlinedUuids);
```
