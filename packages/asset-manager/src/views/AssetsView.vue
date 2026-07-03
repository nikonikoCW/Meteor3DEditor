<template>
  <div class="assets-view">
    <div class="header">
      <h1>📦 资产管理</h1>
      <div class="header-actions">
        <button class="upload-btn" @click="triggerFileInput">
          <span>📤</span> 上传资产
        </button>
        <button class="register-btn" @click="showTilesetDialog = true">
          <span>🌐</span> 注册 3D Tiles
        </button>
        <button class="register-btn" @click="showGaussianSplatDialog = true">
          <span>✨</span> 注册高斯泼溅
        </button>
      </div>
      <input 
        ref="fileInput"
        type="file" 
        accept=".glb,.jpg,.jpeg,.png,.hdr,.exr,.zip"
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
      <button 
        :class="['filter-btn', { active: currentFilter === 'tileset' }]"
        @click="setFilter('tileset')"
      >
        3D Tiles
      </button>
      <button 
        :class="['filter-btn', { active: currentFilter === 'gaussian-splat' }]"
        @click="setFilter('gaussian-splat')"
      >
        高斯泼溅
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
            <span>{{ asset.format ? asset.format.toUpperCase() : (asset.type === 'tileset' ? '3DTILES' : '-') }}</span>
            <span v-if="asset.fileSize">{{ formatFileSize(asset.fileSize) }}</span>
            <span v-if="asset.processingStatus && asset.processingStatus !== 'skipped'" 
                  :class="['status-tag', asset.processingStatus]">
              {{ getStatusLabel(asset.processingStatus) }}
            </span>
          </div>
        </div>
        <div class="asset-actions">
          <button 
            v-if="asset.filePath"
            class="action-btn download-btn" 
            @click="handleDownload(asset)"
            title="下载"
          >
            ⬇️
          </button>
          <button 
            v-if="asset.processingStatus === 'failed'"
            class="action-btn retry-btn" 
            @click="handleReprocess(asset)"
            title="重试处理"
          >
            🔄
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
    <!-- 分页组件 -->
    <div class="pagination" v-if="pagination?.total > 0">
      <div class="page-size-selector">
        <span>每页</span>
        <select v-model="pagination.pageSize" @change="onPageSizeChange">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="30">30</option>
        </select>
        <span>条</span>
      </div>
      <button 
        class="page-btn" 
        :disabled="pagination.page <= 1"
        @click="goToPage(pagination.page - 1)"
      >
        ‹ 上一页
      </button>
      <div class="page-numbers" v-if="pagination.totalPages > 1">
        <button 
          v-for="p in visiblePages" 
          :key="p"
          class="page-num"
          :class="{ active: p === pagination.page }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
      </div>
      <span v-else class="page-num active">1</span>
      <button 
        class="page-btn"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goToPage(pagination.page + 1)"
      >
        下一页 ›
      </button>
      <span class="page-info">共 {{ pagination.total }} 个资产</span>
    </div>

    <div v-if="assets.length === 0 && !uploading && pagination.total === 0" class="empty-state">
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

    <!-- 3D Tiles 注册对话框 -->
    <div v-if="showTilesetDialog" class="dialog-overlay" @click.self="showTilesetDialog = false">
      <div class="dialog">
        <h3>🌐 注册 3D Tiles</h3>
        
        <div class="form-group">
          <label>资产名称</label>
          <input 
            type="text" 
            v-model="tilesetForm.name" 
            placeholder="例如：深圳建筑模型"
          />
        </div>
        
        <div class="form-group">
          <label>tileset.json URL</label>
          <input 
            type="text" 
            v-model="tilesetForm.tilesetUrl" 
            placeholder="https://example.com/3dtiles/tileset.json"
          />
        </div>
        
        <div class="dialog-actions">
          <button class="btn-cancel" @click="showTilesetDialog = false">取消</button>
          <button class="btn-primary" @click="handleRegisterTileset" :disabled="!canRegisterTileset">
            确认注册
          </button>
        </div>
      </div>
    </div>

    <!-- 高斯泼溅注册对话框 -->
    <div v-if="showGaussianSplatDialog" class="dialog-overlay" @click.self="showGaussianSplatDialog = false">
      <div class="dialog">
        <h3>✨ 注册高斯泼溅</h3>
        
        <div class="form-group">
          <label>资产名称</label>
          <input 
            type="text" 
            v-model="gaussianSplatForm.name" 
            placeholder="例如：展厅高斯泼溅"
          />
        </div>
        
        <div class="form-group">
          <label>高斯泼溅 URL</label>
          <input 
            type="text" 
            v-model="gaussianSplatForm.gaussianSplatUrl" 
            placeholder="https://example.com/splats/scene.splat"
          />
        </div>
        
        <div class="dialog-actions">
          <button class="btn-cancel" @click="showGaussianSplatDialog = false">取消</button>
          <button class="btn-primary" @click="handleRegisterGaussianSplat" :disabled="!canRegisterGaussianSplat">
            确认注册
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { uploadAsset, getAssets, deleteAsset, downloadAsset, waitForProcessing, reprocessAsset, uploadThumbnail, getAssetsWithoutThumbnail, registerTileset, registerGaussianSplat } from '../services/assetService';
import { ASSET_BASE_URL } from '../config';
import { ThumbnailGenerator } from '../utils/ThumbnailGenerator';
import { message } from '../utils/message';

const assets = ref([]);
const currentFilter = ref(null);
const uploading = ref(false);
const fileInput = ref(null);
const uploadStatus = ref('正在上传...');

// 3D Tiles 注册状态
const showTilesetDialog = ref(false);
const tilesetForm = reactive({
  name: '',
  tilesetUrl: ''
});

// 高斯泼溅注册状态
const showGaussianSplatDialog = ref(false);
const gaussianSplatForm = reactive({
  name: '',
  gaussianSplatUrl: ''
});

// 分页状态
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
});

// ⚡ 性能优化：缩略图生成器单例，避免重复创建导致的资源泄漏
let thumbnailGenerator = null;

// 计算可见的页码
const visiblePages = computed(() => {
  const { page, totalPages } = pagination.value;
  const pages = [];
  const maxVisible = 5;
  
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return pages;
});

const filteredAssets = computed(() => {
  if (currentFilter.value === null) {
    return assets.value;
  }
  return assets.value.filter(asset => asset.type === currentFilter.value);
});

// 3D Tiles 注册表单验证
const canRegisterTileset = computed(() => {
  return tilesetForm.name.trim() && tilesetForm.tilesetUrl.trim();
});

// 高斯泼溅注册表单验证
const canRegisterGaussianSplat = computed(() => {
  return gaussianSplatForm.name.trim() && gaussianSplatForm.gaussianSplatUrl.trim();
});

// 处理 3D Tiles 注册
const handleRegisterTileset = async () => {
  if (!canRegisterTileset.value) return;

  try {
    const result = await registerTileset({
      name: tilesetForm.name.trim(),
      tilesetUrl: tilesetForm.tilesetUrl.trim()
    });

    if (result.success) {
      message.success('3D Tiles 注册成功！');
      showTilesetDialog.value = false;
      // 重置表单
      tilesetForm.name = '';
      tilesetForm.tilesetUrl = '';
      // 刷新列表
      await loadAssets();
    } else {
      message.error('注册失败: ' + result.message);
    }
  } catch (error) {
    message.error('注册失败: ' + error.message);
  }
};

// 处理高斯泼溅注册
const handleRegisterGaussianSplat = async () => {
  if (!canRegisterGaussianSplat.value) return;

  try {
    const result = await registerGaussianSplat({
      name: gaussianSplatForm.name.trim(),
      gaussianSplatUrl: gaussianSplatForm.gaussianSplatUrl.trim()
    });

    if (result.success) {
      message.success('高斯泼溅注册成功！');
      showGaussianSplatDialog.value = false;
      // 重置表单
      gaussianSplatForm.name = '';
      gaussianSplatForm.gaussianSplatUrl = '';
      // 刷新列表
      await loadAssets();
    } else {
      message.error('注册失败: ' + result.message);
    }
  } catch (error) {
    message.error('注册失败: ' + error.message);
  }
};

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
      // 如果是模型，开始轮询处理状态
      if (result.asset.type === 'model') {
        uploadStatus.value = '正在服务器端处理...';
        // 不阻塞 UI，后台轮询
        waitForProcessing(result.asset._id)
          .then(async (statusResult) => {
            message.success(`资产 "${result.asset.name}" 处理完成`);
            
            // 处理完成后，检查是否需要生成缩略图
            if (!result.asset.thumbnail && statusResult.processedFiles?.lod2) {
              await generateAndUploadThumbnail(result.asset._id, statusResult.processedFiles.lod2);
            }
            
            loadAssets(); // 刷新列表显示最新状态
          })
          .catch(err => {
            console.error('处理失败:', err);
            message.error(`资产 "${result.asset.name}" 处理失败: ${err.message}`);
            loadAssets(); // 刷新列表显示失败状态
          });
          
        message.success('上传成功，正在后台处理...');
      } else {
        message.success('上传成功！');
      }
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
  loadAssets(1); // 切换筛选时回到第一页
};

const loadAssets = async (page = pagination.value.page) => {
  try {
    const result = await getAssets(currentFilter.value, page, pagination.value.pageSize);
    assets.value = result.assets || [];
    if (result.pagination) {
      pagination.value = result.pagination;
    }
  } catch (error) {
    console.error('加载资产失败:', error);
  }
};

const goToPage = (page) => {
  if (page < 1 || page > pagination.value.totalPages) return;
  loadAssets(page);
};

const onPageSizeChange = () => {
  loadAssets(1);
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
    model: '\ud83c\udfa8',
    texture: '\ud83d\uddbc\ufe0f',
    hdri: '\ud83c\udf05',
    effect: '\u2728',
    tileset: '\ud83c\udf10',
    'gaussian-splat': '\u2728'
  };
  return icons[type] || '\ud83d\udce6';
};

const getThumbnailUrl = (asset) => {
  return ASSET_BASE_URL + asset.thumbnail;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const getStatusLabel = (status) => {
  const labels = {
    pending: '等待中',
    processing: '处理中',
    ready: '已就绪',
    failed: '失败',
    skipped: '已跳过'
  };
  return labels[status] || status;
};

const handleReprocess = async (asset) => {
  try {
    await reprocessAsset(asset._id);
    message.success('已提交重新处理请求');
    await loadAssets();
    
    // 开始轮询
    waitForProcessing(asset._id)
      .then(() => {
        message.success(`资产 "${asset.name}" 处理完成`);
        loadAssets();
      })
      .catch(err => {
        message.error(`处理失败: ${err.message}`);
        loadAssets();
      });
  } catch (error) {
    message.error('请求失败: ' + error.message);
  }
};

/**
 * 为指定资产生成并上传缩略图
 * @param {string} assetId - 资产 ID
 * @param {string} lod2Path - LOD2 模型路径
 */
const generateAndUploadThumbnail = async (assetId, lod2Path) => {
  try {
    // 初始化缩略图生成器
    if (!thumbnailGenerator) {
      thumbnailGenerator = new ThumbnailGenerator();
    }
    
    // 规范化路径：替换反斜杠为正斜杠，确保以 / 开头
    let normalizedPath = lod2Path.replace(/\\/g, '/');
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }
    
    // 构建完整 URL
    const modelUrl = `${ASSET_BASE_URL}${normalizedPath}`;
    console.log('[缩略图] 加载模型 URL:', modelUrl);
    
    // 从 URL 生成缩略图
    const thumbnailBlob = await thumbnailGenerator.generateFromUrl(modelUrl);
    
    // 上传缩略图
    const result = await uploadThumbnail(assetId, thumbnailBlob);
    
    if (result.success) {
      console.log(`[缩略图] 资产 ${assetId} 缩略图生成成功`);
    } else {
      console.warn(`[缩略图] 资产 ${assetId} 缩略图上传失败:`, result.message);
    }
  } catch (error) {
    console.warn(`[缩略图] 资产 ${assetId} 缩略图生成失败:`, error);
  }
};

/**
 * 检查并补全缺失的缩略图 (静默执行，一次处理 1 个)
 */
const checkMissingThumbnails = async () => {
  try {
    const assetsWithoutThumbnail = await getAssetsWithoutThumbnail();
    
    if (assetsWithoutThumbnail.length === 0) {
      return;
    }
    
    console.log(`[缩略图] 发现 ${assetsWithoutThumbnail.length} 个资产缺少缩略图，开始静默生成...`);
    
    // 逐个处理，避免并发过多
    for (const asset of assetsWithoutThumbnail) {
      await generateAndUploadThumbnail(asset._id, asset.processedFiles.lod2);
      // 每完成一个就刷新列表
      await loadAssets();
    }
  } catch (error) {
    console.warn('[缩略图] 检查缺失缩略图失败:', error);
  }
};

onMounted(() => {
  loadAssets(1);
  // 页面加载后静默检查并生成缺失的缩略图
  checkMissingThumbnails();
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

.status-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #444;
  color: #ccc;
}

.status-tag.processing {
  background: #0066cc;
  color: white;
}

.status-tag.ready {
  background: #28a745;
  color: white;
}

.status-tag.failed {
  background: #dc3545;
  color: white;
}

.retry-btn {
  background: #ffc107;
  color: #000;
}

.retry-btn:hover {
  background: #e0a800;
}

/* 分页样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 30px;
  background: #1a1a1a;
  border-top: 1px solid #333;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #888;
  font-size: 13px;
  margin-right: 20px;
}

.page-size-selector select {
  padding: 6px 10px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 13px;
}

.page-size-selector select:hover {
  border-color: #0066cc;
}

.page-size-selector select:focus {
  outline: none;
  border-color: #0066cc;
}

.page-btn {
  padding: 8px 16px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #444;
  border-color: #0066cc;
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-num {
  width: 36px;
  height: 36px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-num:hover {
  background: #444;
  color: white;
}

.page-num.active {
  background: #0066cc;
  border-color: #0066cc;
  color: white;
}

.page-info {
  color: #666;
  font-size: 13px;
  margin-left: 12px;
}

/* Header Actions */
.header-actions {
  display: flex;
  gap: 12px;
}

.register-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.register-btn:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 24px;
  width: 480px;
  max-width: 90vw;
}

.dialog h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: white;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: #aaa;
  font-size: 13px;
  margin-bottom: 6px;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 10px 12px;
  background: #333;
  border: 1px solid #444;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: #0066cc;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-cancel {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid #444;
  color: #aaa;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel:hover {
  border-color: #666;
  color: white;
}

.btn-primary {
  padding: 10px 20px;
  background: #0066cc;
  border: none;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary:hover:not(:disabled) {
  background: #0077dd;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

