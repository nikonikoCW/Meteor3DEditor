# 流动线

流动线 API 用于在三维场景中创建带纹理滚动和呼吸效果的路径。

## createLine()

创建流动线并返回线条 ID。

```javascript
const lineId = meteor3d.createLine({
  points: [
    { x: 0, y: 1, z: 0 },
    { x: 10, y: 3, z: 5 },
    { x: 20, y: 1, z: 0 }
  ],
  textureUrl: '/textures/flow-line.png',
  width: 2,
  radius: 2,
  speed: 1.5,
  repeat: 25
})
```

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| id | string | 自动生成 | 自定义线条 ID |
| points | `Array<{x,y,z} \| THREE.Vector3>` | - | 路径点，至少需要两个 |
| textureUrl | string | - | 流动纹理 URL |
| width | number | `2` | 线条宽度 |
| radius | number | `2` | 转角圆角半径 |
| speed | number | `1.5` | 纹理流动速度 |
| repeat | number | `25` | 纹理重复次数 |
| breathStart | number | `0.5` | 呼吸透明度起始值 |
| breathEnd | number | `1` | 呼吸透明度结束值 |
| breathFrequency | number | `2` | 呼吸频率；`0` 表示关闭呼吸 |

成功时返回线条 ID。路径点少于两个时返回 `null`。

路径首尾点距离小于 `0.001` 时会被视为闭合路径。

## removeLine()

移除指定线条并释放几何体、材质和纹理资源。

```javascript
meteor3d.removeLine(lineId)
```

## clearLines()

移除当前 SDK 实例创建的所有流动线。

```javascript
meteor3d.clearLines()
```
