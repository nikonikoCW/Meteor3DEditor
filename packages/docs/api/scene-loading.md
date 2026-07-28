# 场景加载

## loadScene()

从 Meteor3D 后端加载场景并返回公共 SDK 实例。

### 语法

```javascript
const meteor3d = await loadScene({
  sceneId,
  serverUrl,
  container,
  config
})
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sceneId | string | 是 | 场景 ID |
| serverUrl | string | 是 | Meteor3D 后端地址，不包含 `/api` |
| container | HTMLElement | 是 | Canvas 或用于承载 Canvas 的 DOM 元素 |
| config | object | 否 | 加载配置 |

`config` 支持：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| dracoPath | string | `${serverUrl}/draco/` | Draco 解码器目录 |
| fitCamera | boolean | `true` | 加载后是否自动聚焦整个场景 |
| showGrid | boolean | 跟随场景配置 | 是否显示网格 |
| autoResize | boolean | `true` | 是否自动响应容器尺寸变化 |

### 示例

```javascript
import { loadScene } from '@meteor3d/core'

const container = document.getElementById('scene-container')

const meteor3d = await loadScene({
  sceneId: 'scene-id',
  serverUrl: 'http://localhost:3001',
  container,
  config: {
    fitCamera: true,
    autoResize: true
  }
})

meteor3d.on('scene-click', (event) => {
  console.log(event.object)
})
```

### 返回值

返回 `Promise<Meteor3DInstance>`。实例方法参见 [API 概览](/api/)。

场景加载失败、后端返回失败状态或必要参数无效时，Promise 会被拒绝。
