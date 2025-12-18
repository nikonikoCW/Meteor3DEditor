<template>
  <div class="app-list-page">
    <header class="page-header">
      <div class="header-left">
        <img src="/meteor-min.svg" alt="Logo" class="logo" />
        <h1>应用管理</h1>
      </div>
      <button class="create-btn" @click="onCreateApp">
        <span>+</span> 新建应用
      </button>
    </header>

    <main class="page-content">
      <div v-if="loading" class="loading">加载中...</div>
      
      <div v-else-if="apps.length === 0" class="empty-state">
        <div class="empty-icon">📱</div>
        <p>暂无应用</p>
        <button class="create-btn" @click="onCreateApp">创建第一个应用</button>
      </div>

      <div v-else class="app-grid">
        <div v-for="app in apps" :key="app.appId" class="app-card">
          <div class="app-thumbnail">
            <img v-if="app.thumbnail" :src="app.thumbnail" alt="" />
            <div v-else class="placeholder-thumbnail">📱</div>
          </div>
          <div class="app-info">
            <h3 class="app-name">{{ app.name }}</h3>
            <p class="app-meta">
              {{ app.canvas?.width || 1920 }} × {{ app.canvas?.height || 1080 }}
            </p>
            <p class="app-date">{{ formatDate(app.lastModified) }}</p>
          </div>
          <div class="app-actions">
            <button class="edit-btn" @click="onEditApp(app.appId)">编辑</button>
            <button class="delete-btn" @click="onDeleteApp(app)">删除</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as appService from '../services/appService';

const apps = ref([]);
const loading = ref(true);

const loadApps = async () => {
  loading.value = true;
  try {
    apps.value = await appService.getAppList();
  } catch (error) {
    console.error('加载应用列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const onCreateApp = async () => {
  try {
    const result = await appService.createApp({
      name: '未命名应用',
      description: '',
      canvas: { width: 1920, height: 1080, background: '#1a1a1a' },
      widgets: []
    });
    // 跳转到编辑页
    window.location.href = `/?appId=${result.appId}`;
  } catch (error) {
    alert('创建应用失败: ' + error.message);
  }
};

const onEditApp = (appId) => {
  window.location.href = `/?appId=${appId}`;
};

const onDeleteApp = async (app) => {
  if (!confirm(`确定要删除应用 "${app.name}" 吗？此操作不可恢复。`)) {
    return;
  }
  
  try {
    await appService.deleteApp(app.appId);
    apps.value = apps.value.filter(a => a.appId !== app.appId);
  } catch (error) {
    alert('删除失败: ' + error.message);
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  loadApps();
});
</script>

<style scoped>
.app-list-page {
  min-height: 100vh;
  background: #121212;
  color: white;
}

.page-header {
  height: 60px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 32px;
  height: 32px;
}

.page-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #42b983;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.create-btn:hover {
  background: #3aa876;
}

.create-btn span {
  font-size: 18px;
}

.page-content {
  padding: 24px;
}

.loading, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #666;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 20px;
  font-size: 16px;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.app-card {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.app-card:hover {
  border-color: #42b983;
  transform: translateY(-2px);
}

.app-thumbnail {
  height: 160px;
  background: #252525;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-thumbnail {
  font-size: 48px;
  opacity: 0.3;
}

.app-info {
  padding: 16px;
}

.app-name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 500;
}

.app-meta {
  margin: 0 0 4px;
  font-size: 12px;
  color: #888;
}

.app-date {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.app-actions {
  display: flex;
  border-top: 1px solid #333;
}

.app-actions button {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.app-actions button:hover {
  background: #252525;
}

.edit-btn {
  border-right: 1px solid #333;
}

.edit-btn:hover {
  color: #42b983;
}

.delete-btn:hover {
  color: #ff6b6b;
}
</style>
