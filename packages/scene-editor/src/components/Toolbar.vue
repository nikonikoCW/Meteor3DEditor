<template>
  <div class="toolbar">
    <div class="group">
      <button @click="toggleCameraMode" :title="cameraMode === 'ghost' ? '切换到轨道模式' : '切换到幽灵模式'">
        {{ cameraMode === 'ghost' ? '轨道模式' : '幽灵模式' }}
      </button>
    </div>
    <div class="group">
      <button @click="setMode('translate')">移动</button>
      <button @click="setMode('rotate')">旋转</button>
      <button @click="setMode('scale')">缩放</button>
    </div>
    <div class="group">
      <button @click="undo">撤销</button>
      <button @click="redo">重做</button>
    </div>
    <div class="group">
      <button @click="showBatchLoader = true" title="批量导入">📥 批量导入</button>
      <button v-if="!canSave" class="unlock-btn" @click="openUnlockModal" title="权限解锁">🔒 权限解锁</button>
      <button v-if="canSave" type="button" @click="save(false)" class="save-btn">💾 保存</button>
    </div>
    
    <BatchLoaderDialog v-model:visible="showBatchLoader" />

    <!-- 权限解锁密码确认弹窗 -->
    <div v-if="showUnlockModal" class="modal-overlay" @click.self="closeUnlockModal">
      <div class="modal">
        <h3>权限解锁</h3>
        <p class="modal-tip">此场景为精品案例，请输入密码验证以解锁保存及自动保存权限。</p>
        <form @submit.prevent="handleUnlockSubmit">
          <div class="form-group">
            <label for="unlock-password">解锁密码</label>
            <input
              id="unlock-password"
              ref="unlockPasswordInput"
              v-model="unlockPassword"
              type="password"
              placeholder="请输入密码"
              autocomplete="off"
              @input="unlockPasswordError = ''"
            />
            <p v-if="unlockPasswordError" class="password-error">{{ unlockPasswordError }}</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="cancel-btn" @click="closeUnlockModal">取消</button>
            <button type="submit" class="confirm-btn">确认解锁</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { message } from '../utils/message';
import { useEditorStore } from '../stores/editorStore';
import BatchLoaderDialog from './BatchLoaderDialog.vue';

const editorStore = useEditorStore();
const showBatchLoader = ref(false);
const cameraMode = ref('orbit');

const showUnlockModal = ref(false);
const unlockPassword = ref('');
const unlockPasswordError = ref('');
const unlockPasswordInput = ref(null);

const isFeatured = computed(() => editorStore.sceneMetadata?.isFeatured || false);
const isUnlocked = computed(() => editorStore.isUnlocked);
const canSave = computed(() => !isFeatured.value || isUnlocked.value);
const allowPartialSave = computed(() => editorStore.allowPartialSave);

const openUnlockModal = () => {
  showUnlockModal.value = true;
  unlockPassword.value = '';
  unlockPasswordError.value = '';
  nextTick(() => unlockPasswordInput.value?.focus());
};

const closeUnlockModal = () => {
  showUnlockModal.value = false;
  unlockPassword.value = '';
  unlockPasswordError.value = '';
};

const handleUnlockSubmit = () => {
  if (unlockPassword.value !== '123456') {
    unlockPasswordError.value = '密码错误';
    unlockPasswordInput.value?.focus();
    return;
  }
  editorStore.isUnlocked = true;
  closeUnlockModal();
  message.success('权限解锁成功！已开启保存及自动保存权限。');
};

const toggleCameraMode = () => {
  const sceneManager = window.editor?.sceneManager;
  if (!sceneManager) return;

  const currentMode = sceneManager.getControlMode();
  const nextMode = currentMode === 'ghost' ? 'orbit' : 'ghost';

  if (sceneManager.setControlMode(nextMode)) {
    cameraMode.value = nextMode;
  }
};

const setMode = (mode) => {
  if (window.editor && window.editor.transformManager) {
    window.editor.transformManager.setMode(mode);
  }
};

const undo = () => {
  if (window.editor && window.editor.historyManager) {
    window.editor.historyManager.undo();
  }
};

const redo = () => {
  if (window.editor && window.editor.historyManager) {
    window.editor.historyManager.redo();
  }
};

const isSaving = ref(false);

const save = async (isAutoSave = false) => {
  if (!canSave.value || isSaving.value) return;

  const sceneManager = window.editor?.sceneManager;
  const persistenceManager = window.editor?.persistenceManager;

  if (!sceneManager?.isReady && !allowPartialSave.value) {
    if (!isAutoSave) {
      message.warning('场景尚未完整加载，当前不能保存');
    }
    return;
  }

  if (!persistenceManager) return;

  isSaving.value = true;
  try {
    await persistenceManager.saveScene({
      allowIncomplete: allowPartialSave.value
    });
    if (!isAutoSave) {
      message.success('场景已保存！');
    }
  } catch (error) {
    console.error(isAutoSave ? '自动保存失败:' : '场景保存失败:', error);
    if (!isAutoSave) {
      message.warning(error.message || '场景保存失败');
    }
  } finally {
    isSaving.value = false;
  }
};

let autoSaveTimer = null;

onMounted(() => {
  autoSaveTimer = setInterval(() => {
    const sceneManager = window.editor?.sceneManager;
    if (!canSave.value || (!sceneManager?.isReady && !allowPartialSave.value)) return;
    void save(true);
  }, 10000);
});

onUnmounted(() => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }
});
</script>

<style scoped>
.toolbar {
  padding: 10px;
  background: #333;
  display: flex;
  gap: 20px;
}

.group {
  display: flex;
  gap: 5px;
}

button {
  padding: 5px 10px;
  background: #555;
  color: white;
  border: none;
  cursor: pointer;
}

button:hover {
  background: #666;
}

.save-btn {
  background: #0066cc;
}

.save-btn:hover {
  background: #0052a3;
}

.unlock-btn {
  background: #e6a23c;
  color: #1a1a1a;
  font-weight: bold;
}

.unlock-btn:hover {
  background: #cf9236;
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
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.modal h3 {
  margin: 0 0 15px 0;
  font-size: 20px;
}

.modal-tip {
  margin: 0 0 20px 0;
  color: #aaa;
  font-size: 14px;
  line-height: 1.5;
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

.form-group input {
  width: 100%;
  padding: 10px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #0066cc;
  outline: none;
}

.password-error {
  margin: 8px 0 0;
  color: #ff5f5f;
  font-size: 13px;
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
</style>
