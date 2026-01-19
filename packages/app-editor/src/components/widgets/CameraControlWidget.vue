<template>
  <!-- 3D 逻辑组件：无 UI，仅在组件树中可见 -->
  <div class="camera-control-widget-placeholder" v-if="false">
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
    default: false // 默认禁用，由交互触发
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

// 应用相机控制模式
const enable = () => {
  const instance = getCoreInstance();
  if (!instance) {
    console.warn('[CameraControlWidget] Scene not ready');
    return;
  }

  const mode = props.data.mode || 'orbit';
  const options = {};

  // Ghost 模式下，检查是否需要锁定鼠标
  if (mode === 'ghost' && props.data.pointerLock) {
    options.pointerLock = true;
  }

  instance.setControlMode(mode, options);
  console.log(`[CameraControlWidget] Mode set to: ${mode}`, options);
};

// 禁用（切回默认轨道模式）
const disable = () => {
  const instance = getCoreInstance();
  if (instance) {
    instance.setControlMode('orbit');
    console.log('[CameraControlWidget] Mode reset to orbit');
  }
};

// 监听 enabled 属性变化
watch(() => props.enabled, (isEnabled) => {
  if (isEnabled) {
    enable();
  }
  // 禁用时不自动切回 orbit，让其他组件接管
});

// 监听场景就绪状态 + enabled
watch(() => appStore.isSceneReady, (isReady) => {
  if (isReady && props.enabled) {
    enable();
  }
}, { immediate: true });

// 组件挂载时检查
onMounted(() => {
  // 依赖 watch 处理
});

// 组件卸载时不做任何处理，保持当前模式
onBeforeUnmount(() => {
  // 不自动切换，让用户控制
});

// 暴露方法给交互系统调用
defineExpose({
  enable,
  disable
});
</script>

<style scoped>
.camera-control-widget-placeholder {
  display: none;
}
</style>
