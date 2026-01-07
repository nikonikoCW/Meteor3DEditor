<template>
  <div class="app-container">
    <div class="header">
      <router-link to="/scenes" class="home-link">← 返回场景列表</router-link>
      <h1>Meteor3D Editor</h1>
      <Toolbar />
    </div>
    <div class="main-content">
      <SceneTree />
      <div class="center-panel">
        <div class="viewport-wrapper">
          <Viewport />
        </div>
        <div class="library-wrapper">
          <LibraryPanel />
        </div>
      </div>
      <div class="right-panel">
        <div class="side-tabs">
          <div 
            v-for="tab in rightTabs" 
            :key="tab.id"
            class="tab-item"
            :class="{ active: activeRightTab === tab.id }"
            @click="activeRightTab = tab.id"
            :title="tab.title"
          >
            <span class="icon" v-html="tab.icon"></span>
          </div>
        </div>
        <div class="panel-content">
          <PropertiesPanel v-show="activeRightTab === 'properties'" />
          <MaterialPanel v-show="activeRightTab === 'material'" />
          <SceneSettingsPanel v-show="activeRightTab === 'settings'" />
          <GisSettingsPanel v-show="activeRightTab === 'gis'" />
          <WeatherPanel v-show="activeRightTab === 'weather'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch, ref } from 'vue';
import { useRoute } from 'vue-router';
import Toolbar from '../components/Toolbar.vue';
import LibraryPanel from '../components/LibraryPanel.vue';
import Viewport from '../components/Viewport.vue';
import SceneTree from '../components/SceneTree.vue';
import PropertiesPanel from '../components/PropertiesPanel.vue';
import MaterialPanel from '../components/MaterialPanel.vue';
import SceneSettingsPanel from '../components/SceneSettingsPanel.vue';
import GisSettingsPanel from '../components/GisSettingsPanel.vue';
import WeatherPanel from '../components/WeatherPanel.vue';

const route = useRoute();
const activeRightTab = ref('properties');

const rightTabs = [
  { 
    id: 'properties', 
    title: '属性',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>'
  },
  { 
    id: 'material', 
    title: '材质',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>'
  },
  { 
    id: 'settings', 
    title: '设置',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>'
  },
  { 
    id: 'gis', 
    title: 'GIS配置',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
  },
  { 
    id: 'weather', 
    title: '天气',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h.71C7.37 7.69 9.48 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3s-1.34 3-3 3z"/></svg>'
  }
];

// SceneManager 在 Viewport 组件中初始化，这里不需要实例化

// 注意：PersistenceManager 通常在 Viewport 或其他地方初始化，
// 但为了支持多场景，我们需要确保它使用正确的 sceneId。
// 这里我们可能需要通过某种方式通知 PersistenceManager 切换场景。
// 由于 PersistenceManager 目前是在 Viewport 中初始化的（假设），
// 我们可能需要重构一下，或者在这里通过全局状态/事件来触发加载。

// 更好的做法是将 PersistenceManager 的初始化逻辑移到这里，或者通过 store 传递 sceneId。
// 鉴于目前的架构，我们假设 Viewport 组件会负责初始化 3D 场景，
// 而我们可以通过 store 将 sceneId 传递给它。

onMounted(() => {
  const sceneId = route.params.sceneId;
  if (sceneId) {
    console.log('进入场景:', sceneId);
    // 这里我们可能需要一个全局的事件总线或者 store action 来通知系统加载特定场景
    // 暂时，我们假设 Viewport 组件会读取 route.params.sceneId
  }
});

// 监听路由变化，支持场景切换
watch(
  () => route.params.sceneId,
  (newSceneId) => {
    if (newSceneId) {
      console.log('切换场景:', newSceneId);
      window.location.reload(); // 简单粗暴的方式：刷新页面以重新初始化所有组件
    }
  }
);
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  height: 50px;
  background: #1a1a1a;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
  justify-content: space-between;
  border-bottom: 1px solid #333;
}

.header h1 {
  font-size: 18px;
  margin: 0;
  flex: 1;
  text-align: center;
}

.home-link {
  color: #aaa;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.home-link:hover {
  color: white;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-width: 0; /* 防止子元素撑大容器 */
}

.viewport-wrapper {
  flex: 1;
  position: relative;
  min-height: 0; /* 防止子元素撑大容器 */
}

.library-wrapper {
  height: 250px;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.right-panel {
  width: 320px;
  display: flex;
  flex-direction: row; /* 水平排列：左侧 Tabs，右侧内容 */
  border-left: 1px solid #333;
  background: #222;
}

.side-tabs {
  width: 40px;
  background: #1a1a1a;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.tab-item {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  cursor: pointer;
  border-bottom: 1px solid #2a2a2a;
  transition: all 0.2s;
}

.tab-item:hover {
  color: #ccc;
  background: #222;
}

.tab-item.active {
  color: #0066cc;
  background: #222;
  border-right: 2px solid #0066cc;
  margin-right: -1px; /* 盖住右边框 */
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-width: 0;
}
</style>
