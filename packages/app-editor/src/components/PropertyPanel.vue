<template>
  <div class="prop-panel" v-if="selectedWidget">
    <h3>组件属性</h3>
    
    <!-- 通用属性 -->
    <div class="section">
      <h4>基础信息</h4>
      <div class="field">
          <label>类型</label>
          <span class="readonly">{{ selectedWidget.type }}</span>
      </div>
      <div class="field">
          <label>ID</label>
          <span class="readonly sm">{{ selectedWidget.id.slice(0,8) }}...</span>
      </div>
    </div>

    <!-- 布局属性 -->
    <div class="section">
      <h4>布局 (Layout)</h4>
      <div class="row">
        <div class="field half">
            <label>X</label>
            <input type="number" v-model.number="selectedWidget.position.x">
        </div>
        <div class="field half">
            <label>Y</label>
            <input type="number" v-model.number="selectedWidget.position.y">
        </div>
      </div>
      <div class="row" v-if="selectedWidget.size">
        <div class="field half">
            <label>宽 (W)</label>
            <input type="number" v-model.number="selectedWidget.size.width">
        </div>
        <div class="field half">
            <label>高 (H)</label>
            <input type="number" v-model.number="selectedWidget.size.height">
        </div>
      </div>
    </div>

    <!-- 场景组件特有属性 -->
    <div class="section" v-if="selectedWidget.type === 'Scene'">
      <h4>场景配置</h4>
      <div class="field">
        <label>选择场景</label>
        <select v-model="selectedWidget.data.sceneId" @change="onSceneChange">
          <option value="" disabled>请选择场景</option>
          <option v-for="scene in sceneList" :key="scene.id" :value="scene.id">
            {{ scene.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 图表组件特有属性 -->
    <div class="section" v-if="selectedWidget.type === 'Chart'">
      <h4>图表配置</h4>
      <div class="field">
        <label>标题</label>
        <input type="text" v-model="selectedWidget.data.title" placeholder="输入标题">
      </div>
    </div>

  </div>
  <div class="prop-panel empty" v-else>
    <p>请选择一个组件进行编辑</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAppStore } from '../stores/appStore';
import { storeToRefs } from 'pinia';

const appStore = useAppStore();
const { selectedWidget } = storeToRefs(appStore);
const sceneList = ref([]);

// 获取可用场景列表
const fetchScenes = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/scene/list');
    const data = await response.json();
    if (data.success) {
      sceneList.value = data.scenes;
    }
  } catch (error) {
    console.error('Failed to fetch scenes:', error);
  }
};

onMounted(() => {
  fetchScenes();
});

const onSceneChange = () => {
  // 触发更新可能需要的逻辑
};
</script>

<style scoped>
.prop-panel {
    width: 280px;
    background: #222;
    color: white;
    padding: 15px;
    border-left: 1px solid #333;
    overflow-y: auto;
}

.prop-panel.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

h4 {
  font-size: 12px;
  color: #888;
  margin: 0 0 10px 0;
  text-transform: uppercase;
}

.section {
  margin-bottom: 20px;
  background: #2a2a2a;
  padding: 10px;
  border-radius: 4px;
}

.field {
    margin-bottom: 10px;
}

.row {
  display: flex;
  gap: 10px;
}

.field.half {
  flex: 1;
}

label {
    display: block;
    margin-bottom: 5px;
    color: #aaa;
    font-size: 12px;
}

input, select {
    width: 100%;
    background: #333;
    border: 1px solid #444;
    color: white;
    padding: 6px;
    border-radius: 3px;
    font-size: 13px;
}

input:focus, select:focus {
  outline: none;
  border-color: #42b983;
}

.readonly {
  color: #888;
  font-size: 13px;
}

.readonly.sm {
  font-size: 11px;
}
</style>
