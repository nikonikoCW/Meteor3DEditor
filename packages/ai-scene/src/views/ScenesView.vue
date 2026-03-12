<template>
  <div class="scenes-view">
    <div class="header">
      <h1>🤖 AI 空间场景</h1>
      <p class="header-desc">选择一个场景，开始智能空间对话</p>
    </div>

    <div class="scenes-grid" v-if="scenes.length > 0">
      <div 
        v-for="scene in scenes" 
        :key="scene.sceneId"
        class="scene-card"
        @click="enterAiPreview(scene.sceneId)"
      >
        <div class="scene-preview">
          <span class="scene-icon">🏙️</span>
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
        <div class="scene-action-hint">
          进入 AI 对话 →
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="pagination.total > 0">
      <button class="page-btn" :disabled="pagination.page <= 1" @click="goToPage(pagination.page - 1)">
        ‹ 上一页
      </button>
      <span class="page-info">第 {{ pagination.page }} / {{ pagination.totalPages }} 页 · 共 {{ pagination.total }} 个场景</span>
      <button class="page-btn" :disabled="pagination.page >= pagination.totalPages" @click="goToPage(pagination.page + 1)">
        下一页 ›
      </button>
    </div>

    <div v-if="scenes.length === 0 && !loading" class="empty-state">
      <p>暂无可用场景</p>
      <p class="hint">请先在场景编辑器中创建场景</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getScenes } from '../services/sceneService';

const router = useRouter();
const scenes = ref([]);
const loading = ref(false);

const pagination = ref({
  page: 1,
  pageSize: 12,
  total: 0,
  totalPages: 0
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

const enterAiPreview = (sceneId) => {
  router.push(`/preview/${sceneId}`);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};

onMounted(() => {
  loadScenes(1);
});
</script>

<style scoped>
.scenes-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #0a0a0f;
  color: white;
}

.header {
  padding: 60px 30px 40px;
  text-align: center;
  background: linear-gradient(180deg, rgba(0,212,255,0.08) 0%, transparent 100%);
}

.header h1 {
  font-size: 36px;
  margin: 0 0 10px;
  background: linear-gradient(135deg, #00d4ff, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-desc {
  font-size: 16px;
  color: #94a3b8;
  margin: 0;
}

.scenes-grid {
  flex: 1;
  padding: 30px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  align-content: start;
}

.scene-card {
  background: rgba(20, 20, 30, 0.8);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.scene-card:hover {
  transform: translateY(-6px);
  border-color: #00d4ff;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 212, 255, 0.15);
}

.scene-preview {
  height: 140px;
  background: linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(124,58,237,0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-icon {
  font-size: 52px;
}

.scene-info {
  padding: 18px;
}

.scene-name {
  font-size: 17px;
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

.scene-action-hint {
  padding: 12px 18px;
  border-top: 1px solid rgba(255,255,255,0.05);
  color: #00d4ff;
  font-weight: 600;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.scene-card:hover .scene-action-hint {
  opacity: 1;
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 30px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.page-btn {
  padding: 10px 20px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: rgba(0, 212, 255, 0.1);
  border-color: #00d4ff;
  color: white;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  color: #666;
  font-size: 14px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  padding: 60px;
}

.empty-state .hint {
  color: #444;
  font-size: 14px;
  margin-top: 8px;
}
</style>
