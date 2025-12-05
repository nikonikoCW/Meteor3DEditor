<template>
  <div class="scene-widget-container" ref="container">
    <div v-if="!sceneId" class="placeholder">
      <p>请在右侧属性面板选择场景</p>
    </div>
    <canvas v-show="sceneId" ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, markRaw } from 'vue';
import { SceneManager, PersistenceManager, DBManager } from '@meteor3d/core';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const container = ref(null);
const canvas = ref(null);
const sceneId = ref(props.data.sceneId || '');
// const sceneId = ref('e73679d1-df25-402f-bd77-61efea0c5609');

let sceneManager = null;
let persistenceManager = null;
let dbManager = null;

onMounted(async () => {
  // 初始化 3D 引擎
  sceneManager = new SceneManager(canvas.value);
  dbManager = new DBManager();
  persistenceManager = new PersistenceManager(sceneManager, { 
      addObject: () => {}, 
      clearSelection: () => {} 
  }, dbManager);

  // 如果已经有 sceneId，则加载
  if (sceneId.value) {
    await loadScene(sceneId.value);
  }
  
  // 监听尺寸变化重新渲染
  const observer = new ResizeObserver(() => {
      if (sceneManager && sceneManager.renderer) {
          sceneManager.onWindowResize();
      }
  });
  observer.observe(container.value);
});

const loadScene = async (id) => {
  if (!sceneManager) return;
  try {
    console.log('Loading scene:', id);
    await persistenceManager.init(id);
  } catch (e) {
    console.error('Failed to load scene:', e);
  }
};

// 监听 props 变化 (当属性面板修改 sceneId 时)
watch(() => props.data.sceneId, async (newId) => {
  if (newId) {
    sceneId.value = newId;
    await loadScene(newId);
  }
});

onBeforeUnmount(() => {
  // 清理资源
  if (sceneManager) {
    // sceneManager.dispose(); // 假设有 dispose 方法
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
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

