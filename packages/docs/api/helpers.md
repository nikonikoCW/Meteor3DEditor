# 辅助显示

## setGridHelper()

设置网格辅助线。

```javascript
meteor3d.setGridHelper(visible, length?, width?)
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | boolean | - | 是否显示 |
| length | number | 30 | 网格长度 (米) |
| width | number | 30 | 网格宽度 (米) |

### 示例

```javascript
// 显示 100x100 网格
meteor3d.setGridHelper(true, 100, 100);

// 隐藏网格
meteor3d.setGridHelper(false);
```

---

## setAxesHelper()

设置坐标轴辅助线。

```javascript
meteor3d.setAxesHelper(visible, size?)
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | boolean | - | 是否显示 |
| size | number | 10 | 坐标轴长度 |

### 坐标轴颜色

- **红色 (R)**: X 轴
- **绿色 (G)**: Y 轴
- **蓝色 (B)**: Z 轴

### 示例

```javascript
// 显示长度 20 的坐标轴
meteor3d.setAxesHelper(true, 20);

// 隐藏坐标轴
meteor3d.setAxesHelper(false);
```
