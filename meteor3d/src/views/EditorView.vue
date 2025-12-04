<template>
  <div class="app-container">
    <div class="header">
      <router-link to="/scenes" class="home-link">← 返回场景列表</router-link>
      <h1>Meteor3D Editor</h1>
      <Toolbar />
    </div>
    <div class="main-content">
      <LibraryPanel />
      <div class="viewport-wrapper">
        <Viewport />
      </div>
      <SceneTree />
      <PropertiesPanel />
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import Toolbar from '../components/Toolbar.vue';
import LibraryPanel from '../components/LibraryPanel.vue';
import Viewport from '../components/Viewport.vue';
import SceneTree from '../components/SceneTree.vue';
import PropertiesPanel from '../components/PropertiesPanel.vue';

const route = useRoute();
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

.viewport-wrapper {
  flex: 1;
  position: relative;
}
</style>
