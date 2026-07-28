# 生命周期与尺寸

## resize()

手动更新相机纵横比、渲染缓冲区、标签层和描边后处理尺寸。

```javascript
meteor3d.resize(width, height)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| width | number | 宽度，单位像素 |
| height | number | 高度，单位像素 |

SDK 默认开启 `autoResize`，通常不需要手动调用。

## dispose()

销毁当前 SDK 实例：

```javascript
meteor3d.dispose()
```

当前版本会断开 SDK 创建的 `ResizeObserver`。组件卸载时应始终调用：

```javascript
onBeforeUnmount(() => {
  meteor3d.dispose()
})
```

相机定位和聚焦相关接口参见 [相机导航](/api/camera)。
