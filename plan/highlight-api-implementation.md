# 高亮 API 实现方案

## 目标

为 `@meteor3d/core` 添加高亮效果 API，使用 Material Emissive 实现，支持通过 UUID 控制对象高亮状态。

## API 设计

```javascript
// 启用高亮
instance.enableHighlight(uuid, { color, intensity })

// 禁用高亮 (不传参清除所有)
instance.disableHighlight(uuid?)

// 获取高亮对象
instance.getHighlightedObjects()
```

### 配置选项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| color | number | 0xffff00 | 高亮颜色 |
| intensity | number | 0.5 | 发光强度 (0-1) |

## 实现文件

### [NEW] HighlightManager.js

```javascript
class HighlightManager {
  constructor()
  
  enable(object, options)    // 设置高亮
  disable(object)            // 取消高亮
  disableAll()               // 清除所有
  getHighlightedUUIDs()      // 获取列表
  dispose()                  // 销毁
}
```

### [MODIFY] SceneManager.js

- 导入并初始化 HighlightManager
- 添加 enableHighlight/disableHighlight 方法

### [MODIFY] loadScene.js

- 暴露 enableHighlight/disableHighlight/getHighlightedObjects API

## 技术方案

使用 Material Emissive 属性：
- 保存原始 emissive 和 emissiveIntensity
- 设置新的高亮颜色和强度
- 关闭时恢复原始值

## 验证

1. 在 example.html 测试 enableHighlight/disableHighlight
2. 验证多对象高亮
3. 验证 disableHighlight() 清除所有
