<template>
  <button class="btn-widget" :style="{ backgroundColor: data.color }">
    {{ data.label || 'Button' }}
  </button>
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
.btn-widget {
    width: 100%;
    height: 100%;
    background: #00ccff;
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
}
</style>
