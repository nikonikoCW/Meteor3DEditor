<template>
  <div class="component-menu">
    <div class="menu-header">
      <span class="menu-title">组件库</span>
    </div>
    <div class="menu-content">
      <!-- 场景组件 -->
      <div class="category" v-if="categories.scene.length > 0">
        <div class="category-header">
          <span class="category-icon">🌍</span>
          <span class="category-name">场景组件</span>
        </div>
        <div class="category-items">
          <div 
            v-for="widget in categories.scene" 
            :key="widget.type"
            class="widget-item"
            :draggable="!disabled"
            @dragstart="onDragStart($event, widget.type)"
          >
            <span class="widget-icon">{{ widget.icon }}</span>
            <span class="widget-label">{{ widget.label }}</span>
          </div>
        </div>
      </div>

      <!-- 2D 组件 -->
      <div class="category" v-if="categories['2d'].length > 0">
        <div class="category-header">
          <span class="category-icon">📊</span>
          <span class="category-name">2D 组件</span>
        </div>
        <div class="category-items">
          <div 
            v-for="widget in categories['2d']" 
            :key="widget.type"
            class="widget-item"
            :draggable="!disabled"
            @dragstart="onDragStart($event, widget.type)"
          >
            <span class="widget-icon">{{ widget.icon }}</span>
            <span class="widget-label">{{ widget.label }}</span>
          </div>
        </div>
      </div>

      <!-- 3D 组件 -->
      <div class="category" v-if="categories['3d'].length > 0">
        <div class="category-header">
          <span class="category-icon">🎯</span>
          <span class="category-name">3D 组件</span>
        </div>
        <div class="category-items">
          <div 
            v-for="widget in categories['3d']" 
            :key="widget.type"
            class="widget-item"
            :draggable="!disabled"
            @dragstart="onDragStart($event, widget.type)"
          >
            <span class="widget-icon">{{ widget.icon }}</span>
            <span class="widget-label">{{ widget.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getWidgetsByCategory } from '../../core/widgetRegistry';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});

const categories = ref({ scene: [], '2d': [], '3d': [] });

onMounted(() => {
  categories.value = getWidgetsByCategory();
});

const onDragStart = (event, type) => {
  if (props.disabled) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData('widgetType', type);
};
</script>

<style scoped>
.component-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-header {
  padding: 10px 12px;
  background: #252525;
  border-bottom: 1px solid #333;
}

.menu-title {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
}

.menu-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.category {
  margin-bottom: 16px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  color: #aaa;
  font-size: 12px;
}

.category-icon {
  font-size: 14px;
}

.category-name {
  font-weight: 500;
}

.category-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 0 4px;
}

.widget-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s;
}

.widget-item:hover {
  background: #333;
  border-color: #444;
}

.widget-item:active {
  cursor: grabbing;
}

.widget-icon {
  font-size: 20px;
}

.widget-label {
  font-size: 11px;
  color: #aaa;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 禁用状态 */
.component-menu:has(.widget-item[draggable="false"]) .widget-item {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
