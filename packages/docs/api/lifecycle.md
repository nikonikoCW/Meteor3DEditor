# 生命周期

## dispose()

销毁实例，释放资源。

```javascript
meteor3d.dispose()
```

### 说明

调用后会：
- 断开 ResizeObserver
- 停止渲染循环（未来版本）
- 释放 WebGL 资源（未来版本）

### 示例

```javascript
// 组件卸载时销毁
onBeforeUnmount(() => {
  meteor3d.dispose();
});
```

---

## 相机控制

### fitCameraToScene()

聚焦相机到所有场景物体。

```javascript
meteor3d.fitCameraToScene()
```

自动计算场景包围盒，调整相机位置使所有对象可见。

### focusObject()

根据场景节点的 BID 聚焦指定物体，并从物体局部坐标系的六个面之一观察。

```javascript
await meteor3d.focusObject('bid_xxx', {
  face: 'front',
  duration: 1500,
  padding: 1.2
})
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| bid | string | - | 要聚焦的场景节点 BID |
| options.face | string | `front` | `front`、`back`、`left`、`right`、`top`、`bottom` |
| options.duration | number | `1500` | 动画时长（毫秒），传 `0` 时立即定位 |
| options.padding | number | `1.2` | 画面留白倍率，值越大相机距离越远 |
| options.onComplete | function | - | 聚焦动画完成回调 |

六个面的局部方向约定：

| face | 局部方向 |
|------|----------|
| `front` | +Z |
| `back` | -Z |
| `left` | -X |
| `right` | +X |
| `top` | +Y |
| `bottom` | -Y |

面方向会应用物体的世界旋转。即使模型已旋转，`front` 仍表示模型自身的正面。

```javascript
await meteor3d.focusObject('bid_xxx', {
  face: 'right',
  padding: 1.5,
  duration: 2000
})
```

当 BID 不存在、面名称无效或者参数非法时，返回的 Promise 会被拒绝。

### resize()

手动触发尺寸调整。

```javascript
meteor3d.resize(width, height)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| width | number | 新宽度 (像素) |
| height | number | 新高度 (像素) |

通常不需要手动调用，SDK 默认开启 `autoResize`。
