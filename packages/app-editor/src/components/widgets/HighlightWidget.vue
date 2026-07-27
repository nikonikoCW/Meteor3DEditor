<template>
  <!-- 3D 逻辑组件：无 UI，仅在组件树中可见 -->
  <div class="highlight-widget-placeholder" v-if="false">
    <!-- 占位符，实际不会渲染 -->
  </div>
</template>

<script setup>
import { inject, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { useAppStore } from '../../stores/appStore';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  // 组件启用状态，由交互系统控制
  enabled: {
    type: Boolean,
    default: true
  }
});

const appStore = useAppStore();

// 从 SceneWidget 获取 Core 实例
const sceneContext = inject('sceneContext', null);

// 获取 Core 实例的方法
const getCoreInstance = () => {
  if (sceneContext && typeof sceneContext.getInstance === 'function') {
    return sceneContext.getInstance();
  }
  // 备用：从 store 获取
  return appStore.sceneInstance;
};

// 计算属性：从 data 获取参数
const bid = computed(() => props.data.bid || props.data.uuid || ''); // uuid 兼容旧应用配置
const color = computed(() => {
  const c = props.data.color || '#ffff00';
  // 转换 hex 颜色为数字
  return parseInt(c.replace('#', ''), 16);
});
const intensity = computed(() => props.data.intensity ?? 0.5);

// 启用高亮
const enable = () => {
  const instance = getCoreInstance();
  if (!instance) {
    console.warn('[HighlightWidget] Scene not ready');
    return;
  }
  
  if (!bid.value) {
    console.warn('[HighlightWidget] BID is required');
    return;
  }
  
  instance.enableHighlight(bid.value, {
    color: color.value,
    intensity: intensity.value
  });
  console.log('[HighlightWidget] Highlight enabled for:', bid.value);
};

// 禁用高亮
const disable = () => {
  const instance = getCoreInstance();
  if (instance && bid.value) {
    instance.disableHighlight(bid.value);
    console.log('[HighlightWidget] Highlight disabled for:', bid.value);
  }
};

// 监听 enabled 属性变化
watch(() => props.enabled, (isEnabled) => {
  if (isEnabled) {
    enable();
  } else {
    disable();
  }
});

// 监听参数变化，自动更新高亮效果
watch([bid, color, intensity], () => {
  if (props.enabled && bid.value) {
    enable();
  }
}, { deep: true });

// 监听场景就绪状态
watch(() => appStore.isSceneReady, (isReady) => {
  if (isReady && props.enabled) {
    enable();
  }
}, { immediate: true });

// 组件挂载时，根据 enabled 状态决定是否启用
onMounted(() => {
  // 依赖 isReady 监听
});

// 组件卸载时禁用
onBeforeUnmount(() => {
  disable();
});

// 暴露方法给交互系统调用
defineExpose({
  enable,
  disable
});
</script>

<style scoped>
.highlight-widget-placeholder {
  display: none;
}
</style>
