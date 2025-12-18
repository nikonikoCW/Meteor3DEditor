<template>
  <div class="echarts-widget" ref="chartRef"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const chartRef = ref(null);
let chart = null;

const getOption = () => {
  const { chartType = 'line', title = '图表' } = props.data;
  
  // 示例数据
  const baseOption = {
    title: {
      text: title,
      textStyle: { color: '#ccc', fontSize: 14 }
    },
    tooltip: { trigger: 'axis' },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      top: '20%'
    },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#888' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#888' },
      splitLine: { lineStyle: { color: '#333' } }
    }
  };

  if (chartType === 'pie') {
    return {
      title: baseOption.title,
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 1048, name: 'A' },
          { value: 735, name: 'B' },
          { value: 580, name: 'C' },
          { value: 484, name: 'D' }
        ],
        label: { color: '#ccc' }
      }]
    };
  }

  return {
    ...baseOption,
    series: [{
      type: chartType,
      data: [120, 200, 150, 80, 70, 110, 130],
      itemStyle: { color: '#42b983' },
      areaStyle: chartType === 'line' ? { color: 'rgba(66,185,131,0.2)' } : undefined
    }]
  };
};

const initChart = () => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value, 'dark');
    chart.setOption(getOption());
  }
};

const resizeChart = () => {
  chart?.resize();
};

onMounted(() => {
  initChart();
  window.addEventListener('resize', resizeChart);
  
  // 监听容器尺寸变化
  const observer = new ResizeObserver(resizeChart);
  observer.observe(chartRef.value);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
  chart?.dispose();
});

watch(() => props.data, () => {
  chart?.setOption(getOption());
}, { deep: true });
</script>

<style scoped>
.echarts-widget {
  width: 100%;
  height: 100%;
  min-height: 100px;
}
</style>
