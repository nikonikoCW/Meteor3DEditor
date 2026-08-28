<template>
  <header class="editor-header">
    <div class="header-left">
      <button class="back-btn" @click="onBack" title="返回列表">←</button>
      <img src="/meteor-min.svg" alt="Logo" class="logo" />
      <div class="app-name-editor">
        <input
          v-if="isEditingName"
          ref="appNameInput"
          v-model="nameDraft"
          class="app-name-input"
          type="text"
          maxlength="100"
          aria-label="应用名称"
          @keyup.enter="commitNameEdit"
          @keyup.esc.prevent="cancelNameEdit"
          @blur="commitNameEdit"
        />
        <h1
          v-else
          :title="canEditName ? '双击修改应用名称' : appName"
          @dblclick="startNameEdit"
        >
          {{ appName }}
        </h1>
        <button
          v-if="!isEditingName"
          type="button"
          class="edit-name-btn"
          title="修改应用名称"
          aria-label="修改应用名称"
          :disabled="!canEditName"
          @click="startNameEdit"
        >
          ✎
        </button>
      </div>
      <span v-if="isFeatured" class="featured-badge">精品</span>
      <span v-if="hasUnsavedChanges" class="unsaved-indicator">●</span>
      <button 
        class="canvas-size-btn" 
        @click="showCanvasSettings = true"
        title="画布设置"
      >
        🖼️ {{ canvas.width }}×{{ canvas.height }}
      </button>
    </div>
    <div class="header-right">
      <div class="mode-toggle">
        <span class="mode-label">编辑</span>
        <label class="switch">
          <input type="checkbox" v-model="isEditMode">
          <span class="slider"></span>
        </label>
      </div>
      <button 
        class="preview-btn" 
        @click="onPreview"
        :disabled="!appId"
        title="新窗口预览"
      >
        <span class="preview-icon">👁</span>
        预览
      </button>
      <button
        v-if="!canSave"
        class="unlock-btn"
        @click="openUnlockModal"
        title="权限解锁"
      >
        🔒 权限解锁
      </button>
      <button 
        v-else
        class="save-btn" 
        :disabled="!isEditMode || isSaving" 
        @click="onSave"
      >
        <span v-if="isSaving" class="loading-icon">⏳</span>
        <span v-else class="save-icon">💾</span>
        {{ isSaving ? '保存中...' : '保存' }}
      </button>
    </div>
  </header>

  <!-- 画布设置弹窗 -->
  <CanvasSettingsModal
    v-model:visible="showCanvasSettings"
    :canvas="canvas"
    @apply="onCanvasApply"
  />

  <div v-if="showUnlockModal" class="modal-overlay" @click.self="closeUnlockModal">
    <div class="unlock-modal">
      <h3>权限解锁</h3>
      <p>此应用为精品案例，请输入密码验证以解锁保存及自动保存权限。</p>
      <form @submit.prevent="handleUnlockSubmit">
        <label for="app-unlock-password">解锁密码</label>
        <input
          id="app-unlock-password"
          ref="unlockPasswordInput"
          v-model="unlockPassword"
          type="password"
          placeholder="请输入密码"
          autocomplete="off"
          @input="unlockPasswordError = ''"
        />
        <span v-if="unlockPasswordError" class="password-error">{{ unlockPasswordError }}</span>
        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="closeUnlockModal">取消</button>
          <button type="submit" class="confirm-btn">确认解锁</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue';
import { useAppStore } from '../../stores/appStore';
import { storeToRefs } from 'pinia';
import CanvasSettingsModal from './CanvasSettingsModal.vue';
import { message } from '../../utils/message';

const appStore = useAppStore();
const {
  isEditMode,
  appName,
  appId,
  canvas,
  hasUnsavedChanges,
  isSaving,
  isFeatured,
  isUnlocked,
  canSave
} = storeToRefs(appStore);

const showCanvasSettings = ref(false);
const showUnlockModal = ref(false);
const unlockPassword = ref('');
const unlockPasswordError = ref('');
const unlockPasswordInput = ref(null);
const isEditingName = ref(false);
const nameDraft = ref('');
const appNameInput = ref(null);
const canEditName = computed(() => isEditMode.value && canSave.value);

const startNameEdit = async () => {
  if (!canEditName.value) return;
  nameDraft.value = appName.value;
  isEditingName.value = true;
  await nextTick();
  appNameInput.value?.focus();
  appNameInput.value?.select();
};

const commitNameEdit = () => {
  if (!isEditingName.value) return;

  const nextName = nameDraft.value.trim();
  if (!nextName) {
    nameDraft.value = appName.value;
    isEditingName.value = false;
    message.warning('应用名称不能为空');
    return;
  }

  if (nextName !== appName.value) {
    appName.value = nextName;
    hasUnsavedChanges.value = true;
  }
  isEditingName.value = false;
};

const cancelNameEdit = () => {
  nameDraft.value = appName.value;
  isEditingName.value = false;
};

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

  isUnlocked.value = true;
  closeUnlockModal();
  message.success('权限解锁成功！已开启保存及自动保存权限。');
};

const onSave = async () => {
  try {
    await appStore.saveApp();
    alert('保存成功!');
  } catch (error) {
    alert('保存失败: ' + error.message);
  }
};

const onPreview = () => {
  if (!appId.value) return;
  // 新窗口打开预览页面
  const previewUrl = `${window.location.origin}?appId=${appId.value}&mode=preview`;
  window.open(previewUrl, '_blank');
};

const onBack = () => {
  if (hasUnsavedChanges.value) {
    if (!confirm('有未保存的更改，确定要离开吗？')) {
      return;
    }
  }
  window.location.href = '/';
};

const onCanvasApply = (newCanvas) => {
  canvas.value.width = newCanvas.width;
  canvas.value.height = newCanvas.height;
  canvas.value.background = newCanvas.background;
  hasUnsavedChanges.value = true;
};
</script>

<style scoped>
.editor-header {
  height: 50px;
  background: linear-gradient(180deg, #1f1f1f 0%, #1a1a1a 100%);
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  background: transparent;
  border: 1px solid #444;
  color: #aaa;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #333;
  color: #fff;
  border-color: #555;
}

/* Canvas Size Button */
.canvas-size-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: 8px;
}

.canvas-size-btn:hover {
  background: #333;
  border-color: #42b983;
  color: #42b983;
}
.logo {
  width: 28px;
  height: 28px;
}

.app-name-editor {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.app-name-editor h1 {
  margin: 0;
  max-width: 260px;
  overflow: hidden;
  font-size: 16px;
  font-weight: 500;
  color: #e0e0e0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-name-input {
  width: 220px;
  padding: 4px 7px;
  color: #e0e0e0;
  background: #151515;
  border: 1px solid #42b983;
  border-radius: 4px;
  outline: none;
  font-size: 14px;
}

.edit-name-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  color: #777;
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 15px;
}

.edit-name-btn:hover:not(:disabled) {
  color: #42b983;
  background: #2a2a2a;
}

.edit-name-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.unsaved-indicator {
  color: #ff9800;
  font-size: 10px;
  margin-left: -8px;
}

.featured-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #e6a23c;
  color: #1a1a1a;
  font-size: 11px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-label {
  font-size: 13px;
  color: #888;
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #444;
  transition: 0.3s;
  border-radius: 22px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #42b983;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

/* Save Button */
.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #42b983;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #3aa876;
}

.save-btn:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}

.unlock-btn {
  padding: 6px 14px;
  background: #e6a23c;
  border: none;
  border-radius: 4px;
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.unlock-btn:hover {
  background: #cf9236;
}

.save-icon, .loading-icon, .preview-icon {
  font-size: 14px;
}

/* Preview Button */
.preview-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #2d2d2d;
  border: 1px solid #555;
  border-radius: 4px;
  color: #ddd;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn:hover:not(:disabled) {
  background: #3d3d3d;
  border-color: #42b983;
  color: #42b983;
}

.preview-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
}

.unlock-modal {
  width: 400px;
  padding: 24px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #252525;
  color: #eee;
}

.unlock-modal h3 {
  margin: 0 0 12px;
}

.unlock-modal p {
  margin: 0 0 20px;
  color: #aaa;
  font-size: 14px;
  line-height: 1.5;
}

.unlock-modal label {
  display: block;
  margin-bottom: 8px;
  color: #bbb;
  font-size: 13px;
}

.unlock-modal input {
  width: 100%;
  padding: 10px;
  border: 1px solid #444;
  border-radius: 4px;
  outline: none;
  background: #181818;
  color: white;
}

.unlock-modal input:focus {
  border-color: #e6a23c;
}

.password-error {
  display: block;
  margin-top: 8px;
  color: #ff6b6b;
  font-size: 13px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  padding: 8px 18px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background: #3a3a3a;
  color: #ddd;
}

.confirm-btn {
  background: #e6a23c;
  color: #1a1a1a;
}
</style>
