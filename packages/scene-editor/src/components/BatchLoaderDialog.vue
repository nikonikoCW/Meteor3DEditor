<template>
  <div class="batch-loader-overlay" v-if="visible" @click.self="close">
    <div class="batch-loader-dialog">
      <div class="dialog-header">
        <h3>批量导入资产</h3>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="dialog-body">
        <!-- 上半部分：JSON 上传 -->
        <div class="section upload-section">
          <h4>1. 上传位置数据 (JSON)</h4>
          <div class="upload-box" :class="{ 'has-file': items.length > 0 }">
            <input 
              type="file" 
              ref="fileInput" 
              accept=".json" 
              @change="handleFileUpload" 
              style="display: none"
            >
            <div v-if="items.length === 0" class="upload-placeholder">
              <button class="upload-btn" @click="$refs.fileInput.click()">
                📂 选择 JSON 文件
              </button>
              <p class="hint">支持格式: .json (包含 lng, lat, height)</p>
            </div>
            <div v-else class="file-info">
              <span class="success-icon">✓</span>
              <div class="info-text">
                <span class="filename">{{ fileName }}</span>
                <span class="count">包含 {{ items.length }} 个位置点</span>
              </div>
              <button class="reupload-btn" @click="$refs.fileInput.click()">重新上传</button>
            </div>
          </div>
        </div>

        <!-- 下半部分：模型选择 -->
        <div class="section model-section">
          <h4>2. 选择模型资产</h4>
          <div class="model-selector">
            <div 
              v-if="loadingAssets" 
              class="loading-text"
            >
              加载资产库中...
            </div>
            <div v-else class="assets-grid">
              <div 
                v-for="asset in availableAssets" 
                :key="asset._id"
                class="asset-item"
                :class="{ active: selectedAssetId === asset._id }"
                @click="selectedAssetId = asset._id"
                :title="asset.name"
              >
                <div class="asset-icon">📦</div>
                <div class="asset-name">{{ asset.name }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <div class="status-text" v-if="items.length > 0 && selectedAssetId">
          将会在 {{ items.length }} 个位置生成模型
        </div>
        <div class="buttons">
          <button class="btn-cancel" @click="close">取消</button>
          <button 
            class="btn-confirm" 
            @click="handleImport" 
            :disabled="items.length === 0 || !selectedAssetId || loading"
          >
            {{ loading ? '导入中...' : '确认生成' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { getAssets, getAssetUrl } from '../services/assetService';
import { message } from '../utils/message';
import { AddObjectCommand } from '../core/CommandFactory';
import { useEditorStore } from '../stores/editorStore';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible', 'import']);

const items = ref([]);
const fileName = ref('');
const availableAssets = ref([]);
const selectedAssetId = ref(null);
const loading = ref(false);
const loadingAssets = ref(false);

// 获取资产列表
const loadAssets = async () => {
  loadingAssets.value = true;
  try {
    const assets = await getAssets('model');
    availableAssets.value = assets;
  } catch (error) {
    console.error('Failed to load assets:', error);
    message.error('加载资产列表失败');
  } finally {
    loadingAssets.value = false;
  }
};

// 处理文件上传
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  fileName.value = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      if (!Array.isArray(json)) {
        throw new Error('JSON 格式错误: 必须是数组');
      }
      items.value = json;
      message.success(`成功解析 ${json.length} 个数据点`);
    } catch (error) {
      message.error('解析 JSON 失败: ' + error.message);
      items.value = [];
      fileName.value = '';
    }
  };
  reader.readAsText(file);
};

const handleImport = async () => {
  if (!window.editor || !window.editor.sceneManager) {
    message.error('编辑器未初始化');
    return;
  }

  const { sceneManager, persistenceManager, historyManager } = window.editor;
  const editorStore = useEditorStore();

  const gisConfig = sceneManager.gisConfig;
  if (!gisConfig || !gisConfig.enable) {
    message.error('请先在场景设置中启用 GIS 功能并设置中心点');
    return;
  }

  if (!selectedAssetId.value) {
    message.warning('请选择一个模型');
    return;
  }

  const selectedAsset = availableAssets.value.find(a => a._id === selectedAssetId.value);
  if (!selectedAsset) return;

  loading.value = true;
  let successCount = 0;

  try {
    // 获取模型 URL
    const url = getAssetUrl(selectedAsset);

    // 预加载一次模型，确保缓存（可选优化）
    // await persistenceManager.loadGLTFModel(url);

    for (const item of items.value) {
      // 加载模型 (每次都需要 clone，loadGLTFModel 内部应该处理 clone)
      const object = await persistenceManager.loadGLTFModel(url);

      // 转换坐标
      const worldPos = sceneManager.lngLatToWorld(
        item.lng, 
        item.lat, 
        item.height || 0
      );
      object.position.copy(worldPos);

      // 设置旋转
      if (item.rotation && Array.isArray(item.rotation)) {
        object.rotation.set(
          item.rotation[0] * Math.PI / 180,
          item.rotation[1] * Math.PI / 180,
          item.rotation[2] * Math.PI / 180
        );
      }

      // 设置缩放
      if (item.scale && Array.isArray(item.scale)) {
        object.scale.set(item.scale[0], item.scale[1], item.scale[2]);
      }

      // 添加到场景
      const command = new AddObjectCommand(sceneManager, object, persistenceManager);
      historyManager.execute(command);
      editorStore.addObject(object);
      
      successCount++;
    }
    
    message.success(`成功生成 ${successCount} 个模型`);
    close();
    
  } catch (error) {
    console.error('Batch import failed:', error);
    message.error('导入过程中发生错误');
  } finally {
    loading.value = false;
  }
};

const close = () => {
  emit('update:visible', false);
  // 延迟重置数据，避免 UI 闪烁
  setTimeout(() => {
    items.value = [];
    fileName.value = '';
    selectedAssetId.value = null;
  }, 300);
};

watch(() => props.visible, (newVal) => {
  if (newVal && availableAssets.value.length === 0) {
    loadAssets();
  }
});
</script>

<style scoped>
.batch-loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.batch-loader-dialog {
  background: #2a2a2a;
  border-radius: 8px;
  width: 500px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid #444;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #444;
}

.dialog-header h3 {
  margin: 0;
  color: #fff;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.dialog-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section h4 {
  margin: 0 0 10px 0;
  color: #aaa;
  font-size: 13px;
  font-weight: normal;
}

/* Upload Section */
.upload-box {
  border: 2px dashed #444;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  transition: border-color 0.2s;
  background: #252525;
}

.upload-box.has-file {
  border-color: #4CAF50;
  border-style: solid;
  background: rgba(76, 175, 80, 0.05);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-btn {
  background: #0066cc;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.upload-btn:hover {
  background: #0077ee;
}

.hint {
  color: #666;
  font-size: 12px;
  margin: 0;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.success-icon {
  color: #4CAF50;
  font-size: 18px;
}

.info-text {
  flex: 1;
  text-align: left;
  display: flex;
  flex-direction: column;
}

.filename {
  color: #fff;
  font-size: 13px;
  font-weight: bold;
}

.count {
  color: #888;
  font-size: 12px;
}

.reupload-btn {
  background: transparent;
  border: 1px solid #555;
  color: #aaa;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.reupload-btn:hover {
  color: white;
  border-color: #777;
}

/* Model Section */
.model-selector {
  height: 200px;
  background: #222;
  border: 1px solid #333;
  border-radius: 6px;
  overflow-y: auto;
  padding: 10px;
}

.loading-text {
  text-align: center;
  color: #666;
  padding-top: 80px;
  font-size: 13px;
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.asset-item {
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 10px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.asset-item:hover {
  background: #333;
}

.asset-item.active {
  background: #004488;
  border-color: #0066cc;
}

.asset-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

.asset-name {
  font-size: 12px;
  color: #ddd;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Footer */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #444;
}

.status-text {
  color: #888;
  font-size: 12px;
}

.buttons {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background: transparent;
  color: #aaa;
  border: 1px solid #444;
}

.btn-cancel:hover {
  color: #fff;
  border-color: #666;
}

.btn-confirm {
  background: #0066cc;
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: #0077ee;
}

.btn-confirm:disabled {
  background: #444;
  color: #666;
  cursor: not-allowed;
}
</style>
