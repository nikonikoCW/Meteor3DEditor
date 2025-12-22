<template>
  <div class="scene-widget-container" ref="container">
    <div v-if="!sceneId" class="placeholder">
      <p>请在右侧属性面板选择场景</p>
    </div>
    <div v-else-if="isLoading" class="placeholder loading">
      <p>⏳ 场景加载中...</p>
    </div>
    <div v-else-if="loadError" class="placeholder error">
      <p>❌ {{ loadError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, provide } from 'vue';
import { loadScene } from '@meteor3d/core';
import { ASSET_BASE_URL } from '../../config';
import { useAppStore } from '../../stores/appStore';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const appStore = useAppStore();
const container = ref(null);
const sceneId = ref(props.data.sceneId || '');
const isLoading = ref(false);
const loadError = ref('');

let coreInstance = null;

// 提供 Core 实例给子组件（3D 逻辑组件）
provide('sceneContext', {
  getInstance: () => coreInstance,
  get isReady() { return appStore.isSceneReady; }
});

const initScene = async (id) => {
  if (!container.value || !id) return;
  
  // 清理旧实例
  if (coreInstance) {
    coreInstance.dispose();
    coreInstance = null;
    appStore.setSceneReady(false);
  }

  isLoading.value = true;
  loadError.value = '';

  try {
    console.log('[SceneWidget] Loading scene:', id);
    coreInstance = await loadScene({
      sceneId: id,
      serverUrl: ASSET_BASE_URL,
      container: container.value,
      config: {
        dracoPath: '/draco/',
        fitCamera: true,
        autoResize: true
      }
    });

    // 场景加载完成，更新 Store
    appStore.setSceneReady(true, coreInstance);
    appStore.setSceneId(id);
    
    console.log('[SceneWidget] Scene ready, isReady =', coreInstance.isReady);
    
  } catch (e) {
    console.error('[SceneWidget] Failed to load scene:', e);
    loadError.value = e.message || '加载失败';
    appStore.setSceneReady(false);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (props.data.sceneId) {
    sceneId.value = props.data.sceneId;
    await initScene(sceneId.value);
  }
});

// 监听 props 变化 (当属性面板修改 sceneId 时)
watch(() => props.data.sceneId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    console.log('[SceneWidget] Scene ID changed:', oldId, '->', newId);
    sceneId.value = newId;
    await initScene(newId);
  }
});

onBeforeUnmount(() => {
  if (coreInstance) {
    coreInstance.dispose();
    coreInstance = null;
  }
  appStore.setSceneReady(false);
});
</script>

<style scoped>
.scene-widget-container {
  width: 100%;
  height: 100%;
  background: #000;
  position: relative;
  overflow: hidden;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  background: #111;
  border: 1px dashed #333;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.placeholder.loading {
  color: #00ccff;
}

.placeholder.error {
  color: #ff6666;
}
</style>
