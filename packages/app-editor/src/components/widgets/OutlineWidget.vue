<template>
  <!-- 3D 逻辑组件：无 UI，仅在组件树中可见 -->
  <div class="outline-widget-placeholder" v-if="false">
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
const uuid = computed(() => props.data.uuid || '');
const color = computed(() => {
  const c = props.data.color || '#00ff00';
  // 转换 hex 颜色为数字
  return parseInt(c.replace('#', ''), 16);
});
const thickness = computed(() => props.data.thickness ?? 1);
const strength = computed(() => props.data.strength ?? 3);

// 启用描边
const enable = () => {
  const instance = getCoreInstance();
  if (!instance) {
    console.warn('[OutlineWidget] Scene not ready');
    return;
  }
  
  if (!uuid.value) {
    console.warn('[OutlineWidget] UUID is required');
    return;
  }
  
  instance.enableOutline(uuid.value, {
    color: color.value,
    thickness: thickness.value,
    strength: strength.value
  });
  console.log('[OutlineWidget] Outline enabled for:', uuid.value);
};

// 禁用描边
const disable = () => {
  const instance = getCoreInstance();
  if (instance && uuid.value) {
    instance.disableOutline(uuid.value);
    console.log('[OutlineWidget] Outline disabled for:', uuid.value);
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

// 监听参数变化，自动更新描边效果
watch([uuid, color, thickness, strength], () => {
  if (props.enabled && uuid.value) {
    enable();
  }
}, { deep: true });

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
.outline-widget-placeholder {
  display: none;
}
</style>
