<template>
  <div 
    ref="container" 
    class="app-viewport"
    @dragover.prevent
    @drop="onDrop"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mousedown="onMouseDown"
  >
    <div class="canvas-area">
       <div class="grid-background"></div>

       <!-- Widget Layer -->
       <div 
            v-for="widget in widgets" 
            :key="widget.id"
            class="widget-container"
            :style="{ 
                left: widget.position.x + 'px', 
                top: widget.position.y + 'px',
                width: widget.size?.width + 'px',
                height: widget.size?.height + 'px',
                zIndex: selectedWidget && selectedWidget.id === widget.id ? 100 : 1
            }"
            @mousedown.stop="onWidgetMouseDown($event, widget)"
            :class="{ selected: selectedWidget && selectedWidget.id === widget.id }"
        >
            <!-- 动态组件加载 -->
            <component 
                v-if="getComponent(widget.type)"
                :is="getComponent(widget.type)" 
                :data="widget.data" 
                class="widget-content"
            />
            <div v-else class="error-widget">Unknown Widget: {{ widget.type }}</div>
            
            <div v-if="selectedWidget && selectedWidget.id === widget.id" class="resize-handle"></div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { storeToRefs } from 'pinia';
import { getWidgetDefinition } from '../core/widgetRegistry';

const container = ref(null);
const appStore = useAppStore();
const { widgets, selectedWidget } = storeToRefs(appStore);

const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const activeWidget = ref(null);

const onDrop = (event) => {
    const type = event.dataTransfer.getData('widgetType');
    if (!type) return;

    const rect = container.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 获取组件默认配置
    const def = getWidgetDefinition(type);
    const defaultSize = def?.config.defaultSize || { width: 200, height: 150 };

    const newWidget = {
        id: crypto.randomUUID(),
        type: type,
        position: { x, y },
        size: { ...defaultSize },
        data: {} 
    };

    appStore.addWidget(newWidget);
    appStore.selectWidget(newWidget);
};

const onWidgetMouseDown = (event, widget) => {
  appStore.selectWidget(widget);
  isDragging.value = true;
  activeWidget.value = widget;
  dragOffset.value = {
    x: event.clientX - widget.position.x,
    y: event.clientY - widget.position.y
  };
};

const onMouseMove = (event) => {
  if (isDragging.value && activeWidget.value) {
    activeWidget.value.position.x = event.clientX - dragOffset.value.x;
    activeWidget.value.position.y = event.clientY - dragOffset.value.y;
  }
};

const onMouseUp = () => {
  isDragging.value = false;
  activeWidget.value = null;
};

const onMouseDown = (event) => {
  if (event.target === container.value || event.target.classList.contains('grid-background')) {
    appStore.clearSelection();
  }
};

// 获取组件实现
const getComponent = (type) => {
    const def = getWidgetDefinition(type);
    return def ? def.component : null;
};

</script>

<style scoped>
.app-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #1e1e1e;
}

.canvas-area {
  width: 100%;
  height: 100%;
  position: relative;
}

.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: 20px 20px;
  background-image: linear-gradient(to right, #2a2a2a 1px, transparent 1px),
                    linear-gradient(to bottom, #2a2a2a 1px, transparent 1px);
  pointer-events: auto;
}

.widget-container {
    position: absolute;
    background: #252525;
    border: 1px solid #333;
    user-select: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.widget-container.selected {
    border: 1px solid #42b983;
    box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
    z-index: 100;
}

.widget-content {
    width: 100%;
    height: 100%;
    flex: 1;
}

.error-widget {
    padding: 10px;
    color: red;
    background: #ffdce0;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background: #42b983;
  cursor: se-resize;
}
</style>
