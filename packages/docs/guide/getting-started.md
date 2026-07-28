# 快速开始

本指南将帮助你通过 Meteor3D SDK 加载场景并调用公共 API。

## 安装

```bash
npm install @meteor3d/core
```

## 加载场景

```html
<div id="container" style="width: 100%; height: 500px;"></div>

<script type="module">
import { loadScene } from '@meteor3d/core'

const meteor3d = await loadScene({
  sceneId: 'your-scene-id',
  serverUrl: 'http://localhost:3001',
  container: document.getElementById('container')
})

meteor3d.on('scene-click', (event) => {
  const bid = event.object?.userData?.bid
  console.log('点击节点 BID:', bid)
})
</script>
```

场景和模型由场景编辑器保存到 Meteor3D 后端，SDK 使用 `sceneId` 加载完整场景。

## Meteor3DInstance

`loadScene()` 返回 `Meteor3DInstance`，第三方业务通过该实例操作场景：

```javascript
// 聚焦整个场景
meteor3d.fitCameraToScene()

// 根据 BID 查询并聚焦节点
const object = meteor3d.getObjectByBid('bid_xxx')

if (object) {
  await meteor3d.focusObject(object.userData.bid, {
    face: 'front',
    duration: 1200
  })
}

// 视觉反馈
meteor3d.enableOutline('bid_xxx')
meteor3d.enableHighlight('bid_xxx')
```

## 组件卸载

```javascript
meteor3d.dispose()
```

## 下一步

- [API 参考](/api/)
- [相机导航](/api/camera)
- [对象查询](/api/objects)
- [完整示例](/examples/)
