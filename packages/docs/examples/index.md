# 示例

## 基础示例

### 加载模型

```javascript
import { loadScene } from '@meteor3d/core';

const meteor3d = await loadScene('#container');
const model = await meteor3d.loadModel('/models/building.glb');
meteor3d.fitCameraToScene();
```

### 描边效果

```javascript
// 选中时高亮
meteor3d.enableOutline(model.userData.bid, {
  color: 0x00ff00,
  thickness: 1
});

// 取消选中
meteor3d.disableOutline(model.userData.bid);
```

### 高亮效果

```javascript
// 鼠标悬停高亮
meteor3d.enableHighlight(model.userData.bid, {
  color: 0xffff00,
  intensity: 0.5
});

// 移开时取消
meteor3d.disableHighlight(model.userData.bid);
```

### 创建标签

```javascript
meteor3d.createLabel({
  position: { x: 0, y: 10, z: 0 },
  content: '<div>信息标签</div>',
  style: {
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '4px'
  }
});
```

### GIS 坐标

```javascript
// 配置中心点
meteor3d.setGisConfig({
  center: { lng: 116.4, lat: 39.9 },
  size: 2000
});

// 定位到经纬度
const pos = meteor3d.lngLatToWorld(116.4, 39.9, 0);
model.position.copy(pos);
```

## 完整示例

查看 [example.html](https://github.com/nikonikoCW/Meteor3D/blob/master/packages/core/example.html)
