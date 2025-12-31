<template>
  <div 
    ref="container" 
    class="viewport-container"
    @dragover.prevent
    @drop="onDrop"
  >
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import * as THREE from 'three';
import { SceneManager, PersistenceManager, DBManager } from '@meteor3d/core';
import { API_BASE_URL } from '../config';
import { InputManager } from '../core/InputManager';
import { TransformManager } from '../core/TransformManager';
import { HistoryManager } from '../core/HistoryManager';
import { AddObjectCommand } from '../core/CommandFactory';
import { useEditorStore } from '../stores/editorStore';
import { storeToRefs } from 'pinia';

const container = ref(null);
const canvas = ref(null);
const editorStore = useEditorStore();
const { selectedObject } = storeToRefs(editorStore);
const route = useRoute();

let sceneManager = null;
let inputManager = null;
let transformManager = null;
let historyManager = null;
let persistenceManager = null;
let dbManager = null;

// Expose managers to parent/global if needed, or use a composable/provide-inject
// For now, we attach them to the window for debugging or simple access
window.editor = {};


const onDrop = async (event) => {
  // ... (onDrop implementation remains the same)
  const type = event.dataTransfer.getData('type');
  if (!type) return;

  if (type === 'Environment') {
    const url = event.dataTransfer.getData('url');
    try {
      await sceneManager.loadEnvironment(url);
    } catch (error) {
      console.error('Failed to load environment:', error);
    }
    return;
  }

  let object;

  if (type === 'GLTFModel') {
    // Load GLTF model
    const url = event.dataTransfer.getData('url');
    try {
      object = await persistenceManager.loadGLTFModel(url);
      
      // Calculate drop position
      const rect = canvas.value.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), sceneManager.camera);
      
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      
      if (target) {
        object.position.copy(target);
      }
    } catch (error) {
      console.error('Failed to load GLTF model:', error);
      return;
    }
  } else if (type === 'Tileset') {
    // Load 3D Tiles
    const url = event.dataTransfer.getData('url');
    try {
      object = await persistenceManager.loadTileset(url);
      // 3D Tiles 已自动居中，无需额外位置设置
    } catch (error) {
      console.error('Failed to load 3D Tiles:', error);
      return;
    }
  } else {
    // Simple geometry
    let geometry, material;

    if (type === 'Box') {
      geometry = new THREE.BoxGeometry(1, 1, 1);
      material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    } else if (type === 'Sphere') {
      geometry = new THREE.SphereGeometry(0.5, 32, 32);
      material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    }

    if (geometry && material) {
      object = new THREE.Mesh(geometry, material);
      
      // Calculate drop position
      const rect = canvas.value.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), sceneManager.camera);
      
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      
      if (target) {
        object.position.copy(target);
        object.position.y += 0.5;
      }
    }
  }

  if (object) {
    const command = new AddObjectCommand(sceneManager, object, persistenceManager);
    historyManager.execute(command);
    editorStore.addObject(object);
    editorStore.selectObject(object);
  }
};

onMounted(async () => {
  sceneManager = new SceneManager(canvas.value);
  historyManager = new HistoryManager();
  dbManager = new DBManager({ apiBaseUrl: API_BASE_URL });
  persistenceManager = new PersistenceManager(sceneManager, editorStore, dbManager);
  
  // Initialize IndexedDB and load saved scene
  const sceneId = route.params.sceneId || 'default';
  await persistenceManager.init(sceneId);
  
  // 在加载完成后聚焦相机
  sceneManager.fitCameraToScene();
  
  transformManager = new TransformManager(sceneManager, historyManager, persistenceManager);
  inputManager = new InputManager(sceneManager, editorStore, transformManager);

  window.editor = {
    sceneManager,
    historyManager,
    transformManager,
    inputManager,
    persistenceManager,
    dbManager
  };

  // Watch for selection changes to attach transform controls
  editorStore.$subscribe((mutation, state) => {
    if (state.selectedObject) {
      transformManager.attach(state.selectedObject);
    } else {
      transformManager.detach();
    }
  });

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


onBeforeUnmount(() => {
  // Cleanup if necessary
});
</script>

<style scoped>
.viewport-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
