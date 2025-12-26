<template>
  <!-- 3D 逻辑组件：无 UI -->
  <div class="camera-widget-placeholder" v-if="false"></div>
</template>

<script setup>
import { inject, watch, onMounted } from 'vue';
import { useAppStore } from '../../stores/appStore';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  enabled: {
    type: Boolean,
    default: true
  },
  widgetId: {
    type: String,
    required: true
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

// 监听 captureTrigger 变化（由属性面板按钮触发）
watch(() => props.data.captureTrigger, () => {
  const instance = getCoreInstance();
  if (instance) {
    // 获取当前视角
    const view = instance.getView();
    
    // 更新组件数据
    // 注意：我们需要更新 store 中的 widget 数据，而不是直接修改 props
    const widget = appStore.widgets.find(w => w.id === props.widgetId);
    if (widget) {
      widget.data.viewData = JSON.stringify(view, null, 2);
      console.log('[CameraWidget] View captured:', view);
    }
  } else {
    console.warn('[CameraWidget] Scene not ready');
  }
});

// 监听 enabled 属性变化（由交互系统触发）
watch(() => props.enabled, (isEnabled) => {
  if (isEnabled) {
    restore();
  }
});

// 组件挂载时，如果初始状态为启用，则执行恢复
onMounted(() => {
  if (props.enabled) {
    restore();
  }
});

// 恢复视角动作
const restore = () => {
  const instance = getCoreInstance();
  if (instance && props.data.viewData) {
    try {
      const view = JSON.parse(props.data.viewData);
      console.log('[CameraWidget] Restoring view:', view);
      
      instance.setView({
        position: view.position,
        target: view.target,
        duration: props.data.duration !== undefined ? props.data.duration : 2000,
        onComplete: () => {
          console.log('[CameraWidget] View restored');
        }
      });

      // 自动重置 enabled 状态，以便下次可以再次触发
      // 注意：我们需要直接修改 store 中的 widget 状态
      const widget = appStore.widgets.find(w => w.id === props.widgetId);
      if (widget) {
        widget.enabled = false;
      }
    } catch (e) {
      console.error('[CameraWidget] Invalid view data:', e);
    }
  }
};

// 暴露方法给交互系统 (虽然主要通过 enabled 触发，但保留方法以备不时之需)
defineExpose({
  restore
});
</script>

<style scoped>
.camera-widget-placeholder {
  display: none;
}
</style>
