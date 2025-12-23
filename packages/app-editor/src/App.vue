<script setup>
import { ref, computed, onMounted } from 'vue';
import AppEditorView from './views/AppEditorView.vue';
import AppListView from './views/AppListView.vue';
import AppPreviewView from './views/AppPreviewView.vue';

// 简单路由：根据 URL 参数决定显示哪个页面
const currentView = ref('list');

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('appId')) {
    // 检查是否是预览模式
    if (params.get('mode') === 'preview') {
      currentView.value = 'preview';
    } else {
      currentView.value = 'editor';
    }
  } else {
    currentView.value = 'list';
  }
});

// 监听 URL 变化
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('appId')) {
    currentView.value = params.get('mode') === 'preview' ? 'preview' : 'editor';
  } else {
    currentView.value = 'list';
  }
});
</script>

<template>
  <AppPreviewView v-if="currentView === 'preview'" />
  <AppEditorView v-else-if="currentView === 'editor'" />
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
