# 示例

以下示例假设场景已经加载：

```javascript
import { loadScene } from '@meteor3d/core'

const meteor3d = await loadScene({
  sceneId: 'your-scene-id',
  serverUrl: 'http://localhost:3001',
  container: document.getElementById('container')
})
```

## 根据 BID 获取节点

```javascript
const bid = 'bid_xxx'
const object = meteor3d.getObjectByBid(bid)

if (!object) {
  console.warn('节点不存在:', bid)
}
```

## 聚焦节点

```javascript
await meteor3d.focusObject(bid, {
  face: 'right',
  duration: 1500,
  padding: 1.2
})
```

## 描边效果

```javascript
meteor3d.enableOutline(bid, {
  color: 0x00ff00,
  thickness: 1
})

meteor3d.disableOutline(bid)
```

## 高亮效果

```javascript
meteor3d.enableHighlight(bid, {
  color: 0xffff00,
  intensity: 0.5
})

meteor3d.disableHighlight(bid)
```

## 创建标签

```javascript
const label = meteor3d.createLabel({
  position: { x: 0, y: 10, z: 0 },
  content: '<div>信息标签</div>',
  style: {
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '4px'
  }
})

// 不再需要时释放标签
label.dispose()
```

## GIS 坐标转换

GIS 配置由场景编辑器保存，并在加载场景时自动恢复：

```javascript
const position = meteor3d.lngLatToWorld(
  116.4,
  39.9,
  0
)

if (position) {
  console.log('世界坐标:', position)
}
```

## 点击场景

```javascript
meteor3d.on('scene-click', (event) => {
  console.log('节点:', event.object)
  console.log('世界坐标:', event.worldPosition)
  console.log('经纬度:', event.lngLat)
})
```

## 流动线

```javascript
const lineId = meteor3d.createLine({
  points: [
    { x: 0, y: 1, z: 0 },
    { x: 10, y: 3, z: 5 },
    { x: 20, y: 1, z: 0 }
  ],
  textureUrl: '/textures/flow-line.png'
})

meteor3d.removeLine(lineId)
```
