<template>
  <div class="chart-widget">
    <h3>{{ data.title || '图表' }}</h3>
    <div class="chart-placeholder">
        [{{ data.chartType || 'Line' }} Chart Area]
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
.chart-widget {
    width: 100%;
    height: 100%;
    padding: 10px;
    color: white;
    display: flex;
    flex-direction: column;
    background: rgba(0,0,0,0.3);
}
.chart-placeholder {
    flex: 1;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
}
h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    text-align: center;
}
</style>
