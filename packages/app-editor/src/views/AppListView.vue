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
      
      <div v-else-if="apps.length === 0 && pagination.total === 0" class="empty-state">
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

    <!-- 分页组件（在 main 外部，固定底部） -->
    <div class="pagination" v-if="pagination.total > 0">
      <div class="page-size-selector">
        <span>每页</span>
        <select v-model="pagination.pageSize" @change="onPageSizeChange">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="30">30</option>
        </select>
        <span>条</span>
      </div>
      <button 
        class="page-btn" 
        :disabled="pagination.page <= 1"
        @click="goToPage(pagination.page - 1)"
      >
        ‹ 上一页
      </button>
      <div class="page-numbers" v-if="pagination.totalPages > 1">
        <button 
          v-for="p in visiblePages" 
          :key="p"
          class="page-num"
          :class="{ active: p === pagination.page }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
      </div>
      <span v-else class="page-num active">1</span>
      <button 
        class="page-btn"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goToPage(pagination.page + 1)"
      >
        下一页 ›
      </button>
      <span class="page-info">共 {{ pagination.total }} 个应用</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import * as appService from '../services/appService';

const apps = ref([]);
const loading = ref(true);

// 分页状态
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
});

// 计算可见的页码
const visiblePages = computed(() => {
  const { page, totalPages } = pagination.value;
  const pages = [];
  const maxVisible = 5;
  
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return pages;
});

const loadApps = async (page = pagination.value.page) => {
  loading.value = true;
  try {
    const result = await appService.getAppList(page, pagination.value.pageSize);
    apps.value = result.apps;
    pagination.value = result.pagination;
  } catch (error) {
    console.error('加载应用列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const goToPage = (page) => {
  if (page < 1 || page > pagination.value.totalPages) return;
  loadApps(page);
};

const onPageSizeChange = () => {
  loadApps(1);
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
    await loadApps(); // 刷新当前页
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
  loadApps(1);
});
</script>

<style scoped>
.app-list-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
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
  flex: 1;
  padding: 24px;
  overflow-y: auto;
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

/* 分页样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 30px;
  background: #121212;
  border-top: 1px solid #333;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #888;
  font-size: 13px;
  margin-right: 20px;
}

.page-size-selector select {
  padding: 6px 10px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 13px;
}

.page-size-selector select:hover {
  border-color: #42b983;
}

.page-size-selector select:focus {
  outline: none;
  border-color: #42b983;
}

.page-btn {
  padding: 8px 16px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #444;
  border-color: #42b983;
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-num {
  width: 36px;
  height: 36px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-num:hover {
  background: #444;
  color: white;
}

.page-num.active {
  background: #42b983;
  border-color: #42b983;
  color: white;
}

.page-info {
  color: #666;
  font-size: 13px;
  margin-left: 12px;
}
</style>
