<template>
  <div class="scene-widget-container" ref="container">
    <div v-if="!sceneId" class="placeholder">
      <p>请在右侧属性面板选择场景</p>
    </div>
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { SceneManager, PersistenceManager, DBManager } from '@meteor3d/core';
import { API_BASE_URL } from '../../config';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const container = ref(null);
const canvas = ref(null);
const sceneId = ref(props.data.sceneId || '');

let sceneManager = null;
let persistenceManager = null;
let dbManager = null;

const loadScene = async (id) => {
  if (!sceneManager) return;
  try {
    console.log('Loading scene:', id);
    await persistenceManager.init(id);
  } catch (e) {
    console.error('Failed to load scene:', e);
  }
};

onMounted(async () => {
  // 初始化 3D 引擎
  sceneManager = new SceneManager(canvas.value);
  dbManager = new DBManager({ apiBaseUrl: API_BASE_URL });
  persistenceManager = new PersistenceManager(sceneManager, { 
      addObject: () => {}, 
      clearSelection: () => {} 
  }, dbManager);

  // 如果已经有 sceneId，则加载
  if (props.data.sceneId) {
      sceneId.value = props.data.sceneId;
      await loadScene(sceneId.value);
      // 初始加载也需要聚焦
  }
  
  // 监听尺寸变化重新渲染
  const observer = new ResizeObserver((entries) => {
      if (sceneManager && sceneManager.renderer) {
          const entry = entries[0];
          if (entry && entry.contentRect) {
             const { width, height } = entry.contentRect;
             sceneManager.onWindowResize(width, height);
          } else {
             sceneManager.onWindowResize();
          }
      }
  });
  observer.observe(container.value);
});

// 监听 props 变化 (当属性面板修改 sceneId 时)
watch(() => props.data.sceneId, async (newId) => {
  console.log('Scene ID changed to:', newId);
  if (newId) {
    sceneId.value = newId;
    await loadScene(newId);
  }
});

onBeforeUnmount(() => {
  if (sceneManager) {
    // sceneManager.dispose(); 
  }
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

canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
