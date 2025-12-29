<template>
  <div class="assets-view">
    <div class="header">
      <router-link to="/" class="home-link">← 返回主页</router-link>
      <h1>资产管理</h1>
      <button class="upload-btn" @click="triggerFileInput">
        <span>📤</span> 上传资产
      </button>
      <input 
        ref="fileInput"
        type="file" 
        accept=".gltf,.glb,.jpg,.jpeg,.png,.hdr,.exr"
        @change="handleFileSelect"
        style="display: none"
      />
    </div>

    <div class="filter-bar">
      <button 
        :class="['filter-btn', { active: currentFilter === null }]"
        @click="setFilter(null)"
      >
        全部
      </button>
      <button 
        :class="['filter-btn', { active: currentFilter === 'model' }]"
        @click="setFilter('model')"
      >
        模型
      </button>
      <button 
        :class="['filter-btn', { active: currentFilter === 'texture' }]"
        @click="setFilter('texture')"
      >
        贴图
      </button>
      <button 
        :class="['filter-btn', { active: currentFilter === 'hdri' }]"
        @click="setFilter('hdri')"
      >
        HDRI
      </button>
    </div>

    <div class="assets-grid" v-if="assets.length > 0">
      <div 
        v-for="asset in filteredAssets" 
        :key="asset._id"
        class="asset-card"
      >
            <div class="asset-preview">
          <img v-if="asset.thumbnail" :src="getThumbnailUrl(asset)" :alt="asset.name" class="asset-thumb">
          <span v-else class="asset-icon">{{ getAssetIcon(asset.type) }}</span>
        </div>
        <div class="asset-info">
          <div class="asset-name" :title="asset.originalName">
            {{ asset.originalName }}
          </div>
          <div class="asset-meta">
            <span>{{ asset.format.toUpperCase() }}</span>
            <span>{{ formatFileSize(asset.fileSize) }}</span>
          </div>
        </div>
        <div class="asset-actions">
          <button 
            class="action-btn download-btn" 
            @click="handleDownload(asset)"
            title="下载"
          >
            ⬇️
          </button>
          <button 
            class="action-btn delete-btn" 
            @click="handleDelete(asset)"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>暂无资产</p>
      <p class="hint">点击上方"上传资产"按钮开始上传</p>
    </div>

    <!-- 上传进度提示 -->
    <div v-if="uploading" class="upload-overlay">
      <div class="upload-progress">
        <div class="spinner"></div>
        <p>{{ uploadStatus }}</p>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { uploadAsset, getAssets, deleteAsset, downloadAsset } from '../services/assetService';
import { ASSET_BASE_URL } from '../config';
import { ThumbnailGenerator } from '../utils/ThumbnailGenerator';
import { message } from '../utils/message';

const assets = ref([]);
const currentFilter = ref(null);
const uploading = ref(false);
const fileInput = ref(null);
const uploadStatus = ref('正在上传...'); // 添加上传状态文本

// ⚡ 性能优化：缩略图生成器单例，避免重复创建导致的资源泄漏
let thumbnailGenerator = null;

const filteredAssets = computed(() => {
  if (currentFilter.value === null) {
    return assets.value;
  }
  return assets.value.filter(asset => asset.type === currentFilter.value);
});

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  uploading.value = true;
  uploadStatus.value = '正在处理...';

  try {
    let thumbnail = null;
    const ext = file.name.split('.').pop().toLowerCase();
    
    // 如果是模型文件，尝试生成缩略图
    if (['gltf', 'glb'].includes(ext)) {
      uploadStatus.value = '正在生成缩略图...';
      try {
        // ⚡ 使用单例实例，避免重复创建 WebGL 上下文
        if (!thumbnailGenerator) {
          thumbnailGenerator = new ThumbnailGenerator();
        }
        thumbnail = await thumbnailGenerator.generate(file);
      } catch (err) {
        console.warn('生成缩略图失败，将继续上传:', err);
      }
    }

    uploadStatus.value = '正在上传...';
    const result = await uploadAsset(file, thumbnail);
    
    if (result.success) {
      message.success('上传成功！');
      await loadAssets();
    } else {
      message.error('上传失败: ' + result.message);
    }
  } catch (error) {
    message.error('上传失败: ' + error.message);
  } finally {
    uploading.value = false;
    event.target.value = ''; // 重置文件输入
  }
};

const setFilter = (type) => {
  currentFilter.value = type;
};

const loadAssets = async () => {
  try {
    assets.value = await getAssets();
  } catch (error) {
    console.error('加载资产失败:', error);
  }
};

const handleDownload = (asset) => {
  downloadAsset(asset._id, asset.originalName);
};

const handleDelete = async (asset) => {
  // TODO: 可以改为自定义确认对话框，目前暂时保留 confirm
  if (!confirm(`确定要删除 "${asset.originalName}" 吗？`)) {
    return;
  }

  try {
    await deleteAsset(asset._id);
    message.success('删除成功！');
    await loadAssets();
  } catch (error) {
    message.error('删除失败: ' + error.message);
  }
};

const getAssetIcon = (type) => {
  const icons = {
    model: '🎨',
    texture: '🖼️',
    hdri: '🌅',
    effect: '✨'
  };
  return icons[type] || '📦';
};

/**
 * 获取缩略图 URL，优先使用云端 URL
 */
const getThumbnailUrl = (asset) => {
  // 优先使用云端 URL
  if (asset.cloudUrls?.thumbnail) {
    return asset.cloudUrls.thumbnail;
  }
  // 降级到本地路径
  return ASSET_BASE_URL + asset.thumbnail;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

onMounted(() => {
  loadAssets();
});

// 🧹 组件卸载时清理资源，防止内存泄漏
onUnmounted(() => {
  if (thumbnailGenerator) {
    thumbnailGenerator.dispose();
    thumbnailGenerator = null;
  }
});
</script>

<style scoped>
.assets-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
  color: white;
}

.header {
  height: 60px;
  background: #222;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  border-bottom: 1px solid #333;
}

.header h1 {
  font-size: 24px;
  margin: 0;
  flex: 1;
  text-align: center;
}

.home-link {
  color: #aaa;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.home-link:hover {
  color: white;
}

.upload-btn {
  padding: 10px 20px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.upload-btn:hover {
  background: #0052a3;
}

.filter-bar {
  display: flex;
  gap: 10px;
  padding: 20px 30px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
}

.filter-btn {
  padding: 8px 16px;
  background: #2a2a2a;
  color: #aaa;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #333;
  color: white;
}

.filter-btn.active {
  background: #0066cc;
  color: white;
  border-color: #0066cc;
}

.assets-grid {
  flex: 1;
  padding: 30px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  overflow-y: auto;
  align-content: start;
}

.asset-card {
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.asset-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.asset-preview {
  height: 150px;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-icon {
  font-size: 48px;
}

.asset-info {
  padding: 12px;
}

.asset-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #888;
}

.asset-actions {
  display: flex;
  gap: 8px;
  padding: 0 12px 12px;
}

.action-btn {
  flex: 1;
  padding: 6px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}

.download-btn {
  background: #0066cc;
}

.download-btn:hover {
  background: #0052a3;
}

.delete-btn {
  background: #cc0000;
}

.delete-btn:hover {
  background: #a30000;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.empty-state p {
  margin: 10px 0;
  font-size: 16px;
}

.empty-state .hint {
  font-size: 14px;
  color: #888;
}

.upload-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.upload-progress {
  background: #2a2a2a;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #444;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.asset-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
