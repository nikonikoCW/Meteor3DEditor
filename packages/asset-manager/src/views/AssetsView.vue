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
        accept=".gltf,.glb,.jpg,.jpeg,.png,.hdr,.zip"
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
          <img v-if="getPreviewUrl(asset)" :src="getPreviewUrl(asset)" :alt="asset.name" class="asset-thumb">
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
            <span v-if="isCloudUploaded(asset)" class="status-tag cloud-uploaded">
              已上云
            </span>
          </div>
        </div>
        <div class="asset-actions">
          <button
            v-if="asset.filePath"
            class="action-btn download-btn"
            @click.stop="handleDownload(asset)"
            title="下载"
          >
            ⬇️
          </button>
          <button
            v-if="canUploadCloud(asset) && !isCloudUploaded(asset)"
            class="action-btn cloud-btn"
            @click.stop="handleCloudUpload(asset)"
            title="上云"
          >
            上云
          </button>
          <button
            v-if="asset.processingStatus === 'failed'"
            class="action-btn retry-btn"
            @click.stop="handleReprocess(asset)"
            title="重试处理"
          >
            🔄
          </button>
          <button
            class="action-btn delete-btn"
            @click.stop="handleDelete(asset)"
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


    <!-- 上云弹窗 -->
    <div v-if="showAssetDialog" class="dialog-overlay" @click.self="closeAssetDialog">
      <div class="dialog cloud-dialog">
        <h3>上云确认</h3>
        <div class="cloud-dialog-body">
          <div class="cloud-file-name" :title="selectedAsset?.originalName">
            {{ selectedAsset?.originalName }}
          </div>
          <div
            class="slide-confirm"
            :class="{ confirmed: cloudSlideConfirmed }"
            :style="{ '--slide-progress': `${cloudSlideValue}%` }"
          >
            <div class="slide-fill"></div>
            <div class="slide-shine"></div>
            <div class="slide-thumb" :style="{ left: `calc(4px + ${cloudSlideValue}% - ${cloudSlideValue * 0.52}px)` }">
              <span>{{ cloudSlideConfirmed ? '✓' : '›' }}</span>
            </div>
            <span class="slide-label">
              {{ cloudSlideConfirmed ? '已确认' : '向右滑动确认上云' }}
            </span>
            <input
              class="slide-range"
              type="range"
              min="0"
              max="100"
              v-model.number="cloudSlideValue"
              :disabled="cloudSlideConfirmed"
              aria-label="向右滑动确认上云"
              @input="handleCloudSlideInput"
              @change="handleCloudSlideRelease"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteDialog" class="dialog-overlay" @click.self="closeDeleteDialog">
      <div class="dialog delete-dialog">
        <h3>删除确认</h3>
        <p class="delete-warning">删除后本地文件和云端文件都会被清理，请输入密码确认。</p>
        <div class="delete-file-name" :title="deleteTargetAsset?.originalName">
          {{ deleteTargetAsset?.originalName }}
        </div>
        <div class="form-group">
          <label>验证密码</label>
          <input
            type="password"
            v-model="deletePassword"
            placeholder="请输入删除密码"
            autocomplete="off"
            @keyup.enter="confirmDeleteAsset"
          />
          <p v-if="deletePasswordError" class="delete-error">{{ deletePasswordError }}</p>
        </div>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="closeDeleteDialog" :disabled="deleteSubmitting">取消</button>
          <button class="btn-primary danger" @click="confirmDeleteAsset" :disabled="deleteSubmitting">
            {{ deleteSubmitting ? '删除中...' : '确认删除' }}
          </button>
        </div>
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
import { uploadAsset, getAssets, deleteAsset, downloadAsset, waitForProcessing, reprocessAsset, uploadThumbnail, getAssetsWithoutThumbnail, registerTileset, registerGaussianSplat, uploadAssetToCloud } from '../services/assetService';
import { ASSET_BASE_URL } from '../config';
import { ThumbnailGenerator } from '../utils/ThumbnailGenerator';
import { message } from '../utils/message';

const assets = ref([]);
const currentFilter = ref(null);
const uploading = ref(false);
const fileInput = ref(null);
const uploadStatus = ref('正在上传...');
const showAssetDialog = ref(false);
const selectedAsset = ref(null);
const cloudSlideValue = ref(0);
const cloudSlideConfirmed = ref(false);
const DELETE_CONFIRM_PASSWORD = '123456';
const showDeleteDialog = ref(false);
const deleteTargetAsset = ref(null);
const deletePassword = ref('');
const deletePasswordError = ref('');
const deleteSubmitting = ref(false);

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


const resetCloudSlide = () => {
  cloudSlideValue.value = 0;
  cloudSlideConfirmed.value = false;
};

const openAssetDialog = (asset) => {
  selectedAsset.value = asset;
  resetCloudSlide();
  showAssetDialog.value = true;
};

const closeAssetDialog = () => {
  showAssetDialog.value = false;
  selectedAsset.value = null;
  resetCloudSlide();
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

const handleDelete = (asset) => {
  deleteTargetAsset.value = asset;
  deletePassword.value = '';
  deletePasswordError.value = '';
  showDeleteDialog.value = true;
};

const closeDeleteDialog = () => {
  if (deleteSubmitting.value) return;
  showDeleteDialog.value = false;
  deleteTargetAsset.value = null;
  deletePassword.value = '';
  deletePasswordError.value = '';
};

const confirmDeleteAsset = async () => {
  if (!deleteTargetAsset.value?._id || deleteSubmitting.value) return;

  if (deletePassword.value !== DELETE_CONFIRM_PASSWORD) {
    deletePasswordError.value = '密码错误，请重新输入';
    return;
  }

  deleteSubmitting.value = true;
  try {
    await deleteAsset(deleteTargetAsset.value._id);
    message.success('删除成功');
    showDeleteDialog.value = false;
    deleteTargetAsset.value = null;
    deletePassword.value = '';
    deletePasswordError.value = '';
    await loadAssets();
  } catch (error) {
    message.error('删除失败: ' + error.message);
  } finally {
    deleteSubmitting.value = false;
  }
};
const handleCloudUpload = (asset) => {
  openAssetDialog(asset);
};


const handleCloudSlideInput = () => {
  if (cloudSlideValue.value >= 96 && !cloudSlideConfirmed.value) {
    const asset = selectedAsset.value;
    cloudSlideValue.value = 100;
    cloudSlideConfirmed.value = true;

    if (!asset?._id) {
      message.error('资产信息异常，无法上云');
      return;
    }

    message.success(`资产 "${asset.originalName || ''}" 已确认，正在后台上云...`);
    window.setTimeout(() => {
      closeAssetDialog();
    }, 500);

    uploadAssetToCloud(asset._id)
      .then((result) => {
        if (result.asset) {
          assets.value = assets.value.map(item => item._id === result.asset._id ? result.asset : item);
        } else {
          loadAssets();
        }
        message.success(`资产 "${asset.originalName || ''}" 上云完成`);
      })
      .catch((error) => {
        message.error(`资产上云失败: ${error.message}`);
      });
  }
};

const handleCloudSlideRelease = () => {
  if (!cloudSlideConfirmed.value) {
    cloudSlideValue.value = 0;
  }
};
const isCloudUploaded = (asset) => {
  return Boolean(
    asset?.cloudOriginalUrl ||
    asset?.cloudThumbnailUrl ||
    asset?.cloudUrls?.file ||
    asset?.cloudUrls?.original ||
    asset?.cloudUrls?.thumbnail ||
    asset?.cloudUrls?.compressed
  );
};
const canUploadCloud = (asset) => {
  if (!asset?.filePath) return false;

  const format = asset.format?.toLowerCase();
  const uploadableFormats = ['gltf', 'glb', 'zip', 'hdr', 'jpg', 'jpeg', 'png'];
  const uploadableTypes = ['model', 'texture', 'hdri'];

  return uploadableFormats.includes(format) || uploadableTypes.includes(asset.type);
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

const toAssetPreviewUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${ASSET_BASE_URL}${normalizedPath}`;
};

const isImageAsset = (asset) => {
  const format = asset?.format?.toLowerCase();
  return asset?.type === 'texture' || ['jpg', 'jpeg', 'png'].includes(format);
};

const getCloudPreviewUrl = (asset) => {
  return toAssetPreviewUrl(
    asset?.cloudUrls?.thumbnail ||
    asset?.cloudThumbnailUrl ||
    asset?.cloudUrls?.file ||
    asset?.cloudUrls?.original ||
    asset?.cloudOriginalUrl
  );
};

const getThumbnailUrl = (asset) => {
  return toAssetPreviewUrl(asset?.cloudUrls?.thumbnail || asset?.cloudThumbnailUrl || asset?.thumbnail);
};

const getPreviewUrl = (asset) => {
  if (isImageAsset(asset)) {
    return getCloudPreviewUrl(asset) || toAssetPreviewUrl(asset?.thumbnail || asset?.url);
  }

  return getThumbnailUrl(asset);
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
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  padding: 0 10px 10px;
}

.action-btn {
  min-width: 28px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.download-btn {
  background: #264f78;
}

.download-btn:hover {
  background: #31699d;
}

.cloud-btn {
  background: #285d45;
  min-width: 44px;
}

.cloud-btn:hover {
  background: #347a5a;
}

.delete-btn {
  background: #7a2d2d;
}

.delete-btn:hover {
  background: #9d3838;
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

.status-tag.cloud-uploaded {
  background: #1f7a8c;
  color: white;
}

.status-tag.failed {
  background: #dc3545;
  color: white;
}

.retry-btn {
  background: #72591f;
  color: #fff;
}

.retry-btn:hover {
  background: #967323;
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


.cloud-dialog {
  min-height: 260px;
}

.cloud-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.cloud-file-name {
  min-height: 38px;
  padding: 10px 12px;
  background: #333;
  border: 1px solid #444;
  border-radius: 6px;
  color: #ddd;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slide-confirm {
  --slide-progress: 0%;
  position: relative;
  height: 56px;
  border-radius: 28px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0)),
    #181c22;
  border: 1px solid #3f4a56;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -10px 24px rgba(0, 0, 0, 0.22),
    0 12px 30px rgba(0, 0, 0, 0.22);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.slide-confirm::before {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 23px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  pointer-events: none;
  z-index: 1;
}

.slide-confirm.confirmed {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
    #11291d;
  border-color: #39d98a;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 0 0 1px rgba(57, 217, 138, 0.18),
    0 14px 34px rgba(16, 185, 129, 0.18);
}

.slide-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--slide-progress);
  min-width: 56px;
  background:
    linear-gradient(90deg, #1f7a8c, #24b47e 70%, #39d98a);
  border-radius: inherit;
  box-shadow: 0 0 24px rgba(36, 180, 126, 0.32);
  transition: width 0.16s ease, background 0.2s ease;
}

.slide-confirm.confirmed .slide-fill {
  background: linear-gradient(90deg, #18a058, #39d98a);
}

.slide-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 18%,
    rgba(255, 255, 255, 0.14) 34%,
    transparent 50%
  );
  background-size: 220% 100%;
  opacity: 0.55;
  animation: slide-confirm-shine 2.2s ease-in-out infinite;
  pointer-events: none;
}

.slide-confirm.confirmed .slide-shine {
  opacity: 0;
  animation: none;
}

.slide-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 35% 28%, #ffffff, #eaf7f2 58%, #cbeee0);
  color: #0f766e;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  transition: left 0.16s ease, transform 0.16s ease, color 0.2s ease, box-shadow 0.2s ease;
  pointer-events: none;
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.slide-thumb span {
  display: block;
  transform: translateY(-1px);
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
}

.slide-confirm:has(.slide-range:active) .slide-thumb {
  transform: scale(0.96);
  box-shadow:
    0 7px 18px rgba(0, 0, 0, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.slide-confirm.confirmed .slide-thumb {
  color: #0f8f58;
  background: #ffffff;
}

.slide-label {
  position: absolute;
  inset: 0 58px 0 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d8e2ea;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
  pointer-events: none;
  z-index: 2;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.slide-confirm.confirmed .slide-label {
  color: #effff7;
}

.slide-range {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: grab;
  z-index: 4;
}

.slide-confirm:has(.slide-range:focus-visible) {
  border-color: #5eead4;
  box-shadow:
    0 0 0 3px rgba(94, 234, 212, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 12px 30px rgba(0, 0, 0, 0.22);
}

.slide-range:active {
  cursor: grabbing;
}

@keyframes slide-confirm-shine {
  0% {
    background-position: 135% 0;
  }
  55%,
  100% {
    background-position: -80% 0;
  }
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

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 10px 12px;
  background: #333;
  border: 1px solid #444;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus,
.form-group input[type="password"]:focus {
  outline: none;
  border-color: #0066cc;
}

.delete-dialog {
  width: 420px;
}

.delete-warning {
  margin: 0 0 14px;
  color: #f6ad55;
  font-size: 13px;
  line-height: 1.6;
}

.delete-file-name {
  min-height: 38px;
  padding: 10px 12px;
  margin-bottom: 16px;
  background: #333;
  border: 1px solid #4a3232;
  border-radius: 6px;
  color: #eee;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-error {
  margin: 8px 0 0;
  color: #ff7b7b;
  font-size: 12px;
}

.btn-primary.danger {
  background: #dc3545;
}

.btn-primary.danger:hover:not(:disabled) {
  background: #e54857;
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

