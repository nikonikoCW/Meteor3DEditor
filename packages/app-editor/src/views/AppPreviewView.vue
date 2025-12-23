<template>
  <div class="preview-layout" ref="layoutRef" :style="layoutAlignmentStyle">
    <!-- 画布容器 -->
    <div class="preview-canvas" :style="canvasStyle">
      <!-- 场景和 2D 组件 -->
      <template v-for="widget in uiWidgets" :key="widget.id">
        <div
          v-show="widget.enabled !== false"
          class="widget-item"
          :style="getWidgetStyle(widget)"
        >
          <component
            v-if="getComponent(widget.type)"
            :is="getComponent(widget.type)"
            :data="widget.data"
            :enabled="widget.enabled !== false"
            :widgetId="widget.id"
            @widget-event="(e) => onWidgetEvent(widget.id, e)"
          />
        </div>
      </template>

      <!-- 3D 逻辑组件 (场景就绪后渲染) -->
      <template v-if="isSceneReady">
        <template v-for="widget in headlessWidgets" :key="widget.id">
          <component
            v-if="getComponent(widget.type)"
            :is="getComponent(widget.type)"
            :data="widget.data"
            :enabled="widget.enabled !== false"
            :widgetId="widget.id"
            @widget-event="(e) => onWidgetEvent(widget.id, e)"
          />
        </template>
      </template>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">加载中...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../stores/appStore';
import { storeToRefs } from 'pinia';
import { getWidgetDefinition } from '../core/widgetRegistry';

const appStore = useAppStore();
const { widgets, canvas, isLoading, isSceneReady } = storeToRefs(appStore);

const layoutRef = ref(null);
const viewportSize = ref({ width: 800, height: 600 });

// 视口对齐样式 (根据画布和视口尺寸动态调整)
const layoutAlignmentStyle = computed(() => {
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

// 画布样式
const canvasStyle = computed(() => ({
  width: canvas.value.width + 'px',
  height: canvas.value.height + 'px',
  background: canvas.value.background || '#1a1a1a'
}));

// 判断是否是 3D 逻辑组件
const isHeadlessWidget = (type) => {
  const def = getWidgetDefinition(type);
  return def?.config.category === '3d';
};

// 分离 UI 组件和 3D 逻辑组件
const uiWidgets = computed(() => widgets.value.filter(w => !isHeadlessWidget(w.type)));
const headlessWidgets = computed(() => widgets.value.filter(w => isHeadlessWidget(w.type)));

// 获取组件
const getComponent = (type) => {
  const def = getWidgetDefinition(type);
  return def?.component;
};

// 组件样式
const getWidgetStyle = (widget) => {
  const style = {
    position: 'absolute',
    left: `${widget.position?.x || 0}px`,
    top: `${widget.position?.y || 0}px`,
    width: `${widget.size?.width || 200}px`,
    height: `${widget.size?.height || 150}px`
  };
  if (widget.rotation) {
    style.transform = `rotate(${widget.rotation}deg)`;
  }
  return style;
};

// 处理组件事件
const onWidgetEvent = (widgetId, event) => {
  if (event.event === 'click') {
    appStore.triggerEvent(widgetId, 'click');
  }
};

// 从 URL 获取 appId
const getAppIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('appId');
};

// 加载应用
const updateViewportSize = () => {
  if (layoutRef.value) {
    const rect = layoutRef.value.getBoundingClientRect();
    viewportSize.value = { width: rect.width, height: rect.height };
  }
};

onMounted(async () => {
  updateViewportSize();
  // 监听视口变化
  if (layoutRef.value) {
    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(layoutRef.value);
  }

  const urlAppId = getAppIdFromUrl();
  if (urlAppId) {
    try {
      // 设置非编辑模式
      appStore.isEditMode = false;
      await appStore.loadApp(urlAppId);
    } catch (error) {
      console.error('加载应用失败:', error);
    }
  }
});
</script>

<style scoped>
.preview-layout {
  width: 100vw;
  height: 100vh;
  background: #0d0d0d;
  overflow: auto;
  position: relative;
  display: flex;
}

.preview-canvas {
  position: relative;
  flex-shrink: 0;
}

.widget-item {
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  color: #42b983;
  font-size: 18px;
}
</style>
