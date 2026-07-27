# 场景加载

## loadScene()

初始化 3D 场景并返回操作实例。

### 语法

```javascript
const meteor3d = await loadScene(selector, options?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| selector | string | ✅ | CSS 选择器或 DOM 元素 |
| options | object | ❌ | 配置选项 |

### 返回值

返回 `Meteor3DInstance` 对象。

### 示例

```javascript
import { loadScene } from '@meteor3d/core';

// 基本用法
const meteor3d = await loadScene('#container');

// 带配置
const meteor3d = await loadScene('#container', {
  backgroundColor: 0x222222
});
```

---

## loadModel()

加载 GLB/GLTF 模型。

### 语法

```javascript
const model = await meteor3d.loadModel(url, options?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | ✅ | 模型文件 URL |
| options | object | ❌ | 加载选项 |

#### options

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| position | `{x, y, z}` | `{0, 0, 0}` | 初始位置 |
| scale | number | 1 | 缩放比例 |

### 返回值

返回 `THREE.Object3D` 模型对象。

### 示例

```javascript
const model = await meteor3d.loadModel('/models/building.glb', {
  position: { x: 0, y: 0, z: 0 },
  scale: 1
});

console.log('模型 BID:', model.userData.bid);
```

---

## fitCameraToScene()

聚焦相机到场景中所有对象。

### 语法

```javascript
meteor3d.fitCameraToScene()
```
