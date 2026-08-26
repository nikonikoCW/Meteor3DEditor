<template>
  <!-- 3D 逻辑组件：无 UI -->
  <div class="center-rotate-widget-placeholder" v-if="false"></div>
</template>

<script setup>
import { inject, watch, onBeforeUnmount } from 'vue';
import { useAppStore } from '../../stores/appStore';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  enabled: {
    type: Boolean,
    default: false
  }
});

const appStore = useAppStore();
const sceneContext = inject('sceneContext', null);

const getCoreInstance = () => {
  if (sceneContext && typeof sceneContext.getInstance === 'function') {
    return sceneContext.getInstance();
  }
  return appStore.sceneInstance;
};

const applyConfig = () => {
  const instance = getCoreInstance();
  if (!instance) return;

  instance.setAutoRotate(props.enabled, props.data.speed);
};

watch(() => props.enabled, () => {
  applyConfig();
});

watch(() => props.data.speed, () => {
  if (props.enabled) {
    applyConfig();
  }
});

watch(() => appStore.isSceneReady, (isReady) => {
  if (isReady) {
    applyConfig();
  }
}, { immediate: true });

onBeforeUnmount(() => {
  const instance = getCoreInstance();
  if (instance) {
    instance.setAutoRotate(false);
  }
});
</script>
