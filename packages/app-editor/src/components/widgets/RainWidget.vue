<template>
  <!-- 3D 逻辑组件：无 UI -->
  <div class="rain-widget-placeholder" v-if="false"></div>
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

  // 确保 enabled 状态正确
  instance.setRain(props.enabled, {
    count: props.data.count,
    speed: props.data.speed
  });
};

// 监听 enabled 变化
watch(() => props.enabled, (isEnabled) => {
  const instance = getCoreInstance();
  if (instance) {
    instance.setRain(isEnabled);
  }
});

// 监听 data 变化
watch(() => props.data, (newData) => {
  const instance = getCoreInstance();
  if (instance && props.enabled) {
    instance.updateRainConfig({
      count: newData.count,
      speed: newData.speed
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
    instance.setRain(false);
  }
});
</script>
