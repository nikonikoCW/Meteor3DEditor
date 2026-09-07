<template>
  <!-- 3D 逻辑组件：无 UI，仅在组件树中可见 -->
  <div class="point-widget-placeholder" v-if="false"></div>
</template>

<script setup>
import { inject, watch, onMounted, onBeforeUnmount, ref } from 'vue';
import { useAppStore } from '../../stores/appStore';
import { getLabelLocation as getLocation } from '../../utils/labelCoordinates';

const props = defineProps({
  // 基础属性
  color: {
    type: String,
    default: '#ff3300'
  },
  scale: {
    type: Number,
    default: 1
  },
  speed: {
    type: Number,
    default: 1.0
  },
  repeat: {
    type: Number,
    default: 3.0
  },
  enabled: {
    type: Boolean,
    default: true
  },
  // 数据配置
  data: {
    type: Object,
    default: () => ({
      config: [] // 默认为空数组
    })
  }
});

const appStore = useAppStore();
const sceneContext = inject('sceneContext', null);

// 特效实例 ID 列表
const effectIds = ref([]);

// 获取核心实例
const getCoreInstance = () => {
  if (sceneContext && typeof sceneContext.getInstance === 'function') {
    return sceneContext.getInstance();
  }
  return appStore.sceneInstance || window.meteor3d;
};

// 创建/更新特效
const updateEffect = () => {
  const instance = getCoreInstance();
  if (!instance) return;

  // 先清除旧的
  clearEffects();

  // 获取数据配置
  const items = props.data.config;
  
  if (!Array.isArray(items)) {
    console.warn('[ScanWidget] Config data should be an array');
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
        console.warn('[ScanWidget] 跳过无法转换经纬度的特效，请先启用地理环境');
        return;
      }
    } catch (error) {
      console.warn('[ScanWidget] 跳过坐标无效的特效:', error.message);
      return;
    }

    const config = {
      position: position,
      scale: props.data.scale ?? props.scale,
      color: props.data.color ?? props.color,
      repeat: props.data.repeat ?? props.repeat,
      // speed 目前 shader 中直接使用 uTime，如果需要控制速度，可能需要修改 shader 或传入 timeScale
    };
    const effect = instance.createEffect('scan', config);
    if (effect && effect.id) {
      effectIds.value.push(effect.id);
    }
  });
};

// 清除特效
const clearEffects = () => {
  const instance = getCoreInstance();
  if (!instance) return;

  effectIds.value.forEach(id => {
    instance.removeEffect(id);
  });
  effectIds.value = [];
};

// 监听属性变化
watch(() => [props.color, props.scale, props.repeat, props.data], () => {
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

// 生命周期
onMounted(() => {
  // 依赖 isReady 监听
});

onBeforeUnmount(() => {
  clearEffects();
});

// 暴露给父组件的方法
defineExpose({
  enable: () => {
    updateEffect();
  },
  disable: () => {
    clearEffects();
  }
});
</script>
