<template>
  <!-- 3D 逻辑组件：无 UI，仅在组件树中可见 -->
  <div class="stats-widget-placeholder" v-if="false">
    <!-- 占位符，实际不会渲染 -->
  </div>
</template>

<script setup>
import { inject, watch, onMounted, onBeforeUnmount } from 'vue';
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

// 启用性能监视器
const enable = () => {
  const instance = getCoreInstance();
  if (instance) {
    instance.enableStats();
    console.log('[StatsWidget] Stats enabled');
  } else {
    console.warn('[StatsWidget] Scene not ready');
  }
};

// 禁用性能监视器
const disable = () => {
  const instance = getCoreInstance();
  if (instance) {
    instance.disableStats();
    console.log('[StatsWidget] Stats disabled');
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

// 组件挂载时，根据 enabled 状态决定是否启用
// 组件挂载时，根据 enabled 状态决定是否启用
onMounted(() => {
  if (props.enabled) {
    enable();
  }
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
.stats-widget-placeholder {
  display: none;
}
</style>
