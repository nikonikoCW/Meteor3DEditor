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

    <!-- 仅用于当前编辑器会话的可视化预览，不参与场景保存 -->
    <div class="section">
      <div class="section-header">
        <h4>
          可视化效果
          <span class="temporary-badge">不可保存</span>
          <span v-if="previewCount > 0" class="preview-count">{{ previewCount }}</span>
        </h4>
        <button
          class="clear-preview-btn"
          type="button"
          :disabled="previewCount === 0"
          title="清除当前场景中的所有临时可视化效果"
          @click="clearVisualPreviews"
        >
          清除预览
        </button>
      </div>

     <div
        class="item"
        draggable="true"
        @dragstart="onDragStart($event, 'PreviewShield')"
      >
        <span class="preview-icon">🛡</span>
        <span class="item-name">护盾</span>
      </div>

      <div
        class="item"
        draggable="true"
        @dragstart="onDragStart($event, 'PreviewScan')"
      >
        <span class="preview-icon">◉</span>
        <span class="item-name">扫描</span>
      </div>

      <div
        class="item"
        draggable="true"
        @dragstart="onDragStart($event, 'PreviewLabel')"
      >
        <span class="preview-icon">🏷</span>
        <span class="item-name">标签</span>
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
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { getAssets, getAssetUrl as _getAssetUrl, getCompressedAssetUrl, getCloudAssetUrl } from '../services/assetService';

const models = ref([]);
const environments = ref([]);
const tilesets = ref([]);
const gaussianSplats = ref([]);
const loading = ref(false);
const previewCount = ref(0);

const onDragStart = (event, type, url = null, asset = null) => {
  event.dataTransfer.setData('type', type);
  if (url) event.dataTransfer.setData('url', url);
  if (asset?._id) event.dataTransfer.setData('assetId', asset._id);
  if (asset?.assetVersionId) {
    event.dataTransfer.setData('assetVersionId', asset.assetVersionId);
  }
};

const clearVisualPreviews = () => {
  window.dispatchEvent(new CustomEvent('clear-visual-previews'));
};

const handlePreviewCountChanged = (event) => {
  previewCount.value = event.detail?.count || 0;
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
  window.addEventListener('visual-preview-count-changed', handlePreviewCountChanged);
  loadAssets();
});

onBeforeUnmount(() => {
  window.removeEventListener('visual-preview-count-changed', handlePreviewCountChanged);
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


.temporary-badge {
  display: inline-flex;
  margin-left: 6px;
  padding: 2px 5px;
  border: 1px solid rgba(255, 183, 77, 0.45);
  border-radius: 3px;
  color: #ffb74d;
  font-size: 10px;
  vertical-align: middle;
}

.preview-count {
  display: inline-flex;
  min-width: 18px;
  height: 18px;
  margin-left: 6px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #3578c8;
  color: white;
  font-size: 10px;
}


.preview-icon {
  flex-shrink: 0;
  width: 18px;
  color: #72aef5;
  text-align: center;
  font-size: 16px;
}

.clear-preview-btn {
  flex-shrink: 0;
  padding: 3px 8px;
  border: 1px solid #4a4a4a;
  border-radius: 3px;
  background: #292929;
  color: #aaa;
  cursor: pointer;
  font-size: 11px;
}

.clear-preview-btn:hover:not(:disabled) {
  border-color: #777;
  color: white;
}

.clear-preview-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
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
