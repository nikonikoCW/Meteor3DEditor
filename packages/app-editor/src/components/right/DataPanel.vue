<template>
  <div class="data-panel" v-if="selectedWidget">
    <div v-if="dataConfig.length > 0" class="data-content">
      <template v-for="item in dataConfig" :key="item.name">
        <!-- 代码编辑器 -->
        <DataCodeEditor
          v-if="item.type === 'code-editor'"
          :label="item.label"
          :language="item.language"
          :description="item.description"
          v-model="widgetData[item.name]"
          @update:modelValue="onDataChange(item.name, $event)"
        />
        
        <!-- JSON 编辑器 -->
        <DataJsonEditor
          v-else-if="item.type === 'json-editor'"
          :label="item.label"
          :placeholder="item.placeholder"
          v-model="widgetData[item.name]"
          @update:modelValue="onDataChange(item.name, $event)"
        />

        <!-- 标签编辑器 (新) -->
        <DataLabelEditor
          v-else-if="item.type === 'label-editor'"
          :label="item.label"
          v-model="widgetData[item.name]"
          @update:modelValue="onDataChange(item.name, $event)"
        />
        
        <!-- 文本输入 -->
        <div v-else-if="item.type === 'text'" class="data-field">
          <label>{{ item.label }}</label>
          <input 
            type="text" 
            :value="widgetData[item.name]"
            @input="onDataChange(item.name, $event.target.value)"
          />
        </div>
      </template>
    </div>
    
    <!-- 无数据配置 -->
    <div v-else class="placeholder">
      <span class="placeholder-icon">📄</span>
      <p class="placeholder-desc">该组件无需数据配置</p>
    </div>
  </div>
  
  <!-- 未选中组件 -->
  <div class="data-panel" v-else>
    <div class="placeholder">
      <span class="placeholder-icon">📊</span>
      <p class="placeholder-title">数据面板</p>
      <p class="placeholder-desc">请选择一个组件</p>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';
import { useAppStore } from '../../stores/appStore';
import { storeToRefs } from 'pinia';
import { getWidgetDataConfig } from '../../core/widgetRegistry';
import DataCodeEditor from './DataCodeEditor.vue';
import DataJsonEditor from './DataJsonEditor.vue';
import DataLabelEditor from './DataLabelEditor.vue';

const appStore = useAppStore();
const { selectedWidget, hasUnsavedChanges } = storeToRefs(appStore);

// 获取当前组件的数据配置
const dataConfig = computed(() => {
  if (!selectedWidget.value) return [];
  return getWidgetDataConfig(selectedWidget.value.type);
});

// 组件数据的响应式包装
const widgetData = computed(() => {
  if (!selectedWidget.value) return {};
  return selectedWidget.value.data || {};
});

// 监听选中组件变化，初始化默认值
watch(selectedWidget, (newWidget) => {
  if (!newWidget) return;
  
  // 确保 data 对象存在
  if (!newWidget.data) {
    newWidget.data = {};
  }
  
  const config = getWidgetDataConfig(newWidget.type);
  let hasChanges = false;
  
  for (const item of config) {
    if (newWidget.data[item.name] === undefined && item.defaultValue !== undefined) {
      // 使用 JSON.parse(JSON.stringify()) 深拷贝默认值，防止引用共享
      newWidget.data[item.name] = JSON.parse(JSON.stringify(item.defaultValue));
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    hasUnsavedChanges.value = true;
  }
}, { immediate: true, deep: true });

// 数据变化处理
const onDataChange = (name, value) => {
  if (!selectedWidget.value) return;
  if (!selectedWidget.value.data) {
    selectedWidget.value.data = {};
  }
  selectedWidget.value.data[name] = value;
  hasUnsavedChanges.value = true;
};
</script>

<style scoped>
.data-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.data-content {
  padding: 12px;
  overflow-y: auto;
}

.data-field {
  margin-bottom: 12px;
}

.data-field label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 6px;
}

.data-field input {
  width: 100%;
  padding: 6px 8px;
  background: #252525;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

.data-field input:focus {
  outline: none;
  border-color: #42b983;
}

.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #666;
}

.placeholder-icon {
  font-size: 48px;
  opacity: 0.5;
}

.placeholder-title {
  margin: 16px 0 8px;
  font-size: 16px;
  color: #888;
}

.placeholder-desc {
  margin: 0;
  font-size: 13px;
  color: #555;
}
</style>
