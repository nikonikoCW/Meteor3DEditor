<template>
  <div class="toolbar">
    <div v-for="(tool, index) in tools" :key="index" class="tool-button" :class="{ active: activeTool === index }"
      @click="selectTool(tool,index)">
      <span :class="tool.class"></span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Define the tools and their labels
const tools = [
  { mode: 'none', class: 'me-jiantou iconfont' },
  { mode: 'translate', class: 'me-yidong iconfont' },
  { mode: 'rotate', class: 'me-xuanzhuan iconfont' },
  { mode: 'scale', class: 'me-moxingsuofang iconfont' },
]
// Track the active tool
const activeTool = ref(0);

// Function to select a tool
const selectTool = (tool,index) => {
  activeTool.value = index;
  meteor3D.setTransFormMode(tool.mode)
};
</script>

<style scoped>
body {
  background: linear-gradient(135deg, #74ebd5, #acb6e5);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

.toolbar {
  width: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Glassmorphism effect */
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1px 0;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

.tool-button {
  width: 30px;
  height: 30px;
  margin: 1px 0;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.tool-button.active {
  background: rgba(0, 123, 255, 0.7);
  box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
}

.tool-button:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}

.tool-button.active:hover {
  background: rgba(0, 123, 255, 0.9);
  box-shadow: 0 0 20px rgba(0, 123, 255, 0.7);
}
</style>