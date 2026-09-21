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
let loadVersion = 0;

// 提供 Core 实例给子组件（3D 逻辑组件）
provide('sceneContext', {
  getInstance: () => coreInstance,
  get isReady() { return appStore.isSceneReady; }
});

const initScene = async (id) => {
  if (!container.value) return;
  const version = ++loadVersion;
  // loadScene 在 await 前创建画布，切换时也要移除尚未加载完成的旧画布。
  container.value.querySelectorAll('canvas').forEach(canvas => canvas.remove());
  if (window.meteor3d === coreInstance) window.meteor3d = null;
  appStore.setSceneReady(false);
  appStore.setSceneId(null);
  
  // 清理旧实例
  if (coreInstance) {
    coreInstance.dispose();
    coreInstance = null;
  }

  isLoading.value = !!id;
  loadError.value = '';
  if (!id) return;

  try {
    console.log('[SceneWidget] Loading scene:', id);
    const instance = await loadScene({
      sceneId: id,
      serverUrl: ASSET_BASE_URL,
      container: container.value,
      config: {
        dracoPath: '/draco/',
        fitCamera: true,
        autoResize: true
      }
    });
    // 旧请求晚返回时只释放它，不能覆盖最后一次选择。
    if (version !== loadVersion) {
      instance.dispose();
      return;
    }
    coreInstance = instance;
    window.meteor3d = coreInstance

    // 场景加载完成，更新 Store
    appStore.setSceneReady(true, coreInstance);
    appStore.setSceneId(id);
    
    console.log('[SceneWidget] Scene ready, isReady =', coreInstance.isReady);
    
  } catch (e) {
    if (version !== loadVersion) return;
    container.value.querySelectorAll('canvas').forEach(canvas => canvas.remove());
    console.error('[SceneWidget] Failed to load scene:', e);
    loadError.value = e.message || '加载失败';
    appStore.setSceneReady(false);
  } finally {
    if (version === loadVersion) isLoading.value = false;
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
  if (newId !== oldId) {
    console.log('[SceneWidget] Scene ID changed:', oldId, '->', newId);
    sceneId.value = newId || '';
    await initScene(newId);
  }
});

onBeforeUnmount(() => {
  ++loadVersion; // 使卸载前发出的请求失效。
  if (window.meteor3d === coreInstance) window.meteor3d = null;
  appStore.setSceneId(null);
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
