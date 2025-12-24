# 事件与状态

## isReady

获取场景是否就绪。

```javascript
const ready = meteor3d.isReady
```

---

## on()

订阅事件。

```javascript
meteor3d.on(event, callback)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| event | string | 事件名称 |
| callback | function | 回调函数 |

### 可用事件

| 事件 | 说明 |
|------|------|
| `ready` | 场景就绪 |
| `click` | 点击事件 |
| `objectLoaded` | 模型加载完成 |

### 示例

```javascript
meteor3d.on('ready', () => {
  console.log('场景已就绪');
});

meteor3d.on('click', (event) => {
  console.log('点击对象:', event.object);
});
```

---

## off()

取消订阅事件。

```javascript
meteor3d.off(event, callback)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| event | string | 事件名称 |
| callback | function | 要移除的回调函数 |

### 示例

```javascript
const handleClick = (e) => console.log(e);

// 订阅
meteor3d.on('click', handleClick);

// 取消订阅
meteor3d.off('click', handleClick);
```
