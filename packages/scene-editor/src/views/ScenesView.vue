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
            class="action-btn delete-btn" 
            @click.stop="handleDelete(scene)"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
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
import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { getScenes, createScene, deleteScene } from '../services/sceneService';
import { message } from '../utils/message';

const router = useRouter();
const scenes = ref([]);
const showCreateModal = ref(false);
const newScene = ref({ name: '', description: '' });
const nameInput = ref(null);

const loadScenes = async () => {
  try {
    scenes.value = await getScenes();
  } catch (error) {
    console.error('加载场景列表失败:', error);
  }
};

const enterScene = (sceneId) => {
  router.push(`/editor/${sceneId}`);
};

const handleCreate = async () => {
  if (!newScene.value.name) return;

  try {
    await createScene(newScene.value.name, newScene.value.description);
    showCreateModal.value = false;
    newScene.value = { name: '', description: '' };
    await loadScenes();
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
    await loadScenes();
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
  loadScenes();
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
</style>
