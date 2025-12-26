<template>
  <div 
    class="app-canvas-viewport"
    :class="{ 'edit-mode': isEditMode }"
    :style="viewportAlignmentStyle"
    ref="viewportRef"
  >
    <!-- 画布容器 (可缩放居中) -->
    <div 
      class="canvas-container"
      ref="canvasRef"
      :style="canvasContainerStyle"
      @dragover.prevent
      @drop="onDrop"
      @click="onCanvasClick"
    >
      <!-- 画布边界 -->
      <div class="canvas-boundary" :style="canvasBoundaryStyle">
        <div class="grid-background" v-if="isEditMode"></div>
    <!-- 普通 UI 组件 (场景/2D) -->
    <div
      v-for="widget in uiWidgets"
      :key="widget.id"
      v-show="widget.enabled !== false"
      :ref="(el) => setWidgetRef(el, widget.id)"
      class="widget-wrapper"
      :class="{ 
        selected: isEditMode && selectedWidget?.id === widget.id
      }"
      :style="getWidgetStyle(widget)"
      :data-widget-id="widget.id"
      @click.stop="onWidgetClick(widget)"
    >
      <component 
        v-if="getComponent(widget.type)"
        :is="getComponent(widget.type)" 
        :data="widget.data"
        :enabled="widget.enabled !== false"
        :widgetId="widget.id"
        class="widget-content"
        @widget-event="(e) => onWidgetEvent(widget.id, e)"
      />
      <div v-else class="error-widget">Unknown: {{ widget.type }}</div>
    </div>

    <!-- 3D 逻辑组件 (无 UI，隐藏渲染) -->
    <template v-for="widget in headlessWidgets" :key="widget.id">
      <component
        v-if="isSceneReady && getComponent(widget.type)"
        :is="getComponent(widget.type)"
        :data="widget.data"
        :enabled="widget.enabled !== false"
        :widgetId="widget.id"
        @widget-event="(e) => onWidgetEvent(widget.id, e)"
      />
    </template>

    <!-- Moveable 控制器 (仅对 UI 组件生效) -->
    <Moveable
      v-if="isEditMode && selectedWidget && !isHeadlessWidget(selectedWidget.type) && widgetRefs[selectedWidget.id]"
      :key="moveableKey"
      :target="widgetRefs[selectedWidget.id]"
      :draggable="true"
      :bounds="dragBounds"
      :resizable="true"
      :rotatable="true"
      :snappable="true"
      :renderDirections="['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']"
      :edge="false"
      :snapDirections="{ top: true, left: true, bottom: true, right: true, center: true, middle: true }"
      :elementSnapDirections="{ top: true, left: true, bottom: true, right: true, center: true, middle: true }"
      :snapGuidelines="true"
      :isDisplaySnapDigit="true"
      :snapDigit="0"
      :elementGuidelines="elementGuidelines"
      :origin="false"
      :keepRatio="false"
      :throttleDrag="0"
      :throttleResize="0"
      :throttleRotate="0"
      :rotationPosition="'top'"
      @drag="onDrag"
      @dragEnd="onDragEnd"
      @resize="onResize"
      @resizeEnd="onResizeEnd"
      @rotate="onRotate"
      @rotateEnd="onRotateEnd"
    />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import Moveable from 'vue3-moveable';
import { useAppStore } from '../../stores/appStore';
import { storeToRefs } from 'pinia';
import { getWidgetDefinition } from '../../core/widgetRegistry';


// 判断是否是无 UI 的 3D 逻辑组件
const isHeadlessWidget = (type) => {
  const def = getWidgetDefinition(type);
  return def?.config.category === '3d';
};

const viewportRef = ref(null);
const canvasRef = ref(null);
const appStore = useAppStore();
const { widgets, selectedWidget, isEditMode, canvas } = storeToRefs(appStore);

const isSceneReady = computed(() => appStore.isSceneReady);

// 视口尺寸
const viewportSize = ref({ width: 800, height: 600 });

// 视口对齐样式 (根据画布和视口尺寸动态调整)
const viewportAlignmentStyle = computed(() => {
  const vw = viewportSize.value.width;
  const vh = viewportSize.value.height;
  const cw = canvas.value.width;
  const ch = canvas.value.height;
  
  // A: 画布都小于视口 → 居中
  if (cw <= vw && ch <= vh) {
    return { justifyContent: 'center', alignItems: 'center' };
  }
  // B: 宽度超出 → 左对齐，垂直居中
  if (cw > vw && ch <= vh) {
    return { justifyContent: 'flex-start', alignItems: 'center' };
  }
  // C: 高度超出 → 上对齐，水平居中
  if (cw <= vw && ch > vh) {
    return { justifyContent: 'center', alignItems: 'flex-start' };
  }
  // D: 都超出 → 左上角对齐
  return { justifyContent: 'flex-start', alignItems: 'flex-start' };
});

// 画布容器样式
const canvasContainerStyle = computed(() => ({
  width: canvas.value.width + 'px',
  height: canvas.value.height + 'px'
}));

// 画布边界样式
const canvasBoundaryStyle = computed(() => ({
  width: canvas.value.width + 'px',
  height: canvas.value.height + 'px',
  background: canvas.value.background || '#1a1a1a'
}));

// 拖拽边界限制：组件不能超出画布
const dragBounds = computed(() => ({
  left: 0,
  top: 0,
  right: canvas.value.width,
  bottom: canvas.value.height
}));

// 分离 UI 组件和 3D 逻辑组件
const uiWidgets = computed(() => widgets.value.filter(w => !isHeadlessWidget(w.type)));
const headlessWidgets = computed(() => widgets.value.filter(w => isHeadlessWidget(w.type)));

// Widget refs 映射
const widgetRefs = ref({});
const moveableKey = ref(0);

// 设置 widget ref
const setWidgetRef = (el, id) => {
  if (el) {
    widgetRefs.value[id] = el;
  }
};

// 其他 widget 元素作为对齐参考
const elementGuidelines = computed(() => {
  if (!selectedWidget.value) return [];
  return widgets.value
    .filter(w => w.id !== selectedWidget.value.id)
    .map(w => widgetRefs.value[w.id])
    .filter(Boolean);
});

// 获取组件样式
const getWidgetStyle = (widget) => {
  return {
    left: `${widget.position.x}px`,
    top: `${widget.position.y}px`,
    width: `${widget.size?.width || 200}px`,
    height: `${widget.size?.height || 150}px`,
    transform: widget.rotation ? `rotate(${widget.rotation}deg)` : 'none',
    zIndex: widget.data?.zIndex || 1
  };
};

// 获取组件实现
const getComponent = (type) => {
  const def = getWidgetDefinition(type);
  return def ? def.component : null;
};

// 拖放新组件
const onDrop = (event) => {
  if (!isEditMode.value) return;
  
  const type = event.dataTransfer.getData('widgetType');
  if (!type) return;

  if (!canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const def = getWidgetDefinition(type);
  const defaultSize = def?.config.defaultSize || { width: 200, height: 150 };
  
  // 默认启用逻辑：2D 组件默认开启，3D 组件默认关闭
  const is3D = def?.config.category === '3d';
  const defaultEnabled = !is3D;

  const newWidget = {
    id: crypto.randomUUID(),
    type: type,
    position: { x, y },
    size: { ...defaultSize },
    rotation: 0,
    enabled: defaultEnabled,
    data: {
      defaultEnabled: defaultEnabled
    }
  };

  appStore.addWidget(newWidget);
  
  nextTick(() => {
    appStore.selectWidget(newWidget);
    moveableKey.value++;
  });
};

// 点击画布空白处
const onCanvasClick = (event) => {
  if (!isEditMode.value) return;
  if (event.target === canvasRef.value || event.target.classList.contains('grid-background')) {
    appStore.clearSelection();
  }
};

// 点击组件
const onWidgetClick = (widget) => {
  if (!isEditMode.value) return;
  appStore.selectWidget(widget);
  nextTick(() => {
    moveableKey.value++;
  });
};

// 处理组件事件（仅在预览模式下执行交互）
const onWidgetEvent = (widgetId, eventData) => {
  if (isEditMode.value) return;  // 编辑模式下不执行交互
  appStore.triggerEvent(widgetId, eventData.event);
};

// ====== Moveable 事件 ======
// 在拖拽过程中直接操作 DOM，不更新 Vue 数据（避免响应式引起的问题）
// 在拖拽结束时才更新 Vue 数据

const onDrag = (e) => {
  // 直接设置目标元素的 transform
  e.target.style.transform = e.transform;
};

const onDragEnd = (e) => {
  if (!selectedWidget.value) return;
  
  // 从 transform 中提取 translate 值
  const matrix = new DOMMatrix(e.target.style.transform);
  const translateX = matrix.m41;
  const translateY = matrix.m42;
  
  // 更新位置数据
  selectedWidget.value.position.x += translateX;
  selectedWidget.value.position.y += translateY;
  
  // 重置 transform，只保留旋转
  e.target.style.transform = selectedWidget.value.rotation ? `rotate(${selectedWidget.value.rotation}deg)` : '';
  
  // 刷新 Moveable 控制框
  nextTick(() => { moveableKey.value++; });
};

const onResize = (e) => {
  // 直接设置目标元素的尺寸和位置
  e.target.style.width = `${e.width}px`;
  e.target.style.height = `${e.height}px`;
  e.target.style.transform = e.drag.transform;
};

const onResizeEnd = (e) => {
  if (!selectedWidget.value) return;
  
  const def = getWidgetDefinition(selectedWidget.value.type);
  const minSize = def?.config.minSize || { width: 50, height: 30 };
  
  // 更新尺寸
  selectedWidget.value.size.width = Math.max(minSize.width, parseInt(e.target.style.width));
  selectedWidget.value.size.height = Math.max(minSize.height, parseInt(e.target.style.height));
  
  // 从 transform 中提取位移
  const matrix = new DOMMatrix(e.target.style.transform);
  selectedWidget.value.position.x += matrix.m41;
  selectedWidget.value.position.y += matrix.m42;
  
  // 重置 transform
  e.target.style.transform = selectedWidget.value.rotation ? `rotate(${selectedWidget.value.rotation}deg)` : '';
  
  // 刷新 Moveable 控制框
  nextTick(() => { moveableKey.value++; });
};

const onRotate = (e) => {
  e.target.style.transform = e.drag.transform;
};

const onRotateEnd = (e) => {
  if (!selectedWidget.value) return;
  
  // 从 transform 中提取旋转
  const matrix = new DOMMatrix(e.target.style.transform);
  selectedWidget.value.rotation = Math.round(Math.atan2(matrix.m21, matrix.m11) * (180 / Math.PI));
  
  // 重置 transform
  e.target.style.transform = `rotate(${selectedWidget.value.rotation}deg)`;
  
  // 刷新 Moveable 控制框
  nextTick(() => { moveableKey.value++; });
};

// 监听选中变化，刷新 Moveable
watch(selectedWidget, () => {
  nextTick(() => {
    moveableKey.value++;
  });
});

// 更新视口尺寸
const updateViewportSize = () => {
  if (viewportRef.value) {
    const rect = viewportRef.value.getBoundingClientRect();
    viewportSize.value = { width: rect.width, height: rect.height };
  }
};

onMounted(() => {
  updateViewportSize();
  // 监听视口变化
  if (viewportRef.value) {
    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(viewportRef.value);
  }
});
</script>

<style scoped>
.app-canvas-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: auto;
  background: #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-container {
  position: relative;
  flex-shrink: 0;
}

.canvas-boundary {
  position: relative;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.5);
}

.edit-mode .canvas-boundary {
  outline: 2px dashed rgba(66, 185, 131, 0.4);
  outline-offset: 2px;
}

.grid-background {
  position: absolute;
  inset: 0;
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
  pointer-events: none;
}



.widget-wrapper {
  position: absolute;
  background: transparent;
  border: 1px solid #333;
  border:none;
  overflow: hidden;
  user-select: none;
}

.widget-wrapper.selected {
  border-color: #42b983;
}

.widget-content {
  width: 100%;
  height: 100%;
}

/* 编辑模式下禁用组件内部鼠标事件，以便拖拽/缩放 */
.edit-mode .widget-content {
  pointer-events: none;
}

/* 预览模式下启用组件内部鼠标事件，支持场景交互 */
.app-canvas:not(.edit-mode) .widget-content {
  pointer-events: auto;
}

.error-widget {
  padding: 10px;
  color: #ff6b6b;
  font-size: 12px;
}

/* Moveable 自定义样式 */
:deep(.moveable-line) {
  background: #42b983 !important;
}

:deep(.moveable-control) {
  background: #42b983 !important;
  border-color: #2d7a5e !important;
  width: 10px !important;
  height: 10px !important;
  margin-top: -5px !important;
  margin-left: -5px !important;
}

:deep(.moveable-rotation-control) {
  background: #42b983 !important;
  border-color: #2d7a5e !important;
}

/* 辅助线样式 */
:deep(.moveable-guideline) {
  background: #ff6b6b !important;
}

:deep(.moveable-dashed) {
  border-color: #ff6b6b !important;
}

:deep(.moveable-gap) {
  background: rgba(255, 107, 107, 0.3) !important;
}
</style>
