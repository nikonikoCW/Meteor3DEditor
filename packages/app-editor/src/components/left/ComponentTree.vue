<template>
  <div class="component-tree">
    <div class="tree-header">
      <span class="tree-title">组件列表</span>
      <span class="tree-count">{{ widgets.length }}</span>
    </div>
    <div class="tree-content">
      <div 
        v-for="widget in widgets" 
        :key="widget.id"
        class="tree-item"
        :class="{ selected: selectedWidget && selectedWidget.id === widget.id }"
        @click="onSelectWidget(widget)"
      >
        <span class="widget-icon">{{ getWidgetIcon(widget.type) }}</span>
        <span class="widget-name">{{ widget.type }}</span>
        <button class="delete-btn" @click.stop="onDeleteWidget(widget)" title="删除">×</button>
      </div>
      <div v-if="widgets.length === 0" class="empty-tip">
        暂无组件，请从下方拖拽添加
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../../stores/appStore';
import { storeToRefs } from 'pinia';
import { getWidgetDefinition } from '../../core/widgetRegistry';

const appStore = useAppStore();
const { widgets, selectedWidget } = storeToRefs(appStore);

const getWidgetIcon = (type) => {
  const def = getWidgetDefinition(type);
  return def?.config.icon || '📦';
};

const onSelectWidget = (widget) => {
  appStore.selectWidget(widget);
};

const onDeleteWidget = (widget) => {
  appStore.removeWidget(widget);
};
</script>

<style scoped>
.component-tree {
  flex: 0 0 auto;
  max-height: 200px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #333;
}

.tree-header {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #252525;
  border-bottom: 1px solid #333;
}

.tree-title {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
}

.tree-count {
  font-size: 11px;
  color: #666;
  background: #333;
  padding: 2px 6px;
  border-radius: 10px;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.tree-item:hover {
  background: #2a2a2a;
}

.tree-item.selected {
  background: #2d4a3e;
}

.widget-icon {
  font-size: 14px;
}

.widget-name {
  flex: 1;
  font-size: 13px;
  color: #ccc;
}

.delete-btn {
  opacity: 0;
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  transition: all 0.2s;
}

.tree-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #ff6b6b;
}

.empty-tip {
  padding: 20px;
  text-align: center;
  color: #555;
  font-size: 12px;
}
</style>
