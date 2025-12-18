<template>
  <div class="image-widget">
    <img 
      v-if="data.src" 
      :src="data.src" 
      :style="{ objectFit: data.objectFit || 'cover' }"
      alt="Image"
    />
    <div v-else class="placeholder">
      <span class="icon">🖼️</span>
      <span class="text">图片</span>
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
.image-widget {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.image-widget img {
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
  background: #2a2a2a;
  color: #666;
}

.placeholder .icon {
  font-size: 32px;
  opacity: 0.5;
}

.placeholder .text {
  margin-top: 8px;
  font-size: 12px;
}
</style>
