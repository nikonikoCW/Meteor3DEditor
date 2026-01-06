<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { SceneManager } from '@meteor3d/core-webgpu';
import LibraryPanel from '../components/LibraryPanel.vue';

const canvasRef = ref(null);
let sceneManager = null;

onMounted(() => {
  if (canvasRef.value) {
    if (!navigator.gpu) {
      alert('WebGPU is not supported in this browser.');
      return;
    }

    sceneManager = new SceneManager(canvasRef.value);
    
    window.addEventListener('resize', handleResize);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});

const handleResize = () => {
  if (sceneManager) {
    sceneManager.onWindowResize(window.innerWidth - 260, window.innerHeight); // Adjust for sidebar width
  }
};

const onDrop = (event) => {
  event.preventDefault();
  
  if (!sceneManager) return;

  const type = event.dataTransfer.getData('type');
  const url = event.dataTransfer.getData('url');

  if (type === 'Environment' && url) {
    sceneManager.loadEnvironment(url);
    return;
  }

  if (type === 'Tileset' && url) {
    sceneManager.loadTileset(url);
    return;
  }

  // Calculate drop position in 3D space
  const rect = canvasRef.value.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const position = sceneManager.getGroundIntersection(x, y);

  if (position) {
    if (type === 'GLTFModel' && url) {
      sceneManager.loadModel(url, position);
    } else if (type === 'Box' || type === 'Sphere') {
      sceneManager.addGeometry(type, position);
    }
  }
};

const onDragOver = (event) => {
  event.preventDefault(); // Allow drop
};

const onClick = (event) => {
  if (!sceneManager) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  sceneManager.selectObject(x, y);
};

</script>

<template>
  <div class="editor-layout">
    <div class="sidebar">
      <LibraryPanel />
    </div>
    <div class="main-content">
      <canvas 
        ref="canvasRef" 
        class="webgpu-canvas"
        @drop="onDrop"
        @dragover="onDragOver"
        @click="onClick"
      ></canvas>
    </div>
  </div>
</template>

<style scoped>
.editor-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  height: 100%;
  border-right: 1px solid #333;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  position: relative;
  height: 100%;
}

.webgpu-canvas {
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
}
</style>
