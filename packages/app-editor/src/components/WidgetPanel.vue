<template>
  <div class="widget-panel">
    <h3>组件库</h3>
    
    <div class="section">
      <h4>基础组件</h4>
      <div 
          class="widget-item" 
          draggable="true" 
          @dragstart="onDragStart($event, 'Chart')"
      >
          📊 图表 (ECharts)
      </div>
      <div 
          class="widget-item" 
          draggable="true" 
          @dragstart="onDragStart($event, 'Button')"
      >
          🔘 交互按钮
      </div>
    </div>

    <div class="section">
      <h4>3D 场景</h4>
      <div 
          class="widget-item scene-widget" 
          draggable="true" 
          @dragstart="onDragStart($event, 'Scene')"
      >
          🌍 3D 场景容器
      </div>
    </div>
  </div>
</template>

<script setup>
const onDragStart = (event, type) => {
    event.dataTransfer.setData('widgetType', type);
};
</script>

<style scoped>
.widget-panel {
    width: 220px;
    background: #222;
    color: white;
    padding: 15px;
    border-right: 1px solid #333;
    overflow-y: auto;
}

.section {
  margin-bottom: 20px;
}

h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 16px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

h4 {
  font-size: 12px;
  color: #888;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.widget-item {
    padding: 12px;
    background: #333;
    margin-bottom: 10px;
    cursor: grab;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: background 0.2s;
    font-size: 13px;
}

.widget-item:hover {
    background: #444;
}

.scene-widget {
  border: 1px solid #42b983;
  background: rgba(66, 185, 131, 0.1);
}

.scene-widget:hover {
  background: rgba(66, 185, 131, 0.2);
}
</style>
