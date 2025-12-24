# 性能监控

## FPS 监视器

### enableStats()

启用 FPS 性能监视器。

```javascript
meteor3d.enableStats()
```

### disableStats()

禁用 FPS 性能监视器。

```javascript
meteor3d.disableStats()
```

### toggleStats()

切换 FPS 监视器显隐。

```javascript
meteor3d.toggleStats(show)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| show | boolean | true 显示 / false 隐藏 |

### isStatsEnabled()

检查 FPS 监视器是否启用。

```javascript
const enabled = meteor3d.isStatsEnabled()
```

---

## 三角形统计

### toggleTriangleStats()

切换三角形统计显示。

```javascript
meteor3d.toggleTriangleStats(show, callback?, interval?)
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| show | boolean | - | true 显示 / false 隐藏 |
| callback | function | null | 统计回调函数 |
| interval | number | 100 | 更新间隔 (ms) |

#### callback 参数

```javascript
{
  rendered: number,   // GPU 渲染三角形数
  total: number,      // 场景总三角形数
  drawCalls: number,  // Draw Calls
  textureCount: number // 纹理数量
}
```

#### 示例

```javascript
meteor3d.toggleTriangleStats(true, (stats) => {
  console.log('渲染三角形:', stats.rendered);
  console.log('总三角形:', stats.total);
}, 100);
```

### getTriangleStats()

获取当前三角形统计。

```javascript
const stats = meteor3d.getTriangleStats()
```

### isTriangleStatsEnabled()

检查三角形统计是否启用。

```javascript
const enabled = meteor3d.isTriangleStatsEnabled()
```
