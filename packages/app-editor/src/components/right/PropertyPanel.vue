<template>
  <div class="prop-panel" v-if="selectedWidget">
    <!-- 基础信息 -->
    <div class="section">
      <h4>基础信息</h4>
      <div class="field">
        <label>类型</label>
        <span class="readonly">{{ selectedWidget.type }}</span>
      </div>
    </div>

    <!-- 布局属性 -->
    <div class="section">
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
      <div v-for="prop in widgetProps" :key="prop.name" class="field">
        <label>{{ prop.label }}</label>
        
        <!-- Select -->
        <select 
          v-if="prop.type === 'select'" 
          v-model="selectedWidget.data[prop.name]"
          :disabled="disabled"
        >
          <option v-for="opt in prop.options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <!-- Color -->
        <div v-else-if="prop.type === 'color'" class="color-input-wrapper">
          <input 
            type="color" 
            v-model="selectedWidget.data[prop.name]"
            :disabled="disabled"
          >
          <span>{{ selectedWidget.data[prop.name] }}</span>
        </div>

        <!-- Text/Number -->
        <input 
          v-else 
          :type="prop.type === 'number' ? 'number' : 'text'"
          v-model="selectedWidget.data[prop.name]"
          :disabled="disabled"
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
const { selectedWidget } = storeToRefs(appStore);

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
</style>
