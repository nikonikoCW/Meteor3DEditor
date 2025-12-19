<template>
  <button 
    class="btn-widget" 
    :style="{
      backgroundColor: data.color || '#00ccff',
      fontSize: (data.fontSize || 14) + 'px',
      borderRadius: (data.borderRadius || 4) + 'px'
    }"
    @click="handleClick"
  >
    {{ data.label || '按钮' }}
  </button>
</template>

<script setup>
const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  widgetId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['widget-event']);

const handleClick = () => {
  emit('widget-event', { event: 'click' });
};
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
  font-weight: 500;
  transition: all 0.2s;
}

.btn-widget:hover {
  filter: brightness(1.1);
}

.btn-widget:active {
  filter: brightness(0.9);
}
</style>
