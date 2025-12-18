<template>
  <aside class="right-panel" :class="{ disabled: disabled }">
    <div class="panel-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="panel-content">
      <PropertyPanel v-show="activeTab === 'property'" :disabled="disabled" />
      <DataPanel v-show="activeTab === 'data'" />
      <InteractionPanel v-show="activeTab === 'interaction'" />
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import PropertyPanel from './PropertyPanel.vue';
import DataPanel from './DataPanel.vue';
import InteractionPanel from './InteractionPanel.vue';

defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});

const tabs = [
  { key: 'property', label: '属性' },
  { key: 'data', label: '数据' },
  { key: 'interaction', label: '交互' }
];

const activeTab = ref('property');
</script>

<style scoped>
.right-panel {
  width: 280px;
  background: #1e1e1e;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-panel.disabled {
  opacity: 0.6;
}

.panel-tabs {
  display: flex;
  background: #252525;
  border-bottom: 1px solid #333;
}

.tab-btn {
  flex: 1;
  padding: 10px 0;
  background: transparent;
  border: none;
  color: #888;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-btn:hover {
  color: #ccc;
  background: #2a2a2a;
}

.tab-btn.active {
  color: #42b983;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #42b983;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}
</style>
