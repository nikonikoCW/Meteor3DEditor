<template>
  <div class="widget-panel">
    <h3>组件库</h3>
    
    <div class="widget-list">
        <div 
            v-for="widget in availableWidgets" 
            :key="widget.type"
            class="widget-item" 
            draggable="true" 
            @dragstart="onDragStart($event, widget.type)"
        >
            <span class="icon">{{ widget.icon }}</span>
            <span class="label">{{ widget.label }}</span>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getRegisteredWidgets } from '../core/widgetRegistry';

const availableWidgets = ref([]);

onMounted(() => {
    availableWidgets.value = getRegisteredWidgets();
});

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

h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 16px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
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
    gap: 10px;
}

.widget-item:hover {
    background: #444;
}

.icon {
    font-size: 16px;
}
</style>
