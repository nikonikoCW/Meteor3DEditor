# 天气效果

为场景添加动态天气效果（下雪、下雨）。

::: warning 注意
天气效果仅用于实时预览，**不会随场景保存**。
:::

## setSnow()

设置下雪效果开关。

### 语法

```javascript
meteor3d.setSnow(enabled, config?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| enabled | boolean | ✅ | 是否启用 |
| config | object | ❌ | 雪效配置 |

#### config

| 属性 | 类型 | 默认值 | 范围 | 说明 |
|------|------|--------|------|------|
| count | number | 10000 | 100-30000 | 雪量（粒子数量） |
| size | number | 1.0 | 0.1-5.0 | 雪花大小 |
| speed | number | 1.0 | 0.0-5.0 | 下落速度 |
| opacity | number | 0.8 | 0.0-1.0 | 透明度 |
| color | string | '#ffffff' | - | 雪花颜色 |

### 示例

```javascript
// 开启下雪（使用默认配置）
meteor3d.setSnow(true);

// 开启下雪（自定义配置）
meteor3d.setSnow(true, {
  count: 15000,
  size: 1.5,
  speed: 0.8,
  opacity: 0.9,
  color: '#e0f0ff'
});

// 关闭下雪
meteor3d.setSnow(false);
```

---

## updateSnowConfig()

动态更新下雪配置。

### 语法

```javascript
meteor3d.updateSnowConfig(config)
```

### 示例

```javascript
// 增加雪量
meteor3d.updateSnowConfig({ count: 20000 });

// 加快速度
meteor3d.updateSnowConfig({ speed: 2.5 });
```

---

## getSnowConfig()

获取当前下雪配置。

### 语法

```javascript
const config = meteor3d.getSnowConfig()
```

### 返回值

```javascript
{
  enabled: boolean,
  count: number,
  size: number,
  speed: number,
  opacity: number,
  color: string
}
```

---

## setRain()

设置下雨效果开关。

### 语法

```javascript
meteor3d.setRain(enabled, config?)
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| enabled | boolean | ✅ | 是否启用 |
| config | object | ❌ | 雨效配置 |

#### config

| 属性 | 类型 | 默认值 | 范围 | 说明 |
|------|------|--------|------|------|
| count | number | 10000 | 100-50000 | 雨量（粒子数量） |
| speed | number | 2.0 | 0.0-10.0 | 雨速 |

### 示例

```javascript
// 开启下雨（使用默认配置）
meteor3d.setRain(true);

// 开启暴雨
meteor3d.setRain(true, {
  count: 30000,
  speed: 5.0
});

// 关闭下雨
meteor3d.setRain(false);
```

---

## updateRainConfig()

动态更新下雨配置。

### 语法

```javascript
meteor3d.updateRainConfig(config)
```

### 示例

```javascript
// 增加雨量
meteor3d.updateRainConfig({ count: 25000 });

// 减慢雨速
meteor3d.updateRainConfig({ speed: 1.0 });
```

---

## getRainConfig()

获取当前下雨配置。

### 语法

```javascript
const config = meteor3d.getRainConfig()
```

### 返回值

```javascript
{
  enabled: boolean,
  count: number,
  speed: number
}
```

---

## 技术说明

### 下雪效果 ❄️

- 基于 **InstancedMesh** + **GPU Shader** 实现
- 支持最大 **30,000** 个雪花粒子
- 特性：广告牌效果（始终面向相机）、无限循环、边缘渐隐

### 下雨效果 🌧️

- 基于 **InstancedMesh** + **折射 Shader** 实现
- 支持最大 **50,000** 个雨滴粒子
- 特性：广告牌效果、背景折射、无限循环
