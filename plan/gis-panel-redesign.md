# GIS 设置面板重新设计

使用 Leaflet + 天地图卫星影像替代手动输入坐标，提供更直观的 GIS 配准体验。

---

## 用户需求摘要

| 状态 | UI 表现 | 交互 |
|------|---------|------|
| 未配置 | `[ + 启用地理环境 ]` 按钮 | 点击打开地图选择器 |
| 已配置 | 信息卡片 + 两个操作按钮 | 【调整范围】【移除 GIS】 |

### 地图选择器功能
- 2D 卫星图 (Leaflet + 天地图)
- 鼠标悬停显示红色**正方形**选框
- 选框默认 1000m × 1000m，可通过输入框调整边长
- 点击确定中心点和四角边界
- WGS84 坐标系
- 网格保持 10m × 10m 一个小格

### 特殊逻辑
- **调整范围**：锁定中心点，只能改大小
- **移除 GIS**：红色高危警告弹窗
- **重新开启**：自动回填上次移除前的配置
- **网格辅助线**：保留现有功能

---

## 技术选型

| 功能 | 技术方案 |
|------|----------|
| 地图库 | Leaflet (轻量、免费) |
| 底图服务 | 天地图卫星影像 (img_w) |
| Token | `5e76a8e70147111f1dcc2d7db16a10f3` |

**天地图瓦片 URL：**
```
https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=5e76a8e70147111f1dcc2d7db16a10f3
```

---

## 架构设计

### 状态机

```
[未配置] --点击"启用地理环境"--> [地图弹窗] --确认--> [已配置]
                                           --取消--> [未配置]

[已配置] --点击"调整范围"--> [地图弹窗(锁定中心)] --确认/取消--> [已配置]
         --点击"移除 GIS"--> [警告弹窗] --确认移除(缓存配置)--> [未配置]
                                       --取消--> [已配置]

[未配置] --点击"启用"(有缓存时自动回填)--> [已配置]
```

### 数据结构

```javascript
// GIS 配置状态
const gisState = {
  status: 'unconfigured' | 'configured',
  config: {
    center: { lng: number, lat: number },
    size: number,  // 正方形边长（米）
    bounds: {
      maxLng: number, minLng: number,
      maxLat: number, minLat: number
    }
  },
  cachedConfig: null,  // 移除前的配置缓存
  gridVisible: false   // 网格辅助线开关
}
```

---

## 实现文件

### 新建文件
- `packages/scene-editor/src/components/MapSelectorDialog.vue` - 地图选择器弹窗组件

### 修改文件
- `packages/scene-editor/src/components/GisSettingsPanel.vue` - 重构为两态结构
- `packages/scene-editor/package.json` - 添加 Leaflet 依赖

---

## 实现步骤

### 步骤 1: 安装依赖
```bash
cd packages/scene-editor
pnpm add leaflet
```

### 步骤 2: 创建 MapSelectorDialog.vue
- 集成 Leaflet + 天地图卫星影像
- 实现地图渲染、鼠标跟踪正方形选框
- 实现边长输入框控制选框大小
- 实现 `lockCenter` 模式（调整范围用）
- 实现点击确认逻辑

### 步骤 3: 重构 GisSettingsPanel.vue
- 保留网格辅助线开关
- 重写为两态结构（未配置/已配置）
- 添加缓存配置逻辑
- 集成 MapSelectorDialog
- 实现移除警告弹窗

### 步骤 4: 更新 SceneManager 集成
- 修改 `range` 为正方形（length = width = size）
- 确保配置变更正确同步到 SceneManager
- 测试网格辅助线与新配置联动

---

## 验证清单

1. **未配置 → 配置**
   - [ ] 点击"启用地理环境"打开地图
   - [ ] 地图显示天地图卫星影像
   - [ ] 鼠标移动时红色正方形选框跟随
   - [ ] 输入框可修改选框边长
   - [ ] 点击确认后显示已配置状态

2. **调整范围**
   - [ ] 点击"调整范围"打开地图
   - [ ] 中心点锁定不可移动
   - [ ] 只能修改选框大小
   - [ ] 确认后更新边界信息

3. **移除 GIS**
   - [ ] 点击"移除 GIS"显示红色警告
   - [ ] 取消后保持已配置状态
   - [ ] 确认后变为未配置状态

4. **配置回填**
   - [ ] 移除后再点击"启用地理环境"
   - [ ] 显示"检测到历史配置"提示
   - [ ] 打开地图时自动回填上次配置

5. **网格辅助线**
   - [ ] 开关正常切换
   - [ ] 网格大小与配置的范围匹配
