# 快速开始

本指南将帮助你快速上手 Meteor3D SDK。

## 安装

```bash
npm install @meteor3d/core
```

## 基本使用

```html
<div id="container" style="width: 100%; height: 500px;"></div>

<script type="module">
import { loadScene } from '@meteor3d/core';

const meteor3d = await loadScene('#container');

// 加载模型
const model = await meteor3d.loadModel('/models/example.glb');

// 聚焦相机
meteor3d.fitCameraToScene();
</script>
```

## 核心概念

### Meteor3DInstance

`loadScene()` 返回一个 `Meteor3DInstance` 对象，它是你与 3D 场景交互的主要接口。

```javascript
const meteor3d = await loadScene('#container');

// 所有操作都通过 meteor3d 实例进行
meteor3d.loadModel(url);
meteor3d.enableOutline(bid);
meteor3d.enableHighlight(bid);
meteor3d.createLabel(options);
```

## 下一步

- [API 参考](/api/) - 详细的 API 文档
- [示例](/examples/) - 更多使用示例
