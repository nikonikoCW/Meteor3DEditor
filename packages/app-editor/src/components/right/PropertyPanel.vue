<template>
  <div class="prop-panel" v-if="selectedWidget">
    <!-- 基础信息 -->
    <div class="section">
      <h4>基础信息</h4>
      <div class="field">
        <label>名称</label>
        <input 
          type="text" 
          v-model="selectedWidget.name" 
          @input="onNameChange"
          :disabled="disabled"
          placeholder="输入组件名称"
        >
      </div>
      <div class="field">
        <label>类型</label>
        <span class="readonly">{{ getWidgetLabel(selectedWidget.type) }}</span>
      </div>
      <div class="field checkbox-field">
        <label>初始调用</label>
        <label class="switch">
          <input 
            type="checkbox" 
            v-model="selectedWidget.data.defaultEnabled" 
            :disabled="disabled"
          >
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- 布局属性 (3D 组件不显示) -->
    <div class="section" v-if="!isHeadlessWidget(selectedWidget.type)">
      <h4>布局</h4>
      <div class="row">
        <div class="field half">
          <label>X</label>
          <input type="number" v-model.number="selectedWidget.position.x" :disabled="disabled">
        </div>
        <div class="field half">
          <label>Y</label>
          <input type="number" v-model.number="selectedWidget.position.y" :disabled="disabled">
        </div>
      </div>
      <div class="row" v-if="selectedWidget.size">
        <div class="field half">
          <label>宽</label>
          <input type="number" v-model.number="selectedWidget.size.width" :disabled="disabled">
        </div>
        <div class="field half">
          <label>高</label>
          <input type="number" v-model.number="selectedWidget.size.height" :disabled="disabled">
        </div>
      </div>
      <div class="field" v-if="selectedWidget.rotation !== undefined">
        <label>旋转</label>
        <div class="rotation-input">
          <input type="number" v-model.number="selectedWidget.rotation" :disabled="disabled">
          <span class="unit">°</span>
        </div>
      </div>
    </div>
    <!-- 动态渲染的特有属性 -->
    <div class="section" v-if="widgetProps.length > 0">
      <h4>组件配置</h4>
      <div v-for="prop in widgetProps" :key="prop.name" class="field" :class="{ 'checkbox-field': prop.type === 'switch' }">
        <label>{{ prop.label }}</label>
        
        <!-- Switch (开关) -->
        <label v-if="prop.type === 'switch'" class="switch">
          <input 
            type="checkbox" 
            v-model="selectedWidget.data[prop.name]"
            :disabled="disabled"
          >
          <span class="slider"></span>
        </label>

        <!-- Select -->
        <select 
          v-else-if="prop.type === 'select'" 
          v-model="selectedWidget.data[prop.name]"
          :disabled="disabled"
        >
          <option v-for="opt in prop.options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <!-- Color (RGB only) -->
        <div v-else-if="prop.type === 'color'" class="color-input-wrapper">
          <input 
            type="color" 
            v-model="selectedWidget.data[prop.name]"
            :disabled="disabled"
          >
          <span>{{ selectedWidget.data[prop.name] }}</span>
        </div>

        <!-- Color with Alpha (RGBA) -->
        <div v-else-if="prop.type === 'color-alpha'" class="color-alpha-wrapper">
          <div class="color-row">
            <input 
              type="color" 
              :value="extractHex(selectedWidget.data[prop.name])"
              @input="updateColorWithAlpha(prop.name, $event.target.value, getAlpha(selectedWidget.data[prop.name]))"
              :disabled="disabled"
            >
            <span class="color-value">{{ selectedWidget.data[prop.name] || 'rgba(0,0,0,1)' }}</span>
          </div>
          <div class="alpha-row">
            <label class="alpha-label">透明度</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              :value="Math.round(getAlpha(selectedWidget.data[prop.name]) * 100)"
              @input="updateColorWithAlpha(prop.name, extractHex(selectedWidget.data[prop.name]), $event.target.value / 100)"
              :disabled="disabled"
            >
            <span class="alpha-value">{{ Math.round(getAlpha(selectedWidget.data[prop.name]) * 100) }}%</span>
          </div>
        </div>

        <!-- Button -->
        <div v-else-if="prop.type === 'button'" class="button-wrapper">
          <button 
            @click="selectedWidget.data[prop.name] = Date.now()"
            :disabled="disabled"
            class="action-btn"
          >
            {{ prop.buttonLabel || '点击触发' }}
          </button>
        </div>

        <!-- Textarea / JSON -->
         
        <textarea
          v-else-if="prop.type === 'textarea' || prop.type === 'json'"
          v-model="selectedWidget.data[prop.name]"
          :disabled="disabled"
          rows="6"
          class="prop-textarea"
        ></textarea>

        <!-- Text/Number -->
        <input 
          v-else 
          :type="prop.type === 'number' ? 'number' : 'text'"
          v-model="selectedWidget.data[prop.name]"
          :disabled="disabled"
          :min="prop.min"
          :max="prop.max"
          :step="prop.step"
        >
      </div>
    </div>
  </div>
  <div class="prop-panel empty" v-else>
    <p>请选择一个组件</p>
  </div>
</template>

<script setup>
import { watch, ref } from 'vue';
import { useAppStore } from '../../stores/appStore';
import { storeToRefs } from 'pinia';
import { getWidgetDefinition } from '../../core/widgetRegistry';

defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});

const appStore = useAppStore();
const { selectedWidget, hasUnsavedChanges } = storeToRefs(appStore);

// 判断是否是 3D 逻辑组件
const isHeadlessWidget = (type) => {
  const def = getWidgetDefinition(type);
  return def?.config.category === '3d';
};

// 获取组件类型标签
const getWidgetLabel = (type) => {
  const def = getWidgetDefinition(type);
  return def?.config.label || type;
};

// 名称变化时标记未保存
const onNameChange = () => {
  hasUnsavedChanges.value = true;
};

const widgetProps = ref([]);

watch(selectedWidget, async (newWidget) => {
  if (!newWidget) {
    widgetProps.value = [];
    return;
  }

  const def = getWidgetDefinition(newWidget.type);
  if (def && def.config.props) {
    const props = JSON.parse(JSON.stringify(def.config.props));
    
    for (const prop of props) {
      const originalProp = def.config.props.find(p => p.name === prop.name);
      if (originalProp && originalProp.fetchOptions) {
        prop.options = await originalProp.fetchOptions();
      }
      
      if (newWidget.data[prop.name] === undefined && prop.defaultValue !== undefined) {
        newWidget.data[prop.name] = prop.defaultValue;
      }
    }
    
    widgetProps.value = props;
  } else {
    widgetProps.value = [];
  }
}, { immediate: true });

// RGBA 颜色处理辅助函数
const extractHex = (rgba) => {
  if (!rgba) return '#000000';
  if (rgba.startsWith('#')) return rgba.slice(0, 7);
  
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return '#000000';
};

const getAlpha = (rgba) => {
  if (!rgba) return 1;
  if (rgba.startsWith('#')) return 1;
  
  const match = rgba.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
  return match ? parseFloat(match[1]) : 1;
};

const updateColorWithAlpha = (propName, hex, alpha) => {
  if (!selectedWidget.value) return;
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  selectedWidget.value.data[propName] = `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
</script>

<style scoped>
.prop-panel {
  padding: 12px;
  color: white;
}

.prop-panel.empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 13px;
}

h4 {
  font-size: 11px;
  color: #888;
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section {
  margin-bottom: 16px;
  background: #252525;
  padding: 12px;
  border-radius: 6px;
}

.field {
  margin-bottom: 10px;
}

.field:last-child {
  margin-bottom: 0;
}

.checkbox-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.checkbox-field label {
  margin-bottom: 0;
}

.checkbox-field input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.row {
  display: flex;
  gap: 8px;
}

.field.half {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 4px;
  color: #888;
  font-size: 11px;
}

input, select {
  width: 100%;
  background: #1e1e1e;
  border: 1px solid #333;
  color: white;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
}

input:focus, select:focus {
  outline: none;
  border-color: #42b983;
}

input:disabled, select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rotation-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rotation-input input {
  flex: 1;
}

.unit {
  color: #666;
  font-size: 12px;
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input-wrapper input[type="color"] {
  width: 32px;
  height: 24px;
  padding: 0;
  border: none;
  cursor: pointer;
}

.color-input-wrapper span {
  font-size: 11px;
  color: #888;
}

.readonly {
  color: #666;
  font-size: 12px;
}

/* Color with Alpha */
.color-alpha-wrapper {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 8px;
}

.color-alpha-wrapper .color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.color-alpha-wrapper input[type="color"] {
  width: 32px;
  height: 24px;
  padding: 0;
  border: none;
  cursor: pointer;
}

.color-alpha-wrapper .color-value {
  font-size: 10px;
  color: #888;
  font-family: monospace;
}

.color-alpha-wrapper .alpha-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-alpha-wrapper .alpha-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 0;
  width: 40px;
}

.color-alpha-wrapper input[type="range"] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: #333;
  border-radius: 2px;
}

.color-alpha-wrapper input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #42b983;
  border-radius: 50%;
  cursor: pointer;
}

.color-alpha-wrapper .alpha-value {
  font-size: 10px;
  color: #888;
  width: 30px;
  text-align: right;
}

.action-btn {
  width: 100%;
  background: #42b983;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #3aa876;
}

.action-btn:active {
  background: #2d7a5e;
}

.prop-textarea {
  width: 100%;
  background: #1e1e1e;
  border: 1px solid #333;
  color: #ccc;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  resize: vertical;
}

.prop-textarea:focus {
  outline: none;
  border-color: #42b983;
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #444;
  transition: 0.3s;
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #42b983;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
