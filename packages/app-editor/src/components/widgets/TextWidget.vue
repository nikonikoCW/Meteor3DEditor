<template>
  <div 
    class="text-widget"
    :style="{
      fontSize: (data.fontSize || 16) + 'px',
      color: data.color || '#ffffff',
      textAlign: data.textAlign || 'left',
      fontWeight: data.fontWeight || 'normal'
    }"
  >
    {{ data.content || '文本内容' }}
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
.text-widget {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 8px;
  word-break: break-word;
  overflow: hidden;
}
</style>
