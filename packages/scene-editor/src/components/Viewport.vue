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
import { VisualPreviewManager } from '../core/VisualPreviewManager';
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
let resizeObserver = null;
let visualPreviewManager = null;

// Expose managers to parent/global if needed, or use a composable/provide-inject
// For now, we attach them to the window for debugging or simple access
window.editor = {};


/**
 * 计算拖放位置
 * 优先检测场景对象表面，fallback 到 Y=0 平面
 */
const getDropPosition = (event) => {
  const rect = canvas.value.getBoundingClientRect();
  const screenPos = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  // 优先检测场景对象
  const intersects = sceneManager.raycastObjects(screenPos, { recursive: true });
  if (intersects.length > 0) {
    return intersects[0].point.clone();
  }

  // Fallback: 与 Y=0 平面相交
  const groundPoint = sceneManager.raycastGround(screenPos);
  return groundPoint || new THREE.Vector3(0, 0, 0);
};

const emitVisualPreviewCount = (count) => {
  window.dispatchEvent(new CustomEvent('visual-preview-count-changed', {
    detail: { count }
  }));
};

const clearVisualPreviews = () => {
  visualPreviewManager?.clear();
};

const createPreviewLabelContent = () => `
  <div class="visual-preview-billboard">
    <div class="visual-preview-billboard__card">
      <div class="visual-preview-billboard__header">
        <span class="visual-preview-billboard__status"></span>
        设备运行信息
        <span class="visual-preview-billboard__code">EQ-001</span>
      </div>
      <div class="visual-preview-billboard__rows">
        <div><span>设备名称</span><strong>一号监测设备</strong></div>
        <div><span>运行状态</span><strong class="is-normal">正常</strong></div>
        <div><span>实时温度</span><strong>36.8 ℃</strong></div>
        <div><span>工作电压</span><strong>220 V</strong></div>
        <div><span>当前功率</span><strong>18.6 kW</strong></div>
        <div><span>累计时长</span><strong>1,286 h</strong></div>
        <div><span>所属区域</span><strong>A 区</strong></div>
        <div><span>更新时间</span><strong>刚刚</strong></div>
      </div>
    </div>
    <div class="visual-preview-billboard__stem"></div>
    <div class="visual-preview-billboard__anchor"></div>
  </div>
`;

const createVisualPreview = (type, event) => {
  if (!visualPreviewManager) return;

  const dropPosition = getDropPosition(event);

  if (type === 'PreviewShield') {
    const scale = 5;
    visualPreviewManager.createEffect('shield', {
      position: {
        x: dropPosition.x,
        y: dropPosition.y + scale,
        z: dropPosition.z
      },
      scale,
      color: '#00ff88',
      rimColor: '#66ffff'
    });
    return;
  }

  if (type === 'PreviewScan') {
    visualPreviewManager.createEffect('scan', {
      position: {
        x: dropPosition.x,
        y: dropPosition.y + 0.05,
        z: dropPosition.z
      },
      scale: 5,
      color: '#00ff88'
    });
    return;
  }

  if (type === 'PreviewLabel') {
    visualPreviewManager.createLabel({
      position: {
        x: dropPosition.x,
        y: dropPosition.y + 0.05,
        z: dropPosition.z
      },
      content: createPreviewLabelContent(),
      style: {
        width: '0',
        height: '0',
        overflow: 'visible',
        pointerEvents: 'none'
      }
    });
  }
};

const onDrop = async (event) => {
  const type = event.dataTransfer.getData('type');
  if (!type) return;

  if (type === 'PreviewShield' || type === 'PreviewScan' || type === 'PreviewLabel') {
    createVisualPreview(type, event);
    return;
  }

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
      object = await persistenceManager.loadGLTFModel(url, {
        assetId: event.dataTransfer.getData('assetId') || null,
        assetVersionId: event.dataTransfer.getData('assetVersionId') || null
      });
      
      // 使用统一的放置位置计算
      const dropPosition = getDropPosition(event);
      object.position.copy(dropPosition);
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
  } else if (type === 'GaussianSplat') {
    const url = event.dataTransfer.getData('url');
    try {
      object = await persistenceManager.loadGaussianSplat(url);

      // 使用统一的放置位置计算
      const dropPosition = getDropPosition(event);
      object.position.copy(dropPosition);
    } catch (error) {
      console.error('Failed to load Gaussian Splat:', error);
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
    } else if (type === 'Cone') {
      geometry = new THREE.ConeGeometry(0.5, 1, 32);
      material = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    } else if (type === 'Cylinder') {
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
      material = new THREE.MeshStandardMaterial({ color: 0x0088ff });
    }

    if (geometry && material) {
      object = new THREE.Mesh(geometry, material);
      
      // 使用统一的放置位置计算
      const dropPosition = getDropPosition(event);
      object.position.copy(dropPosition);
      object.position.y += 0.5; // 基础几何体偏移半个高度
    }
  }

  if (object) {
    const command = new AddObjectCommand(sceneManager, object, persistenceManager, editorStore);
    historyManager.execute(command);
    editorStore.selectObject(object);
  }
};

onMounted(async () => {
  sceneManager = new SceneManager(canvas.value);
  visualPreviewManager = new VisualPreviewManager(sceneManager, emitVisualPreviewCount);
  window.addEventListener('clear-visual-previews', clearVisualPreviews);
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
    visualPreviewManager,
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

  resizeObserver = new ResizeObserver((entries) => {
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
  resizeObserver.observe(container.value);
});


onBeforeUnmount(() => {
  window.removeEventListener('clear-visual-previews', clearVisualPreviews);
  visualPreviewManager?.clear();
  if (inputManager) {
    inputManager.dispose();
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
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
