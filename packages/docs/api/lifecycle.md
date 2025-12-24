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
