<template>
  <div 
    class="clock-widget"
    :style="{
      fontSize: (data.fontSize || 24) + 'px',
      color: data.color || '#ffffff',
      backgroundColor: data.backgroundColor || '#000000'
    }"
  >
    {{ formattedTime }}
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const currentTime = ref(new Date());
let timer = null;

const formattedTime = computed(() => {
  const format = props.data.format || 'HH:mm:ss';
  const date = currentTime.value;
  
  const pad = (n) => String(n).padStart(2, '0');
  
  const replacements = {
    'YYYY': date.getFullYear(),
    'MM': pad(date.getMonth() + 1),
    'DD': pad(date.getDate()),
    'HH': pad(date.getHours()),
    'mm': pad(date.getMinutes()),
    'ss': pad(date.getSeconds())
  };
  
  let result = format;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(key, value);
  }
  
  return result;
});

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.clock-widget {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}
</style>
