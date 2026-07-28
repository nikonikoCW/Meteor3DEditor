# API 概览

Meteor3D SDK 通过 `loadScene()` 返回场景实例。下表列出面向第三方开发的公共实例 API。

## 场景加载

| API | 说明 |
|-----|------|
| `loadScene(options)` | 加载后端场景并返回 SDK 实例 |

## 状态与事件

| API | 说明 |
|-----|------|
| `isReady` | 场景是否加载完成 |
| `on(event, callback)` | 订阅事件 |
| `off(event, callback)` | 取消订阅事件 |

## 对象查询与显隐

| API | 说明 |
|-----|------|
| `getObjectByBid(bid)` | 根据持久化 BID 查询节点 |
| `setObjectVisible(bid, visible)` | 设置节点显隐 |
| `showObject(bid)` | 显示节点 |
| `hideObject(bid)` | 隐藏节点 |
| `isObjectVisible(bid)` | 查询节点自身的显隐标记 |

## 相机导航

| API | 说明 |
|-----|------|
| `fitCameraToScene()` | 聚焦整个场景 |
| `focusObject(bid, options)` | 从指定局部面聚焦节点 |
| `getView(callback?)` | 获取当前相机位置和观察点 |
| `setView(options)` | 设置相机视角并支持动画过渡 |
| `setControlMode(mode, options?)` | 切换 Orbit/Ghost 控制模式 |
| `getControlMode()` | 获取当前控制模式 |
| `resize(width, height)` | 手动更新渲染尺寸 |

## 射线检测

| API | 说明 |
|-----|------|
| `raycastObjects(screenPosition, options?)` | 检测屏幕位置命中的场景对象 |
| `raycastGround(screenPosition)` | 检测与 `Y = 0` 地面的交点 |

## 性能监控

| API | 说明 |
|-----|------|
| `enableStats()` | 启用 FPS 面板 |
| `disableStats()` | 禁用 FPS 面板 |
| `toggleStats(show)` | 切换 FPS 面板 |
| `isStatsEnabled()` | 查询 FPS 面板状态 |
| `toggleTriangleStats(show, callback, interval?)` | 切换三角面统计 |
| `getTriangleStats()` | 获取当前渲染统计 |
| `isTriangleStatsEnabled()` | 查询三角面统计状态 |

## GIS 与辅助显示

| API | 说明 |
|-----|------|
| `lngLatToWorld(lng, lat, height?)` | 经纬度转世界坐标 |
| `worldToLngLat(worldPos)` | 世界坐标转经纬度 |
| `setGridHelper(visible, length, width)` | 设置网格辅助线 |
| `setAxesHelper(visible, size)` | 设置坐标轴辅助线 |

## 标签

| API | 说明 |
|-----|------|
| `createLabel(options)` | 创建三维 HTML 标签 |
| `getLabels()` | 获取所有标签 |
| `clearLabels()` | 清除所有标签 |

## 描边与高亮

| API | 说明 |
|-----|------|
| `enableOutline(bid, options?)` | 启用节点描边 |
| `disableOutline(bid?)` | 禁用一个或全部描边 |
| `getOutlinedObjects()` | 获取描边节点 BID |
| `enableHighlight(bid, options?)` | 启用节点高亮 |
| `disableHighlight(bid?)` | 禁用一个或全部高亮 |
| `getHighlightedObjects()` | 获取高亮节点 BID |

## 天气效果

| API | 说明 |
|-----|------|
| `setSnow(enabled, config?)` | 设置下雪效果 |
| `updateSnowConfig(config)` | 更新下雪配置 |
| `getSnowConfig()` | 获取下雪配置 |
| `setRain(enabled, config?)` | 设置下雨效果 |
| `updateRainConfig(config)` | 更新下雨配置 |
| `getRainConfig()` | 获取下雨配置 |

## VFX 与流动线

| API | 说明 |
|-----|------|
| `createEffect(type, config)` | 创建已注册的 VFX 特效 |
| `removeEffect(id)` | 移除特效 |
| `createLine(options)` | 创建流动线 |
| `removeLine(id)` | 移除流动线 |
| `clearLines()` | 清除全部流动线 |

## 生命周期

| API | 说明 |
|-----|------|
| `dispose()` | 断开 SDK 实例的尺寸监听并执行清理 |
