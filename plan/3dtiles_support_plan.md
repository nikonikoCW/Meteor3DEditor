# 3D Tiles (OSGB) 资产管理支持方案

本方案旨在扩展资产管理平台，支持 3D Tiles 瓦片数据的注册与管理。

---

## Phase 1：数据注册（已完成 ✅）

### 1. 数据模型层

#### [MODIFY] [Asset.js](file:///f:/chenwei/Projects/Meteor3D/meteor3d-server/src/models/Asset.js)
- ✅ `type` 枚举新增 `tileset`
- ✅ 新增 `tilesetUrl` (String): 存储 tileset.json 的外部 URL

### 2. 控制器层

#### [MODIFY] [assetController.js](file:///f:/chenwei/Projects/Meteor3D/meteor3d-server/src/controllers/assetController.js)
- ✅ `registerTileset`: 处理 3D Tiles 注册逻辑
  - 仅支持外部 URL (http/https)
  - 存储 tileset.json 的完整访问路径

### 3. 前端界面

#### [MODIFY] [AssetsView.vue](file:///f:/chenwei/Projects/Meteor3D/packages/asset-manager/src/views/AssetsView.vue)
- ✅ 新增"注册 3D Tiles"按钮和对话框
- ✅ 筛选栏新增"3D Tiles"选项
- ✅ tileset 类型使用 🌐 图标显示

---

## Phase 2：云端同步（待实现）

> [!IMPORTANT]
> 3D Tiles 包含海量小文件，同步到又拍云可能耗时较长并产生大量 API 请求。

### 1. 数据模型层
- [ ] 新增 `syncStatus` 字段: `unsynced`, `syncing`, `synced`, `failed`

### 2. 服务层

#### [MODIFY] [upyunService.js](file:///f:/chenwei/Projects/Meteor3D/meteor3d-server/src/services/upyunService.js)
- [ ] `uploadDirectory(localDirPath, remoteDirPath)`: 递归遍历文件夹并上传
- [ ] 引入 `p-limit` 控制并发

### 3. 控制器层
- [ ] `syncTileset`: 触发异步同步任务
- [ ] `deleteAsset`: 删除 tileset 时递归删除云端目录

### 4. 前端界面
- [ ] 资产卡片增加"同步到云端"按钮
- [ ] 状态显示增加同步进度/状态

---

## Phase 3：场景编辑器集成（待实现）

- [ ] 在 `@meteor3d/core` 中引入 `3d-tiles-renderer`
- [ ] `LibraryPanel` 支持拖拽 tileset 到场景
- [ ] `PersistenceManager` 支持 tileset 对象序列化
- [ ] `loadScene.js` SDK 支持加载 tileset
