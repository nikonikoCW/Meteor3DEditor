<template>
  <div 
    ref="container" 
    class="viewport-container"
    @dragover.prevent
    @drop="onDrop"
  >
    <canvas ref="canvas"></canvas>

    <div v-if="loadingState.visible" class="scene-loading-overlay">
      <div class="scene-loading-card" :class="`is-${loadingState.status}`">
        <div v-if="loadingState.status === 'loading'" class="loading-spinner"></div>
        <h3>{{ loadingTitle }}</h3>
        <div class="loading-progress-track">
          <div class="loading-progress-bar" :class="{ 'has-error': loadingState.status === 'degraded' || loadingState.status === 'error' }" :style="{ width: `${loadingState.percent}%` }"></div>
        </div>
        <div class="loading-progress-summary">
          <span>{{ loadingState.processedCount }} / {{ loadingState.totalCount }} 个对象</span>
          <strong>{{ loadingState.percent }}%</strong>
        </div>
        <p v-if="loadingState.currentName && loadingState.status === 'loading'" class="loading-current-object">正在加载：{{ loadingState.currentName }}</p>
        <p v-if="loadingState.message" class="loading-message">{{ loadingState.message }}</p>
        <button v-if="loadingState.status === 'degraded'" class="loading-dismiss-btn" type="button" @click="acceptAndViewLoadedContent">确认并查看已加载内容</button>
        <button v-else-if="loadingState.status === 'error'" class="loading-dismiss-btn" type="button" @click="loadingState.visible = false">关闭</button>
      </div>
    </div>
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

const loadingState = ref({
  visible: true,
  status: 'loading',
  percent: 0,
  processedCount: 0,
  totalCount: 0,
  currentName: '',
  message: '正在读取场景数据...'
});
const loadingTitle = ref('正在加载场景');

let sceneManager = null;
let inputManager = null;
let transformManager = null;
let historyManager = null;
let persistenceManager = null;
let dbManager = null;
let resizeObserver = null;
let visualPreviewManager = null;
let unsubscribeEditorStore = null;
let isUnmounted = false;
let loadingHideTimer = null;

const OUTLINE_EXCLUDED_MODEL_TYPES = new Set(['Tileset', 'GaussianSplat']);

const supportsSelectionOutline = (object) => {
  let current = object;
  while (current) {
    if (OUTLINE_EXCLUDED_MODEL_TYPES.has(current.userData?.modelType)) return false;
    current = current.parent;
  }
  return true;
};

const handleLoadProgress = (progress) => {
  if (isUnmounted) return;

  loadingState.value.visible = true;
  loadingState.value.percent = progress.percent ?? loadingState.value.percent;
  loadingState.value.processedCount = progress.processedCount ?? 0;
  loadingState.value.totalCount = progress.totalCount ?? 0;
  loadingState.value.currentName = progress.currentObject?.name || '';

  if (progress.phase === 'complete') {
    if (progress.status === 'ready') {
      loadingTitle.value = '场景加载完成';
      loadingState.value.status = 'ready';
      loadingState.value.message = `已成功加载 ${progress.successCount} 个对象`;
    } else {
      loadingTitle.value = '场景未完整加载';
      loadingState.value.status = 'degraded';
      loadingState.value.message = `成功 ${progress.successCount} 个，失败 ${progress.failedCount} 个；自动保存已禁用`;
    }
    return;
  }

  loadingTitle.value = '正在加载场景';
  loadingState.value.status = 'loading';
  loadingState.value.message = progress.totalCount > 0 ? '' : '场景中没有对象';
};

const acceptAndViewLoadedContent = () => {
  if (loadingState.value.status !== 'degraded') return;
  editorStore.allowPartialSceneSave();
  loadingState.value.visible = false;
};

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

  if (type === 'PreviewFire') {
    visualPreviewManager.createEffect('fire',{
      position: {
        x: dropPosition.x,
        y: dropPosition.y + 0.05,
        z: dropPosition.z
      }
    });
  }
};

const onDrop = async (event) => {
  const type = event.dataTransfer.getData('type');
  if (!type) return;

  if (type === 'PreviewShield' || type === 'PreviewScan' || type === 'PreviewLabel' || type === 'PreviewFire') {
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
  editorStore.resetPartialSavePermission();
  sceneManager = new SceneManager(canvas.value);
  visualPreviewManager = new VisualPreviewManager(sceneManager, emitVisualPreviewCount);
  window.addEventListener('clear-visual-previews', clearVisualPreviews);
  historyManager = new HistoryManager();
  dbManager = new DBManager({ apiBaseUrl: API_BASE_URL });
  persistenceManager = new PersistenceManager(sceneManager, editorStore, dbManager);

  const sceneId = route.params.sceneId || 'default';
  let loadResult = null;

  try {
    loadResult = await persistenceManager.init(sceneId, {
      onProgress: handleLoadProgress
    });
  } catch (error) {
    if (isUnmounted) return;
    console.error('场景加载失败:', error);
    loadingTitle.value = '场景加载失败';
    loadingState.value.status = 'error';
    loadingState.value.message = error.message || '无法读取场景数据';
    return;
  }

  if (isUnmounted) {
    persistenceManager.dispose();
    sceneManager.dispose();
    return;
  }

  if (loadResult?.complete) {
    loadingHideTimer = window.setTimeout(() => {
      loadingState.value.visible = false;
      loadingHideTimer = null;
    }, 500);
  }

  const initialView = editorStore.sceneMetadata.initialView;
  if (initialView) {
    await sceneManager.setView({
      position: initialView.position,
      target: initialView.target,
      duration: 0
    });
  }

  transformManager = new TransformManager(sceneManager, historyManager, persistenceManager);
  inputManager = new InputManager(sceneManager, editorStore, transformManager);

  window.editor = {
    sceneManager,
    historyManager,
    transformManager,
    inputManager,
    visualPreviewManager,
    persistenceManager,
    dbManager,
    loadResult
  };

  unsubscribeEditorStore = editorStore.$subscribe((mutation, state) => {
    sceneManager.disableOutline();

    if (state.selectedObject) {
      transformManager.attach(state.selectedObject);
      if (supportsSelectionOutline(state.selectedObject)) {
        const outlineId = state.selectedObject.userData?.bid || state.selectedObject.uuid;
        sceneManager.enableOutline(outlineId);
      }
    } else {
      transformManager.detach();
    }
  });

  resizeObserver = new ResizeObserver((entries) => {
    if (!sceneManager?.renderer) return;
    const entry = entries[0];
    if (entry?.contentRect) {
      const { width, height } = entry.contentRect;
      sceneManager.onWindowResize(width, height);
    } else {
      sceneManager.onWindowResize();
    }
  });
  resizeObserver.observe(container.value);
});


onBeforeUnmount(() => {
  isUnmounted = true;
  window.removeEventListener('clear-visual-previews', clearVisualPreviews);
  if (loadingHideTimer !== null) {
    window.clearTimeout(loadingHideTimer);
    loadingHideTimer = null;
  }

  unsubscribeEditorStore?.();
  unsubscribeEditorStore = null;
  resizeObserver?.disconnect();
  resizeObserver = null;

  inputManager?.dispose();
  transformManager?.dispose();
  visualPreviewManager?.clear();
  editorStore.clearSelection();
  editorStore.resetObjects();

  persistenceManager?.dispose();
  sceneManager?.dispose();

  if (window.editor?.sceneManager === sceneManager) {
    window.editor = {};
  }

  inputManager = null;
  transformManager = null;
  visualPreviewManager = null;
  historyManager = null;
  persistenceManager = null;
  dbManager = null;
  sceneManager = null;
});
</script>

<style scoped>
.viewport-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scene-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 12, 18, 0.82);
  backdrop-filter: blur(4px);
}

.scene-loading-card {
  width: min(440px, calc(100% - 48px));
  padding: 28px;
  color: #e8f4ff;
  background: rgba(20, 29, 40, 0.96);
  border: 1px solid rgba(74, 167, 255, 0.35);
  border-radius: 12px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
}

.scene-loading-card h3 {
  margin: 0 0 20px;
  text-align: center;
  font-size: 18px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  margin: 0 auto 14px;
  border: 3px solid rgba(74, 167, 255, 0.2);
  border-top-color: #4aa7ff;
  border-radius: 50%;
  animation: scene-loading-spin 0.8s linear infinite;
}

.loading-progress-track {
  width: 100%;
  height: 10px;
  overflow: hidden;
  background: #0d1620;
  border-radius: 999px;
}

.loading-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #1976d2, #55c7ff);
  border-radius: inherit;
  transition: width 0.25s ease;
}

.loading-progress-bar.has-error {
  background: linear-gradient(90deg, #c77700, #ffb648);
}

.loading-progress-summary {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  color: #a9bfd2;
  font-size: 13px;
}

.loading-progress-summary strong {
  color: #fff;
}

.loading-current-object,
.loading-message {
  margin: 16px 0 0;
  overflow: hidden;
  color: #c8d9e8;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-message {
  color: #8fa8bd;
  font-size: 13px;
}

.loading-dismiss-btn {
  display: block;
  margin: 20px auto 0;
  padding: 8px 18px;
  color: #fff;
  background: #b66b00;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

@keyframes scene-loading-spin {
  to { transform: rotate(360deg); }
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
