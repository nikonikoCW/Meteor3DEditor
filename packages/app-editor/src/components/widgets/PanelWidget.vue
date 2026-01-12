<template>
  <div class="panel-widget" :style="style">
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

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

const style = computed(() => ({
  backgroundColor: props.data.backgroundColor || 'rgba(30, 30, 40, 0.8)',
  borderRadius: (props.data.borderRadius || 0) + 'px',
  borderWidth: (props.data.borderWidth || 0) + 'px',
  borderStyle: 'solid',
  borderColor: props.data.borderColor || 'transparent',
  backdropFilter: props.data.backdropBlur ? `blur(${props.data.backdropBlur}px)` : 'none',
  width: '100%',
  height: '100%',
  boxSizing: 'border-box'
}));
</script>

<style scoped>
.panel-widget {
  overflow: hidden;
  pointer-events: auto; /* 允许交互 */
}
</style>
