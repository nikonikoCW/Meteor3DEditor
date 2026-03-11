<template>
  <div class="scenes-view">
    <div class="header">
      <router-link to="/" class="home-link">← 返回主页</router-link>
      <h1>场景管理</h1>
      <button class="create-btn" @click="showCreateModal = true">
        <span>➕</span> 新建场景
      </button>
    </div>

    <div class="scenes-grid" v-if="scenes.length > 0">
      <div 
        v-for="scene in scenes" 
        :key="scene.sceneId"
        class="scene-card"
        @click="enterScene(scene.sceneId)"
      >
        <div class="scene-preview">
          <span class="scene-icon">🏝️</span>
        </div>
        <div class="scene-info">
          <div class="scene-name" :title="scene.name">
            {{ scene.name }}
          </div>
          <div class="scene-desc" :title="scene.description">
            {{ scene.description || '暂无描述' }}
          </div>
          <div class="scene-meta">
            <span>{{ scene.objectCount || 0 }} 个对象</span>
            <span>{{ formatDate(scene.lastModified) }}</span>
          </div>
        </div>
        <div class="scene-actions">
          <button 
            class="action-btn preview-btn" 
            @click.stop="enterPreview(scene.sceneId)"
            title="预览并对话"
          >
            👁️
          </button>
          <button 
            class="action-btn delete-btn" 
            @click.stop="handleDelete(scene)"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
    <!-- 分页组件（始终显示） -->
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
      <span class="page-info">共 {{ pagination.total }} 个场景</span>
    </div>

    <div v-if="scenes.length === 0 && !loading" class="empty-state">
      <p>暂无场景</p>
      <p class="hint">点击上方"新建场景"按钮开始创建</p>
    </div>

    <!-- 创建场景模态框 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h3>新建场景</h3>
        <div class="form-group">
          <label>场景名称</label>
          <input v-model="newScene.name" type="text" placeholder="请输入场景名称" ref="nameInput">
        </div>
        <div class="form-group">
          <label>描述 (可选)</label>
          <textarea v-model="newScene.description" placeholder="请输入场景描述"></textarea>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" @click="showCreateModal = false">取消</button>
          <button class="confirm-btn" @click="handleCreate" :disabled="!newScene.name">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { getScenes, createScene, deleteScene } from '../services/sceneService';
import { message } from '../utils/message';

const router = useRouter();
const scenes = ref([]);
const showCreateModal = ref(false);
const newScene = ref({ name: '', description: '' });
const nameInput = ref(null);
const loading = ref(false);

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

const loadScenes = async (page = pagination.value.page) => {
  loading.value = true;
  try {
    const result = await getScenes(page, pagination.value.pageSize);
    scenes.value = result.scenes;
    pagination.value = result.pagination;
  } catch (error) {
    console.error('加载场景列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const goToPage = (page) => {
  if (page < 1 || page > pagination.value.totalPages) return;
  loadScenes(page);
};

// 切换每页数量时重新加载
const onPageSizeChange = () => {
  loadScenes(1); // 回到第一页
};

const enterScene = (sceneId) => {
  router.push(`/editor/${sceneId}`);
};

const enterPreview = (sceneId) => {
  router.push(`/preview/${sceneId}`);
};

const handleCreate = async () => {
  if (!newScene.value.name) return;

  try {
    await createScene(newScene.value.name, newScene.value.description);
    showCreateModal.value = false;
    newScene.value = { name: '', description: '' };
    await loadScenes(1); // 创建后回到第一页
  } catch (error) {
    message.error('创建场景失败: ' + error.message);
  }
};

const handleDelete = async (scene) => {
  if (!confirm(`确定要删除场景 "${scene.name}" 吗？此操作不可恢复。`)) {
    return;
  }

  try {
    await deleteScene(scene.sceneId);
    await loadScenes(); // 删除后刷新当前页
  } catch (error) {
    message.error('删除场景失败: ' + error.message);
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// 自动聚焦输入框
const focusInput = () => {
  if (showCreateModal.value && nameInput.value) {
    nextTick(() => {
      nameInput.value.focus();
    });
  }
};

onMounted(() => {
  loadScenes(1);
});
</script>

<style scoped>
.scenes-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
  color: white;
}

.header {
  height: 60px;
  background: #222;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  border-bottom: 1px solid #333;
}

.header h1 {
  font-size: 24px;
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

.create-btn {
  padding: 10px 20px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.create-btn:hover {
  background: #0052a3;
}

.scenes-grid {
  flex: 1;
  padding: 30px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  overflow-y: auto;
  align-content: start;
}

.scene-card {
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  position: relative;
}

.scene-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.scene-preview {
  height: 140px;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-icon {
  font-size: 48px;
}

.scene-info {
  padding: 15px;
}

.scene-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-desc {
  font-size: 13px;
  color: #888;
  margin-bottom: 10px;
  height: 36px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.scene-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.scene-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  opacity: 0;
  transition: opacity 0.2s;
}

.scene-card:hover .scene-actions {
  opacity: 1;
}

.action-btn {
  padding: 6px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  margin-left: 5px;
}

.preview-btn:hover {
  background: #0066cc;
}

.delete-btn:hover {
  background: #cc0000;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #2a2a2a;
  padding: 30px;
  border-radius: 8px;
  width: 400px;
}

.modal h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #aaa;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group textarea {
  height: 80px;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #0066cc;
  outline: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn,
.confirm-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn {
  background: transparent;
  color: #aaa;
}

.cancel-btn:hover {
  color: white;
}

.confirm-btn {
  background: #0066cc;
  color: white;
}

.confirm-btn:hover {
  background: #0052a3;
}

.confirm-btn:disabled {
  background: #444;
  cursor: not-allowed;
}

/* 分页样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 30px;
  background: #1a1a1a;
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
  border-color: #0066cc;
}

.page-size-selector select:focus {
  outline: none;
  border-color: #0066cc;
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
  border-color: #0066cc;
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
  background: #0066cc;
  border-color: #0066cc;
  color: white;
}

.page-info {
  color: #666;
  font-size: 13px;
  margin-left: 12px;
}
</style>
