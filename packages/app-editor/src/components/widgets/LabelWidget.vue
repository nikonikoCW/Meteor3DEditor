<template>
  <!-- 3D 逻辑组件：无 UI，仅在组件树中可见 -->
  <div class="label-widget-placeholder" v-if="false"></div>
</template>

<script setup>
import { inject, watch, onMounted, onBeforeUnmount, ref } from 'vue';
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
    default: ''
  }
});

const appStore = useAppStore();
const sceneContext = inject('sceneContext', null);

// 已创建的标签 ID 列表
const createdLabelIds = ref([]);

// 动态注入的 style 元素
let styleElement = null;

// 获取 Core 实例
const getCoreInstance = () => {
  if (sceneContext && typeof sceneContext.getInstance === 'function') {
    return sceneContext.getInstance();
  }
  return appStore.sceneInstance;
};

/**
 * 模板变量替换
 * 将 {{variable}} 替换为实际值
 */
const renderTemplate = (template, data) => {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
};

/**
 * 注入样式到页面
 */
const injectStyle = (cssText) => {
  if (!cssText) return;
  
  // 移除旧样式
  removeStyle();
  
  // 创建新的 style 元素
  styleElement = document.createElement('style');
  styleElement.setAttribute('data-label-widget', props.widgetId);
  styleElement.textContent = cssText;
  document.head.appendChild(styleElement);
};

/**
 * 移除样式
 */
const removeStyle = () => {
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
};

/**
 * 创建所有标签
 */
const createLabels = () => {
  const instance = getCoreInstance();
  if (!instance) {
    console.warn('[LabelWidget] Scene not ready');
    return;
  }

  const { template, style, labels } = props.data.labelConfig || {};
  
  if (!labels || !Array.isArray(labels) || labels.length === 0) {
    console.log('[LabelWidget] No labels data');
    return;
  }

  // 注入样式
  injectStyle(style);

  // 批量创建标签
  for (const labelData of labels) {
    const content = renderTemplate(template, labelData);
    
    const labelId = instance.createLabel({
      id: labelData.id || undefined,
      lngLat: {
        lng: labelData.lng,
        lat: labelData.lat,
        height: labelData.height || 0
      },
      content: content,
      style: {} // 样式通过 CSS 注入
    });

    if (labelId) {
      createdLabelIds.value.push(labelId);
    }
  }

  console.log(`[LabelWidget] Created ${createdLabelIds.value.length} labels`);
};

/**
 * 清除所有标签
 */
const clearLabels = () => {
  const instance = getCoreInstance();
  if (!instance) return;

  // 逐个移除
  for (const id of createdLabelIds.value) {
    try {
      instance._internal?.sceneManager?.labelManager?.removeLabel(id);
    } catch (e) {
      // ignore
    }
  }
  createdLabelIds.value = [];
  
  // 移除样式
  removeStyle();
  
  console.log('[LabelWidget] Labels cleared');
};

/**
 * 启用标签
 */
const enable = () => {
  clearLabels();  // 先清除旧的
  createLabels();
};

/**
 * 禁用标签
 */
const disable = () => {
  clearLabels();
};

// 监听 enabled 变化
watch(() => props.enabled, (isEnabled) => {
  if (isEnabled) {
    enable();
  } else {
    disable();
  }
});

// 监听 data 变化（模板或数据更新时重新创建）
watch(() => props.data, () => {
  if (props.enabled) {
    enable();  // 重新创建
  }
}, { deep: true });

// 组件挂载
onMounted(() => {
  if (props.enabled) {
    // 延迟执行，确保场景已完全加载
    setTimeout(() => {
      enable();
    }, 500);
  }
});

// 组件卸载
onBeforeUnmount(() => {
  disable();
});

// 暴露方法
defineExpose({
  enable,
  disable
});
</script>

<style scoped>
.label-widget-placeholder {
  display: none;
}
</style>
