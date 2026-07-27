<template>
  <div class="editor-layout">
    <EditorHeader />
    <div class="main-content">
      <LeftPanel :disabled="!isEditMode" />
      <div class="canvas-wrapper">
        <AppCanvas />
      </div>
      <RightPanel :disabled="!isEditMode" />
    </div>
    
    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">加载中...</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import EditorHeader from '../components/header/EditorHeader.vue';
import LeftPanel from '../components/left/LeftPanel.vue';
import AppCanvas from '../components/canvas/AppCanvas.vue';
import RightPanel from '../components/right/RightPanel.vue';
import { useAppStore } from '../stores/appStore';
import { storeToRefs } from 'pinia';

const appStore = useAppStore();
const {
  isEditMode,
  appId,
  appName,
  canvas,
  widgets,
  isLoading,
  isSaving,
  hasUnsavedChanges
} = storeToRefs(appStore);

const AUTO_SAVE_INTERVAL_MS = 10000;
let autoSaveTimer = null;

const autoSave = async () => {
  if (!appId.value || isLoading.value || isSaving.value || !hasUnsavedChanges.value) return;

  try {
    await appStore.saveApp();
  } catch (error) {
    console.error('自动保存应用失败:', error);
  }
};

// 从 URL 获取 appId
const getAppIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('appId');
};

// 更新 URL 中的 appId
const updateUrlWithAppId = (id) => {
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set('appId', id);
  } else {
    url.searchParams.delete('appId');
  }
  window.history.replaceState({}, '', url);
};

// 页面加载时检查 URL 并加载应用
onMounted(async () => {
  const urlAppId = getAppIdFromUrl();
  if (urlAppId) {
    try {
      await appStore.loadApp(urlAppId);
    } catch (error) {
      console.error('加载应用失败:', error);
      // 加载失败，清除 URL 参数
      updateUrlWithAppId(null);
    }
  }

  autoSaveTimer = window.setInterval(autoSave, AUTO_SAVE_INTERVAL_MS);
});

onUnmounted(() => {
  if (autoSaveTimer !== null) {
    window.clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
});

// 统一跟踪会被持久化的编辑数据，覆盖属性编辑、拖拽、缩放和旋转。
watch(
  () => [appName.value, canvas.value, widgets.value],
  () => {
    if (isEditMode.value && !isLoading.value) {
      hasUnsavedChanges.value = true;
    }
  },
  { deep: true, flush: 'sync' }
);

// 监听 appId 变化，更新 URL
watch(appId, (newId) => {
  updateUrlWithAppId(newId);
});
</script>

<style scoped>
.editor-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
  position: relative;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  background: #0a0a0a;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  color: #42b983;
  font-size: 18px;
}
</style>
