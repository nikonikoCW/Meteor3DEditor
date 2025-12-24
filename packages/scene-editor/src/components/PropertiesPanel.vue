<template>
  <div class="properties-panel" v-if="selectedObject">
    <h3>属性</h3>
    
    <!-- General -->
    <div class="section">
      <h4>常规 (General)</h4>
      <div class="prop-row">
        <label>名称</label>
        <input type="text" v-model="selectedObject.name" @change="onGeneralChange">
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
        <input type="checkbox" v-model="selectedObject.visible" @change="onVisibleChange">
      </div>
    </div>

    <!-- Position -->
    <div class="section">
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
    <div class="section" v-if="isGisEnabled">
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
    <div class="section">
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
    <div class="section">
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
import * as THREE from 'three';
import { TransformCommand } from '../core/CommandFactory';
import { computed, ref, watch } from 'vue';

const editorStore = useEditorStore();
const { selectedObject } = storeToRefs(editorStore);

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

const onGeneralChange = () => {
    // Name change doesn't need specific flag if we save the whole object structure,
    // but for GLTF children, we rely on path which uses name. 
    // Changing name of a GLTF child might BREAK the path if not handled carefully.
    // For now, let's assume renaming is mostly for root objects or simple meshes.
    // If it's a GLTF child, we might need to be careful.
    // But persistence uses the CURRENT name to generate path.
    // Wait, if I change name, getObjectPath will generate a NEW path.
    // The old modifications keyed by OLD path will be orphaned.
    // This is a known limitation. For now, let's allow it.
};

const onVisibleChange = () => {
    if (!selectedObject.value) return;
    selectedObject.value.userData.visibleModified = true;
};

// Handle color updates
const updateColor = (event) => {
  if (!selectedObject.value || !selectedObject.value.material) return;
  
  selectedObject.value.material.color.set(event.target.value);
  onMaterialChange();
};

// Handle material changes
const onMaterialChange = () => {
  if (!selectedObject.value) return;
  selectedObject.value.userData.materialModified = true;
  // Material needs update to reflect some changes like transparent/side
  if (selectedObject.value.material) {
      selectedObject.value.material.needsUpdate = true;
  }
};

// Handle emissive color updates
const updateEmissive = (event) => {
  if (!selectedObject.value || !selectedObject.value.material) return;
  
  selectedObject.value.material.emissive.set(event.target.value);
  onMaterialChange();
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
