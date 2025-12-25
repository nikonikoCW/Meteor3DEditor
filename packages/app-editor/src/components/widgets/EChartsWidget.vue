<template>
  <div class="echarts-widget" ref="chartRef"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts';
import { executeEChartsCode, validateCode } from '../../utils/codeExecutor';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const chartRef = ref(null);
let chart = null;

// 默认示例代码
const defaultCode = `option = {
  title: {
    text: 'ECharts 示例',
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
  },
  series: [{
    type: 'line',
    data: [120, 200, 150, 80, 70, 110, 130],
    itemStyle: { color: '#42b983' },
    areaStyle: { color: 'rgba(66,185,131,0.2)' }
  }]
};`;

const getOption = () => {
  const code = props.data.code || defaultCode;
  
  // 验证代码安全性
  const validation = validateCode(code);
  if (!validation.valid) {
    console.warn('[EChartsWidget] 代码验证失败:', validation.error);
    return getErrorOption(validation.error);
  }
  
  // 执行代码获取 option
  const result = executeEChartsCode(code, echarts);
  
  if (result.error) {
    return getErrorOption(result.error);
  }
  
  if (!result.option) {
    return getErrorOption('代码执行成功但未返回 option，请确保设置了 option 变量');
  }
  
  return result.option;
};

// 错误显示 option
const getErrorOption = (message) => ({
  title: {
    text: '⚠️ ' + message,
    textStyle: { color: '#ff6b6b', fontSize: 12 },
    left: 'center',
    top: 'center'
  }
});

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

watch(() => props.data.code, () => {
  if (chart) {
    chart.clear();
    chart.setOption(getOption());
  }
}, { deep: true });
</script>

<style scoped>
.echarts-widget {
  width: 100%;
  height: 100%;
  min-height: 100px;
}
</style>
