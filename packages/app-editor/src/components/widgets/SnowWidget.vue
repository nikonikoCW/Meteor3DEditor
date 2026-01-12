<template>
  <!-- 3D 逻辑组件：无 UI -->
  <div class="snow-widget-placeholder" v-if="false"></div>
</template>

<script setup>
import { inject, watch, onMounted, onBeforeUnmount } from 'vue';
import { useAppStore } from '../../stores/appStore';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  enabled: {
    type: Boolean,
    default: true
  }
});

const appStore = useAppStore();
const sceneContext = inject('sceneContext', null);

// 获取 Core 实例
const getCoreInstance = () => {
  if (sceneContext && typeof sceneContext.getInstance === 'function') {
    return sceneContext.getInstance();
  }
  return appStore.sceneInstance;
};

// 应用配置
const applyConfig = () => {
  const instance = getCoreInstance();
  if (!instance) return;

  instance.setSnow(props.enabled, {
    count: props.data.count,
    size: props.data.size,
    speed: props.data.speed,
    opacity: props.data.opacity,
    color: props.data.color
  });
};

// 监听 enabled 变化
watch(() => props.enabled, (isEnabled) => {
  const instance = getCoreInstance();
  if (instance) {
    instance.setSnow(isEnabled);
  }
});

// 监听 data 变化
watch(() => props.data, (newData) => {
  const instance = getCoreInstance();
  if (instance && props.enabled) {
    instance.updateSnowConfig({
      count: newData.count,
      size: newData.size,
      speed: newData.speed,
      opacity: newData.opacity,
      color: newData.color
    });
  }
}, { deep: true });

onMounted(() => {
  // 延迟执行以确保场景就绪
  setTimeout(() => {
    applyConfig();
  }, 100);
});

onBeforeUnmount(() => {
  const instance = getCoreInstance();
  if (instance) {
    instance.setSnow(false);
  }
});
</script>
