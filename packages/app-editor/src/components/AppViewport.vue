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
       <!-- 网格背景，方便对齐 -->
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
            <component :is="getWidgetComponent(widget.type)" :data="widget.data" />
            
            <!-- 简单的缩放手柄 (可选实现) -->
            <div v-if="selectedWidget && selectedWidget.id === widget.id" class="resize-handle"></div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { storeToRefs } from 'pinia';

import ChartWidget from './widgets/ChartWidget.vue';
import ButtonWidget from './widgets/ButtonWidget.vue';
import SceneWidget from './widgets/SceneWidget.vue';

const container = ref(null);
const appStore = useAppStore();
const { widgets, selectedWidget } = storeToRefs(appStore);

// 拖拽移动状态
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const activeWidget = ref(null);

// 处理从左侧面板拖入新组件
const onDrop = (event) => {
    const type = event.dataTransfer.getData('widgetType');
    if (!type) return;

    const rect = container.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 根据类型设置默认尺寸
    let defaultSize = { width: 200, height: 150 };
    if (type === 'Scene') defaultSize = { width: 600, height: 400 };
    if (type === 'Button') defaultSize = { width: 100, height: 40 };

    const newWidget = {
        id: crypto.randomUUID(),
        type: type,
        position: { x, y },
        size: defaultSize,
        data: {} // 存储组件特有数据 (如 sceneId, chartTitle)
    };
    
    // 重要：通过 markRaw 标记组件数据，但 position 需要是响应式的
    // Pinia 的 state 是响应式的，所以这里不用 ref 包裹
    appStore.addWidget(newWidget);
    appStore.selectWidget(newWidget);
};

// 开始拖拽已有组件
const onWidgetMouseDown = (event, widget) => {
  appStore.selectWidget(widget);
  isDragging.value = true;
  activeWidget.value = widget;
  
  // 计算鼠标相对于组件左上角的偏移
  dragOffset.value = {
    x: event.clientX - widget.position.x,
    y: event.clientY - widget.position.y
  };
};

const onMouseMove = (event) => {
  if (isDragging.value && activeWidget.value) {
    // 更新组件位置
    // 注意：这里直接修改的是 store 中的对象引用 (Pinia ref)
    // 在实际生产中，可能建议使用 action 来修改
    activeWidget.value.position.x = event.clientX - dragOffset.value.x;
    activeWidget.value.position.y = event.clientY - dragOffset.value.y;
  }
};

const onMouseUp = () => {
  isDragging.value = false;
  activeWidget.value = null;
};

// 点击空白处取消选择
const onMouseDown = (event) => {
  if (event.target === container.value || event.target.classList.contains('grid-background')) {
    appStore.clearSelection();
  }
};

const getWidgetComponent = (type) => {
    switch(type) {
        case 'Chart': return ChartWidget;
        case 'Button': return ButtonWidget;
        case 'Scene': return SceneWidget;
        default: return 'div';
    }
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
    user-select: none; /* 防止拖拽时选中文本 */
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden; /* 防止内容溢出 */
}

.widget-container.selected {
    border: 1px solid #42b983;
    box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
    z-index: 100;
}

/* 简单的缩放手柄 */
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
