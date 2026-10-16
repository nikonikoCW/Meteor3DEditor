<template>
  <!-- 三维逻辑组件：通过 Core SDK 渲染，不占二维画布。 -->
  <span v-if="false"></span>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue';
import { useAppStore } from '../../stores/appStore';
import { message } from '../../utils/message';

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  enabled: { type: Boolean, default: true },
  widgetId: { type: String, default: '' }
});
const appStore = useAppStore();
let version = 0;
let billboards = [];

const disable = () => {
  ++version;
  billboards.forEach(({ instance, id }) => instance.removeBillboard(id));
  billboards = [];
};
const enable = () => {
  disable();
  const instance = appStore.sceneInstance;
  if (!appStore.isSceneReady || !instance) return;
  const items = props.data.config ?? [];
  if (!Array.isArray(items)) {
    message.warning('广告牌空间配置必须是数组');
    return;
  }
  const currentVersion = version;
  items.forEach(async item => {
    if (!item?.url) return;
    try {
      const id = await instance.createBillboard({ ...item, rotationUnit: 'degrees' });
      // 旧请求晚返回时从原场景清理，避免禁用或切换后残留。
      if (version !== currentVersion) instance.removeBillboard(id);
      else billboards.push({ instance, id });
    } catch (error) {
      if (version === currentVersion) message.warning(`广告牌加载失败：${error.message}`);
    }
  });
};

watch([
  () => props.enabled,
  () => props.data,
  () => appStore.isSceneReady,
  () => appStore.sceneInstance
], () => {
  if (props.enabled) enable();
  else disable();
}, { deep: true, immediate: true });

onBeforeUnmount(disable);
defineExpose({ enable, disable });
</script>
