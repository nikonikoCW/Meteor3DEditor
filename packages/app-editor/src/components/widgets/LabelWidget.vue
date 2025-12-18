<template>
  <div class="label-widget">
    <div class="placeholder">
      <span class="icon">🏷️</span>
      <span class="text">{{ data.text || '3D 标签' }}</span>
      <span class="note">需绑定场景组件</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});
</script>

<style scoped>
.label-widget {
  width: 100%;
  height: 100%;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2a2a3a 0%, #1a1a2a 100%);
  border: 1px dashed #444;
  color: #888;
}

.icon {
  font-size: 24px;
}

.text {
  margin-top: 6px;
  font-size: 13px;
  color: #aaa;
}

.note {
  margin-top: 4px;
  font-size: 10px;
  color: #555;
  font-style: italic;
}
</style>
