<script setup>
import { ref, computed, onMounted } from 'vue';
import AppEditorView from './views/AppEditorView.vue';
import AppListView from './views/AppListView.vue';

// 简单路由：根据 URL 参数决定显示哪个页面
const currentView = ref('list');

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('appId')) {
    currentView.value = 'editor';
  } else {
    currentView.value = 'list';
  }
});

// 监听 URL 变化
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  currentView.value = params.has('appId') ? 'editor' : 'list';
});
</script>

<template>
  <AppEditorView v-if="currentView === 'editor'" />
  <AppListView v-else />
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
