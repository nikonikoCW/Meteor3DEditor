# API 概览

Meteor3D SDK 提供了一套简洁的 API 用于 3D 场景开发。

## 核心方法

| 方法 | 说明 |
|------|------|
| `loadScene(selector)` | 初始化 3D 场景 |
| `loadModel(url)` | 加载 GLB/GLTF 模型 |
| `fitCameraToScene()` | 聚焦相机到场景 |
| `focusObject(bid, options)` | 按 BID 从指定物体面聚焦节点 |

## 效果 API

| 方法 | 说明 |
|------|------|
| `enableOutline(bid, options)` | 启用描边效果 |
| `disableOutline(bid)` | 禁用描边效果 |
| `enableHighlight(bid, options)` | 启用高亮效果 |
| `disableHighlight(bid)` | 禁用高亮效果 |

## 对象显隐 API

| 方法 | 说明 |
|------|------|
| `setObjectVisible(bid, visible)` | 设置对象是否可见 |
| `showObject(bid)` | 显示对象 |
| `hideObject(bid)` | 隐藏对象 |
| `isObjectVisible(bid)` | 获取对象自身的可见性标记 |

## 标签 API

| 方法 | 说明 |
|------|------|
| `createLabel(options)` | 创建标签 |
| `getLabels()` | 获取所有标签 |
| `clearLabels()` | 清除所有标签 |

## GIS API

| 方法 | 说明 |
|------|------|
| `setGisConfig(config)` | 配置 GIS 中心点 |
| `lngLatToWorld(lng, lat, height)` | 经纬度转世界坐标 |
| `worldToLngLat(worldPos)` | 世界坐标转经纬度 |

## 辅助 API

| 方法 | 说明 |
|------|------|
| `setGridHelper(visible, length, width)` | 设置网格辅助线 |
| `setAxesHelper(visible, size)` | 设置坐标轴辅助线 |
| `enableStats()` | 启用性能监控 |

## 天气效果 API

| 方法 | 说明 |
|------|------|
| `setSnow(enabled, config)` | 设置下雪效果 |
| `updateSnowConfig(config)` | 更新下雪配置 |
| `getSnowConfig()` | 获取下雪配置 |
| `setRain(enabled, config)` | 设置下雨效果 |
| `updateRainConfig(config)` | 更新下雨配置 |
| `getRainConfig()` | 获取下雨配置 |
