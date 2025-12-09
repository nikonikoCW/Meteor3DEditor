<template>
  <div class="scene-settings-panel">
    <h3>场景配置</h3>
    
    <div class="section">
      <h4>基本信息</h4>
      <div class="prop-row">
        <label>场景名称</label>
        <input type="text" v-model="sceneConfig.name" placeholder="输入场景名称">
      </div>
      <div class="prop-row">
        <label>描述</label>
        <textarea v-model="sceneConfig.description" rows="3" placeholder="场景描述..."></textarea>
      </div>
    </div>

    <div class="section">
      <h4>环境设置</h4>
      <div class="prop-row">
        <label>背景色</label>
        <input type="color" v-model="sceneConfig.backgroundColor">
      </div>
      <div class="prop-row">
        <label>环境光强度</label>
        <input type="number" v-model.number="sceneConfig.ambientIntensity" step="0.1" min="0" max="5">
      </div>
    </div>
    
    <div class="debug-info">
      <small>这里是场景级别的全局配置</small>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';

// 模拟的场景配置数据，未来应该连接到 Store
const sceneConfig = reactive({
  name: '未命名场景',
  description: '',
  backgroundColor: '#000000',
  ambientIntensity: 1.0
});
</script>

<style scoped>
.scene-settings-panel {
  width: 100%;
  height: 100%;
  background: #222;
  color: white;
  padding: 15px;
  overflow-y: auto;
}

h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #fff;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

.section {
  margin-bottom: 20px;
  background: #2a2a2a;
  padding: 10px;
  border-radius: 4px;
}

h4 {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #888;
  font-weight: normal;
  text-transform: uppercase;
}

.prop-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.prop-row label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

input[type="text"],
input[type="number"],
textarea {
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 6px 8px;
  border-radius: 3px;
  font-size: 12px;
  width: 100%;
}

textarea {
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #0066cc;
  outline: none;
}

input[type="color"] {
  width: 100%;
  height: 30px;
  padding: 0;
  border: none;
  cursor: pointer;
}

.debug-info {
  margin-top: 20px;
  color: #444;
  font-size: 10px;
  text-align: center;
}
</style>
