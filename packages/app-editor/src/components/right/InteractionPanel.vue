<template>
  <div class="interaction-panel" v-if="selectedWidget">
    <div class="section">
      <h4>交互配置</h4>
      
      <!-- 事件列表 -->
      <div v-for="event in widgetEvents" :key="event.name" class="event-block">
        <div class="event-header">
          <span class="event-icon">📌</span>
          <span class="event-name">{{ event.label }}事件</span>
        </div>
        
        <!-- 该事件的规则列表 -->
        <div 
          v-for="(rule, idx) in getEventRules(event.name)" 
          :key="idx" 
          class="rule-item"
        >
          <div class="rule-row">
            <label>目标组件</label>
            <select v-model="rule.target" @change="markChanged">
              <option value="">请选择</option>
              <option 
                v-for="w in otherWidgets" 
                :key="w.id" 
                :value="w.id"
              >
                {{ w.type }} - {{ w.id.slice(0, 8) }}
              </option>
            </select>
          </div>
          <div class="rule-row">
            <label>动作</label>
            <select v-model="rule.action" @change="markChanged">
              <option value="toggle">切换显隐</option>
              <option value="show">显示</option>
              <option value="hide">隐藏</option>
            </select>
          </div>
          <button class="delete-btn" @click="removeRule(event.name, idx)">删除</button>
        </div>
        
        <button class="add-btn" @click="addRule(event.name)">+ 添加规则</button>
      </div>
    </div>
  </div>
  <div class="interaction-panel empty" v-else>
    <p>请选择一个组件</p>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useAppStore } from '../../stores/appStore';
import { storeToRefs } from 'pinia';
import { getWidgetEvents } from '../../core/widgetRegistry';

const appStore = useAppStore();
const { selectedWidget, widgets, hasUnsavedChanges } = storeToRefs(appStore);

// 当前组件支持的事件
const widgetEvents = computed(() => {
  if (!selectedWidget.value) return [];
  return getWidgetEvents(selectedWidget.value.type);
});

// 其他组件（不包括自己）
const otherWidgets = computed(() => {
  if (!selectedWidget.value) return [];
  return widgets.value.filter(w => w.id !== selectedWidget.value.id);
});

// 获取某个事件的规则
const getEventRules = (eventName) => {
  if (!selectedWidget.value) return [];
  if (!selectedWidget.value.interactions) {
    selectedWidget.value.interactions = [];
  }
  return selectedWidget.value.interactions.filter(i => i.event === eventName);
};

// 添加规则
const addRule = (eventName) => {
  if (!selectedWidget.value) return;
  if (!selectedWidget.value.interactions) {
    selectedWidget.value.interactions = [];
  }
  selectedWidget.value.interactions.push({
    event: eventName,
    target: '',
    action: 'toggle'
  });
  markChanged();
};

// 删除规则
const removeRule = (eventName, idx) => {
  if (!selectedWidget.value) return;
  const rules = selectedWidget.value.interactions.filter(i => i.event === eventName);
  const ruleToRemove = rules[idx];
  const globalIdx = selectedWidget.value.interactions.indexOf(ruleToRemove);
  if (globalIdx > -1) {
    selectedWidget.value.interactions.splice(globalIdx, 1);
    markChanged();
  }
};

// 标记有未保存更改
const markChanged = () => {
  hasUnsavedChanges.value = true;
};
</script>

<style scoped>
.interaction-panel {
  padding: 12px;
  color: white;
}

.interaction-panel.empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 13px;
}

.section {
  background: #252525;
  padding: 12px;
  border-radius: 6px;
}

h4 {
  font-size: 11px;
  color: #888;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.event-block {
  margin-bottom: 16px;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: #42b983;
  font-size: 13px;
}

.event-icon {
  font-size: 14px;
}

.rule-item {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 8px;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rule-row:last-of-type {
  margin-bottom: 8px;
}

.rule-row label {
  font-size: 11px;
  color: #888;
  width: 60px;
  flex-shrink: 0;
}

.rule-row select {
  flex: 1;
  background: #252525;
  border: 1px solid #444;
  color: white;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 11px;
}

.delete-btn {
  width: 100%;
  padding: 4px;
  background: transparent;
  border: 1px solid #ff6b6b;
  color: #ff6b6b;
  font-size: 11px;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #ff6b6b;
  color: white;
}

.add-btn {
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px dashed #444;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.add-btn:hover {
  border-color: #42b983;
  color: #42b983;
}
</style>
