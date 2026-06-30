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
            :id="tab.id === 'gis' ? 'gis-tab' : undefined"
            :class="{ active: activeRightTab === tab.id }"
            @click="activeRightTab = tab.id"
            :title="tab.title"
          >
            <span class="icon iconfont" :class="tab.icon"></span>
          </div>
        </div>
        <div class="panel-content">
          <PropertiesPanel v-show="activeRightTab === 'properties'" />
          <MaterialPanel v-show="activeRightTab === 'material'" />
          <SceneSettingsPanel v-show="activeRightTab === 'settings'" />
          <GisSettingsPanel v-show="activeRightTab === 'gis'" />
          <WeatherPanel v-show="activeRightTab === 'weather'" />
          <CameraSpeedPanel v-show="activeRightTab === 'camera-speed'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch, ref, nextTick } from 'vue';
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
import CameraSpeedPanel from '../components/CameraSpeedPanel.vue';
import { startOnboarding } from '../utils/onboarding';

const route = useRoute();
const activeRightTab = ref('properties');

const rightTabs = [
  { 
    id: 'properties', 
    title: '属性',
    icon: 'me-shuxing'
  },
  { 
    id: 'material', 
    title: '材质',
    icon: 'me-mobang'
  },
  { 
    id: 'settings', 
    title: '设置',
    icon: 'me-xitong'
  },
  { 
    id: 'gis', 
    title: 'GIS配置',
    icon: 'me-gis_changjing'
  },
  { 
    id: 'weather', 
    title: '天气',
    icon: 'me-nongyun'
  },
  {
    id: 'camera-speed',
    title: '相机速度',
    icon: 'me-jianpan'
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
  }

  // 新手引导：等待资源库加载完成后启动
  if (route.query.onboarding === '1') {
    const onLibraryLoaded = () => {
      window.removeEventListener('library-loaded', onLibraryLoaded);
      nextTick(() => {
        startOnboarding({
          onSwitchToGisTab: () => {
            activeRightTab.value = 'gis';
          }
        });
      });
    };
    window.addEventListener('library-loaded', onLibraryLoaded);
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #333;
}

.header h1 {
  font-size: 18px;
  margin: 0;
  grid-column: 2;
  text-align: center;
}

.home-link {
  justify-self: start;
  color: #aaa;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.home-link:hover {
  color: white;
}

.header :deep(.toolbar) {
  justify-self: end;
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
  font-size: 18px;
}

.panel-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-width: 0;
}
</style>
