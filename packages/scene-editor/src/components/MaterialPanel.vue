<template>
  <div class="material-panel" v-if="selectedObject && selectedObject.material">
    <h3>材质</h3>
    
    <div class="section">
      <h4>基本属性</h4>
      <div class="prop-row">
        <label>类型</label>
        <span class="readonly-val">{{ selectedObject.material.type }}</span>
      </div>

      <div class="prop-row">
        <label>颜色</label>
        <input type="color" :value="'#' + selectedObject.material.color.getHexString()" @change="updateColor">
      </div>

      <div class="prop-row" v-if="selectedObject.material.map !== undefined">
        <label>贴图</label>
        <span class="readonly-val">{{ selectedObject.material.map ? (selectedObject.material.map.name || 'Texture') : '无' }}</span>
      </div>
    </div>

    <div class="section">
      <h4>PBR 属性</h4>
      <div class="prop-row" v-if="selectedObject.material.roughness !== undefined">
        <label>粗糙度</label>
        <input type="number" min="0" max="1" step="0.1" v-model.number="selectedObject.material.roughness" @change="onMaterialChange">
      </div>
      <div class="prop-row" v-if="selectedObject.material.metalness !== undefined">
        <label>金属度</label>
        <input type="number" min="0" max="1" step="0.1" v-model.number="selectedObject.material.metalness" @change="onMaterialChange">
      </div>
    </div>

    <div class="section">
      <h4>自发光</h4>
      <div class="prop-row" v-if="selectedObject.material.emissive !== undefined">
        <label>颜色</label>
        <input type="color" :value="'#' + selectedObject.material.emissive.getHexString()" @change="updateEmissive">
      </div>
      <div class="prop-row" v-if="selectedObject.material.emissiveIntensity !== undefined">
        <label>强度</label>
        <input type="number" min="0" max="5" step="0.1" v-model.number="selectedObject.material.emissiveIntensity" @change="onMaterialChange">
      </div>
    </div>

    <div class="section">
      <h4>渲染选项</h4>
      <div class="prop-row">
        <label>混合模式</label>
        <select v-model.number="selectedObject.material.blending" @change="onMaterialChange">
            <option :value="THREE.NoBlending">No Blending</option>
            <option :value="THREE.NormalBlending">Normal</option>
            <option :value="THREE.AdditiveBlending">Additive</option>
            <option :value="THREE.SubtractiveBlending">Subtractive</option>
            <option :value="THREE.MultiplyBlending">Multiply</option>
        </select>
      </div>

      <div class="prop-row">
        <label>渲染面</label>
        <select v-model.number="selectedObject.material.side" @change="onMaterialChange">
            <option :value="THREE.FrontSide">Front</option>
            <option :value="THREE.BackSide">Back</option>
            <option :value="THREE.DoubleSide">Double</option>
        </select>
      </div>

      <div class="prop-row">
        <label>透明</label>
        <input type="checkbox" v-model="selectedObject.material.transparent" @change="onMaterialChange">
      </div>

      <div class="prop-row">
        <label>深度测试</label>
        <input type="checkbox" v-model="selectedObject.material.depthTest" @change="onMaterialChange">
      </div>

      <div class="prop-row">
        <label>深度写入</label>
        <input type="checkbox" v-model="selectedObject.material.depthWrite" @change="onMaterialChange">
      </div>

      <div class="prop-row">
        <label>顶点颜色</label>
        <input type="checkbox" v-model="selectedObject.material.vertexColors" @change="onMaterialChange">
      </div>
    </div>
  </div>
  <div class="material-panel" v-else>
    <p class="empty-msg">请选择有材质的对象</p>
  </div>
</template>

<script setup>
import { useEditorStore } from '../stores/editorStore';
import { storeToRefs } from 'pinia';
import * as THREE from 'three';

const editorStore = useEditorStore();
const { selectedObject } = storeToRefs(editorStore);

// Handle color updates
const updateColor = (event) => {
  if (!selectedObject.value || !selectedObject.value.material) return;
  
  selectedObject.value.material.color.set(event.target.value);
  onMaterialChange();
};

// Handle emissive color updates
const updateEmissive = (event) => {
  if (!selectedObject.value || !selectedObject.value.material) return;
  
  selectedObject.value.material.emissive.set(event.target.value);
  onMaterialChange();
};

// Handle material changes
const onMaterialChange = () => {
  if (!selectedObject.value) return;
  selectedObject.value.userData.materialModified = true;
  if (selectedObject.value.material) {
      selectedObject.value.material.needsUpdate = true;
  }
};
</script>

<style scoped>
.material-panel {
  width: 100%;
  height: 100%;
  background: #222;
  color: white;
  padding: 15px;
  overflow-y: auto;
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
  width: 70px;
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

input[type="checkbox"] {
  flex: none;
  width: 16px;
  height: 16px;
}

select {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}

select:focus {
  border-color: #0066cc;
  outline: none;
}

.readonly-val {
  color: #888;
  font-size: 12px;
}

.empty-msg {
  color: #666;
  text-align: center;
  margin-top: 40px;
  font-size: 13px;
}
</style>
