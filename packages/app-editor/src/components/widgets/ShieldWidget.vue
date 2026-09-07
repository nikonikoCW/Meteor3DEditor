<template>
  <!-- 3D 逻辑组件：无 UI，仅在组件树中可见 -->
  <div class="shield-widget-placeholder" v-if="false"></div>
</template>

<script setup>
import { inject, watch, onMounted, onBeforeUnmount, ref } from 'vue';
import { useAppStore } from '../../stores/appStore';
import { getLabelLocation as getLocation } from '../../utils/labelCoordinates';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  // 属性面板参数
  color: {
    type: String,
    default: '#00ff00'
  },
  scale: {
    type: Number,
    default: 5
  },
  enabled: {
    type: Boolean,
    default: true
  },
  widgetId: {
    type: String,
    default: ''
  }
});

const appStore = useAppStore();
const sceneContext = inject('sceneContext', null);

// 保存特效实例 ID 列表
const effectIds = ref([]);

// 获取 Core 实例
const getCoreInstance = () => {
  if (sceneContext && typeof sceneContext.getInstance === 'function') {
    return sceneContext.getInstance();
  }
  return appStore.sceneInstance;
};

/**
 * 清除所有特效
 */
const clearEffects = () => {
  const instance = getCoreInstance();
  if (!instance) return;

  effectIds.value.forEach(id => {
    instance.removeEffect(id);
  });
  effectIds.value = [];
};

/**
 * 创建或更新特效
 */
const updateEffect = () => {
  const instance = getCoreInstance();
  if (!instance) return;

  // 先清除旧的
  clearEffects();

  // 获取数据配置
  const items = props.data.config;
  
  if (!Array.isArray(items)) {
    console.warn('[ShieldWidget] Config data should be an array');
    return;
  }
  items.forEach(item => {
    let position;
    try {
      const location = getLocation(item);
      position = location.position ?? instance.lngLatToWorld(
        location.lngLat.lng, location.lngLat.lat, location.lngLat.height
      );
      if (!position) {
        console.warn('[ShieldWidget] 跳过无法转换经纬度的特效，请先启用地理环境');
        return;
      }
    } catch (error) {
      console.warn('[ShieldWidget] 跳过坐标无效的特效:', error.message);
      return;
    }

    const config = {
      position: position,
      scale: props.data.scale ?? props.scale, // 属性面板参数存储在 data 中
      color: props.data.color ?? props.color
    };

    const effect = instance.createEffect('shield', config);
    if (effect && effect.id) {
      effectIds.value.push(effect.id);
    }
  });
};

// 监听属性变化
watch([
  () => props.color,
  () => props.scale,
  () => props.data
], () => {
  if (props.enabled) {
    updateEffect();
  }
}, { deep: true });

// 监听 enabled 变化
watch(() => props.enabled, (isEnabled) => {
  if (isEnabled) {
    updateEffect();
  } else {
    clearEffects();
  }
});

// 监听场景就绪状态
watch(() => appStore.isSceneReady, (isReady) => {
  if (isReady && props.enabled) {
    updateEffect();
  }
}, { immediate: true });

// 组件挂载
onMounted(() => {
  // 依赖 isReady 监听
});

// 组件卸载
onBeforeUnmount(() => {
  clearEffects();
});

// 暴露方法
defineExpose({
  enable: updateEffect,
  disable: clearEffects
});
</script>

<style scoped>
.shield-widget-placeholder {
  display: none;
}
</style>
