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
        <select v-model.number="selectedObject.material.side" @change="onShaderAffectingChange">
            <option :value="THREE.FrontSide">Front</option>
            <option :value="THREE.BackSide">Back</option>
            <option :value="THREE.DoubleSide">Double</option>
        </select>
      </div>

      <div class="prop-row">
        <label>透明</label>
        <input type="checkbox" v-model="selectedObject.material.transparent" @change="onShaderAffectingChange">
      </div>

      <div class="prop-row" v-if="selectedObject.material.opacity !== undefined">
        <label>不透明度</label>
        <input type="range" min="0" max="1" step="0.01" :value="opacityVal" @input="onOpacityInput">
        <span class="range-val">{{ opacityVal.toFixed(2) }}</span>
      </div>

      <div class="prop-row" v-if="selectedObject.material.alphaTest !== undefined">
        <label>Alpha裁切</label>
        <input type="range" min="0" max="1" step="0.01" :value="alphaTestVal" @input="onAlphaTestInput">
        <span class="range-val">{{ alphaTestVal.toFixed(2) }}</span>
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
        <input type="checkbox" v-model="selectedObject.material.vertexColors" @change="onShaderAffectingChange">
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
import { ref, watch } from 'vue';
import * as THREE from 'three';

const editorStore = useEditorStore();
const { selectedObject } = storeToRefs(editorStore);

// Local reactive refs for range sliders (needed because Three.js objects are markRaw)
const opacityVal = ref(1);
const alphaTestVal = ref(0);

// Sync local refs when selected object changes
watch(selectedObject, (obj) => {
  if (obj && obj.material) {
    opacityVal.value = obj.material.opacity ?? 1;
    alphaTestVal.value = obj.material.alphaTest ?? 0;
  }
}, { immediate: true });

// Handle opacity slider input
const onOpacityInput = (event) => {
  const val = parseFloat(event.target.value);
  opacityVal.value = val;
  if (selectedObject.value?.material) {
    selectedObject.value.material.opacity = val;
    onMaterialChange();
  }
};

// Handle alphaTest slider input
const onAlphaTestInput = (event) => {
  const val = parseFloat(event.target.value);
  alphaTestVal.value = val;
  if (selectedObject.value?.material) {
    selectedObject.value.material.alphaTest = val;
    onShaderAffectingChange();
  }
};

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

// Handle material changes that do NOT require shader recompilation
// (e.g. color, roughness, metalness, opacity, emissiveIntensity, blending, depthTest, depthWrite)
const onMaterialChange = () => {
  if (!selectedObject.value) return;
  selectedObject.value.userData.materialModified = true;
};

// Handle material changes that DO require shader recompilation
// (e.g. transparent, side, vertexColors, alphaTest changing from/to 0)
const onShaderAffectingChange = () => {
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
  min-width: 70px;
  font-size: 12px;
  color: #aaa;
}

input {
  flex: 1;
  min-width: 0;
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

input[type="range"] {
  -webkit-appearance: auto;
  appearance: auto;
  background: transparent;
  border: none;
  padding: 0;
  height: 20px;
  cursor: pointer;
}

input[type="range"]:focus {
  border: none;
  outline: none;
}

.range-val {
  min-width: 36px;
  text-align: right;
  font-size: 11px;
  color: #aaa;
  margin-left: 6px;
  font-variant-numeric: tabular-nums;
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
