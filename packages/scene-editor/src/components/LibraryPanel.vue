<template>
  <div class="library-panel">
    <h3>资源库</h3>
    
    <!-- 几何体部分 -->
    <div class="section">
      <h4>几何体</h4>
      <div 
        class="item" 
        draggable="true" 
        @dragstart="onDragStart($event, 'Box')"
      >
        📦 立方体
      </div>
      <div 
        class="item" 
        draggable="true" 
        @dragstart="onDragStart($event, 'Sphere')"
      >
        🔵 球体
      </div>
      <div
        class="item"
        draggable="true"
        @dragstart="onDragStart($event, 'Cone')"
      >
        🔺 圆锥
      </div>
      <div
        class="item"
        draggable="true"
        @dragstart="onDragStart($event, 'Cylinder')"
      >
        🛢️ 圆柱
      </div>
    </div>

    <!-- 模型部分 -->
    <div class="section">
      <div class="section-header">
        <h4>模型</h4>
        <button class="refresh-btn" @click="loadAssets" title="刷新">🔄</button>
      </div>
      
      <div v-if="loading" class="loading">
        加载中...
      </div>
      
      <div v-else-if="models.length === 0" class="empty">
        暂无模型
      </div>
      
      <div 
        v-else
        v-for="model in models" 
        :key="model._id"
        class="item" 
        draggable="true" 
        @dragstart="onDragStart($event, 'GLTFModel', getAssetUrl(model), model)"
        :title="model.originalName"
      >
        <span class="asset-type-icon iconfont me-jiandanmoxing"></span>
        <span class="item-name">{{ model.name }}</span>
        <span v-if="isCloudAsset(model)" class="cloud-badge" title="云端资源">☁</span>
      </div>
    </div>

    <!-- 环境贴图部分 -->
    <div class="section" id="env-section">
      <div class="section-header">
        <h4>环境贴图</h4>
      </div>
      
      <div v-if="loading" class="loading">
        加载中...
      </div>
      
      <div v-else-if="environments.length === 0" class="empty">
        暂无环境贴图
      </div>
      
      <div 
        v-else
        v-for="env in environments" 
        :key="env._id"
        class="item" 
        draggable="true" 
        @dragstart="onDragStart($event, 'Environment', getAssetUrl(env))"
        :title="env.originalName"
      >
        <span class="asset-type-icon iconfont me-tiankonghezi"></span>
        <span class="item-name">{{ env.name }}</span>
        <span v-if="isCloudAsset(env)" class="cloud-badge" title="云端资源">☁</span>
      </div>
    </div>

    <!-- 3D Tiles 部分 -->
    <div class="section">
      <div class="section-header">
        <h4>3D Tiles</h4>
        <button class="refresh-btn" @click="loadAssets" title="刷新">🔄</button>
      </div>
      
      <div v-if="loading" class="loading">
        加载中...
      </div>
      
      <div v-else-if="tilesets.length === 0" class="empty">
        暂无 3D Tiles
      </div>
      
      <div 
        v-else
        v-for="tileset in tilesets" 
        :key="tileset._id"
        class="item" 
        draggable="true" 
        @dragstart="onDragStart($event, 'Tileset', getRegisteredAssetUrl(tileset, 'tilesetUrl'))"
        :title="tileset.originalName"
      >
        <span class="asset-type-icon iconfont me-a-3dtiles"></span>
        <span class="item-name">{{ tileset.name }}</span>
        <span v-if="isCloudAsset(tileset)" class="cloud-badge" title="云端资源">☁</span>
      </div>
    </div>

    <!-- 高斯泼溅部分 -->
    <div class="section">
      <div class="section-header">
        <h4>高斯泼溅</h4>
        <button class="refresh-btn" @click="loadAssets" title="刷新">🔄</button>
      </div>
      
      <div v-if="loading" class="loading">
        加载中...
      </div>
      
      <div v-else-if="gaussianSplats.length === 0" class="empty">
        暂无高斯泼溅
      </div>
      
      <div 
        v-else
        v-for="gaussianSplat in gaussianSplats" 
        :key="gaussianSplat._id"
        class="item" 
        draggable="true" 
        @dragstart="onDragStart($event, 'GaussianSplat', getRegisteredAssetUrl(gaussianSplat, 'gaussianSplatUrl'))"
        :title="gaussianSplat.originalName"
      >
        <span class="asset-type-icon iconfont me-a-ziyuan1"></span>
        <span class="item-name">{{ gaussianSplat.name }}</span>
        <span v-if="isCloudAsset(gaussianSplat)" class="cloud-badge" title="云端资源">☁</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAssets, getAssetUrl as _getAssetUrl, getCompressedAssetUrl, getCloudAssetUrl } from '../services/assetService';

const models = ref([]);
const environments = ref([]);
const tilesets = ref([]);
const gaussianSplats = ref([]);
const loading = ref(false);

const onDragStart = (event, type, url = null, asset = null) => {
  event.dataTransfer.setData('type', type);
  if (url) event.dataTransfer.setData('url', url);
  if (asset?._id) event.dataTransfer.setData('assetId', asset._id);
  if (asset?.assetVersionId) {
    event.dataTransfer.setData('assetVersionId', asset.assetVersionId);
  }
};

const isCloudAsset = (asset) => {
  return Boolean(
    asset?.cloudOriginalUrl ||
    asset?.cloudThumbnailUrl ||
    asset?.cloudUrls?.file ||
    asset?.cloudUrls?.original ||
    asset?.cloudUrls?.thumbnail ||
    asset?.cloudUrls?.compressed
  );
};
const getRegisteredAssetUrl = (asset, fallbackField) => {
  return getCloudAssetUrl(asset) || asset?.[fallbackField] || '';
};
const getAssetUrl = (asset) => {
  // 对模型类型，优先使用压缩版本
  if (asset.type === 'model') {
    return getCompressedAssetUrl(asset);
  }
  return _getAssetUrl(asset);
};

const loadAssets = async () => {
  loading.value = true;
  try {
    const [modelAssets, envAssets, tilesetAssets, gaussianSplatAssets] = await Promise.all([
      getAssets('model'),
      getAssets('hdri'),
      getAssets('tileset'),
      getAssets('gaussian-splat')
    ]);
    models.value = modelAssets;
    environments.value = envAssets;
    tilesets.value = tilesetAssets;
    gaussianSplats.value = gaussianSplatAssets;
  } catch (error) {
    console.error('加载资产失败:', error);
  } finally {
    loading.value = false;
    // 通知外部资源加载完成（用于新手引导等）
    window.dispatchEvent(new CustomEvent('library-loaded'));
  }
};

onMounted(() => {
  loadAssets();
});
</script>

<style scoped>
.library-panel {
  width: 100%;
  height: 100%;
  background: #222;
  color: white;
  padding: 10px;
  overflow-y: auto;
}

h3 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #aaa;
  text-transform: uppercase;
}

.section {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.section-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

h4 {
  width: 100%;
  margin: 0;
  font-size: 12px;
  color: #888;
  font-weight: normal;
}

.refresh-btn {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  transition: color 0.2s;
}

.refresh-btn:hover {
  color: white;
}

.item {
  width: 140px;
  padding: 10px;
  background: #2a2a2a;
  cursor: grab;
  border-radius: 4px;
  font-size: 13px;
  transition: background 0.2s;
  overflow: hidden;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 7px;
}

.cloud-badge {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-left: auto;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(40, 167, 69, 0.16);
  border: 1px solid rgba(40, 167, 69, 0.45);
  color: #35d56b;
  font-size: 12px;
  line-height: 1;
}
.item:hover {
  background: #333;
}

.item:active {
  cursor: grabbing;
}

.asset-type-icon {
  flex-shrink: 0;
  color: #aaa;
  font-size: 17px;
}

.item-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.loading,
.empty {
  width: 100%;
  padding: 10px;
  text-align: center;
  font-size: 12px;
  color: #666;
}
</style>
