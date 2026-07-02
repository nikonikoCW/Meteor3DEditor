<template>
  <div class="properties-panel" v-if="selectedObject">
    <h3>属性</h3>
    
    <!-- General -->
    <div class="section">
      <h4>常规 (General)</h4>
      <div class="prop-row">
        <label>名称</label>
        <input type="text" :value="localName" @input="onNameInput">
      </div>
      <div class="prop-row">
        <label>ID</label>
        <input type="text" v-model="selectedObject.uuid" :disabled="true">
      </div>
      <div class="prop-row">
        <label>类型</label>
        <span class="readonly-val">{{ selectedObject.type }}</span>
      </div>
      <div class="prop-row">
        <label>可见性</label>
        <input type="checkbox" v-model="localVisible" @change="onVisibleChange">
      </div>
    </div>

    <!-- Position -->
    <div class="section" :key="'pos-' + forceUpdateKey">
      <h4>位置 (Position)</h4>
      <div class="prop-row">
        <label>X</label>
        <input type="number" v-model.number="selectedObject.position.x" @change="onTransformChange('position')">
      </div>
      <div class="prop-row">
        <label>Y</label>
        <input type="number" v-model.number="selectedObject.position.y" @change="onTransformChange('position')">
      </div>
      <div class="prop-row">
        <label>Z</label>
        <input type="number" v-model.number="selectedObject.position.z" @change="onTransformChange('position')">
      </div>
    </div>

    <!-- Geographic Coordinates -->
    <div class="section" v-if="isGisEnabled" :key="'geo-' + forceUpdateKey">
      <h4>地理坐标 (Lat/Lng/Height)</h4>
      <div class="prop-row">
        <label>经度</label>
        <input type="number" step="0.000001" v-model.number="geoLng" @change="updatePositionFromGeo">
        <span class="unit">°</span>
      </div>
      <div class="prop-row">
        <label>纬度</label>
        <input type="number" step="0.000001" v-model.number="geoLat" @change="updatePositionFromGeo">
        <span class="unit">°</span>
      </div>
      <div class="prop-row">
        <label>高度</label>
        <input type="number" step="0.01" v-model.number="geoHeight" @change="updatePositionFromGeo">
        <span class="unit">m</span>
      </div>
    </div>

    <!-- Rotation -->
    <div class="section" :key="'rot-' + forceUpdateKey">
      <h4>旋转 (Rotation)</h4>
      <div class="prop-row">
        <label>X</label>
        <input type="number" :value="toDegrees(selectedObject.rotation.x)" @change="e => updateRotation('x', e.target.value)">
      </div>
      <div class="prop-row">
        <label>Y</label>
        <input type="number" :value="toDegrees(selectedObject.rotation.y)" @change="e => updateRotation('y', e.target.value)">
      </div>
      <div class="prop-row">
        <label>Z</label>
        <input type="number" :value="toDegrees(selectedObject.rotation.z)" @change="e => updateRotation('z', e.target.value)">
      </div>
    </div>

    <!-- Scale -->
    <div class="section" :key="'scale-' + forceUpdateKey">
      <h4>缩放 (Scale)</h4>
      <div class="prop-row">
        <label>X</label>
        <input type="number" v-model.number="selectedObject.scale.x" @change="onTransformChange('scale')">
      </div>
      <div class="prop-row">
        <label>Y</label>
        <input type="number" v-model.number="selectedObject.scale.y" @change="onTransformChange('scale')">
      </div>
      <div class="prop-row">
        <label>Z</label>
        <input type="number" v-model.number="selectedObject.scale.z" @change="onTransformChange('scale')">
      </div>
    </div>

    <div class="debug-info">
        <small>UUID: {{ selectedObject.uuid.slice(0, 8) }}...</small>
    </div>
  </div>
  <div class="properties-panel" v-else>
    <p class="empty-msg">未选择对象</p>
  </div>
</template>

<script setup>
import { useEditorStore } from '../stores/editorStore';
import { storeToRefs } from 'pinia';
import { TransformCommand } from '../core/CommandFactory';
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';

const editorStore = useEditorStore();
const { selectedObject } = storeToRefs(editorStore);

// 强制更新 key（用于触发 Vue 重新读取 Three.js 对象属性）
const forceUpdateKey = ref(0);

// Local reactive ref for object name (markRaw 对象属性无法被 Vue 追踪，需要本地 ref 中转)
const localName = ref('');
const localVisible = ref(true);

// Sync local name when selected object changes
watch(selectedObject, (obj) => {
  localName.value = obj?.name || '';
  localVisible.value = obj?.visible !== false;
}, { immediate: true });

// Handle name input — 实时同步到 Three.js 对象并通知场景树
const onNameInput = (event) => {
  const val = event.target.value;
  localName.value = val;
  if (selectedObject.value) {
    selectedObject.value.name = val;
    editorStore.notifyTreeUpdate();
  }
};

// Geographic coordinate refs
const geoLng = ref(null);
const geoLat = ref(null);
const geoHeight = ref(null);

// Check if GIS is enabled
const isGisEnabled = computed(() => {
  const sm = window.editor?.sceneManager;
  return sm && sm.gisProjection !== null;
});

// Sync geographic coordinates from current position
const syncGeoFromPosition = () => {
  if (!selectedObject.value || !isGisEnabled.value) {
    geoLng.value = null;
    geoLat.value = null;
    geoHeight.value = null;
    return;
  }
  const sm = window.editor?.sceneManager;
  if (!sm || !sm.worldToLngLat) return;
  const geo = sm.worldToLngLat(selectedObject.value.position);
  if (geo) {
    geoLng.value = parseFloat(geo.lng.toFixed(6));
    geoLat.value = parseFloat(geo.lat.toFixed(6));
    geoHeight.value = parseFloat(geo.height.toFixed(2));
  }
};

// Sync geo coords when selected object or its position changes
watch(
  () => selectedObject.value?.position,
  () => {
    syncGeoFromPosition();
  },
  { deep: true, immediate: true }
);

watch(selectedObject, () => {
  syncGeoFromPosition();
});

// 监听 TransformManager 的变换事件
const handleTransformChanged = (event) => {
  // 如果变换的对象是当前选中的对象，触发强制更新
  if (event.detail?.object === selectedObject.value) {
    forceUpdateKey.value++;
    syncGeoFromPosition();
  }
};

onMounted(() => {
  window.addEventListener('transform-changed', handleTransformChanged);
});

onBeforeUnmount(() => {
  window.removeEventListener('transform-changed', handleTransformChanged);
});

// Update XYZ position from geographic coordinates
const updatePositionFromGeo = () => {
  const sm = window.editor?.sceneManager;
  if (!sm || !sm.lngLatToWorld || !selectedObject.value) return;
  if (geoLng.value === null || geoLat.value === null || geoHeight.value === null) return;
  
  const newPos = sm.lngLatToWorld(geoLng.value, geoLat.value, geoHeight.value);
  selectedObject.value.position.copy(newPos);
  selectedObject.value.userData.positionModified = true;
  
  if (window.editor?.transformManager) {
    window.editor.transformManager.updateSelection();
  }
};

// Helper to convert radians to degrees
const toDegrees = (radians) => {
  return Math.round(radians * (180 / Math.PI) * 100) / 100;
};

// Helper to convert degrees to radians
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Handle rotation updates
const updateRotation = (axis, value) => {
  if (!selectedObject.value) return;
  
  const radians = toRadians(parseFloat(value));
  selectedObject.value.rotation[axis] = radians;
  onTransformChange('rotation');
};

// Handle generic transform changes
const onTransformChange = (type) => {
  if (!selectedObject.value) return;

  // Mark as modified for persistence
  if (type === 'position') selectedObject.value.userData.positionModified = true;
  if (type === 'rotation') selectedObject.value.userData.rotationModified = true;
  if (type === 'scale') selectedObject.value.userData.scaleModified = true;

  // Trigger scene update
  if (window.editor && window.editor.transformManager) {
      window.editor.transformManager.updateSelection();
  }
};

const onVisibleChange = () => {
    if (!selectedObject.value) return;
    selectedObject.value.visible = localVisible.value;
    selectedObject.value.userData.visibleModified = true;
    // 通知场景树刷新
    editorStore.notifyTreeUpdate();
};
</script>

<style scoped>
.properties-panel {
  width: 280px;
  background: #222;
  color: white;
  padding: 15px;
  overflow-y: auto;
  border-left: 1px solid #333;
}

h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #fff;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

.section {
  margin-bottom: 20px;
  background: #2a2a2a;
  padding: 10px;
  border-radius: 4px;
}

h4 {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #888;
  font-weight: normal;
  text-transform: uppercase;
}

.prop-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.prop-row:last-child {
  margin-bottom: 0;
}

label {
  width: 60px;
  font-size: 12px;
  color: #aaa;
}

input {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}

input:focus {
  border-color: #0066cc;
  outline: none;
}

input[type="color"] {
  padding: 0;
  height: 24px;
  cursor: pointer;
}

.empty-msg {
  color: #666;
  text-align: center;
  margin-top: 40px;
  font-size: 13px;
}

.unit {
  margin-left: 4px;
  font-size: 12px;
  color: #888;
  min-width: 16px;
}

.debug-info {
    margin-top: 20px;
    color: #444;
    font-size: 10px;
    text-align: center;
}
</style>
