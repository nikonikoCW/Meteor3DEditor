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
        @dragstart="onDragStart($event, 'GLTFModel', getAssetUrl(model))"
        :title="model.originalName"
      >
        🎨 {{ model.name }}
      </div>
    </div>

    <!-- 环境贴图部分 -->
    <div class="section">
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
        🌅 {{ env.name }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAssets, getAssetUrl as _getAssetUrl, getCompressedAssetUrl } from '../services/assetService';

const models = ref([]);
const environments = ref([]);
const loading = ref(false);

const onDragStart = (event, type, url = null) => {
  event.dataTransfer.setData('type', type);
  if (url) {
    event.dataTransfer.setData('url', url);
  }
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
    const [modelAssets, envAssets] = await Promise.all([
      getAssets('model'),
      getAssets('hdri') // 尝试使用 'hdr' 作为类型，如果后端区分的话。或者尝试 'environment'
    ]);
    models.value = modelAssets;
    environments.value = envAssets;
  } catch (error) {
    console.error('加载资产失败:', error);
  } finally {
    loading.value = false;
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
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item:hover {
  background: #333;
}

.item:active {
  cursor: grabbing;
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
