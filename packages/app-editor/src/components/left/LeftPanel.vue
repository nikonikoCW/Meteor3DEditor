<template>
  <aside class="left-panel" :class="{ disabled: disabled }">
    <ComponentTree />
    <ComponentMenu :disabled="disabled" />
  </aside>
</template>

<script setup>
import ComponentTree from './ComponentTree.vue';
import ComponentMenu from './ComponentMenu.vue';

defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.left-panel {
  width: 240px;
  background: #1e1e1e;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-panel.disabled {
  opacity: 0.6;
}
</style>
