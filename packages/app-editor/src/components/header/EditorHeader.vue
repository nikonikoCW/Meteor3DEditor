<template>
  <header class="editor-header">
    <div class="header-left">
      <button class="back-btn" @click="onBack" title="返回列表">←</button>
      <img src="/meteor-min.svg" alt="Logo" class="logo" />
      <h1>{{ appName }}</h1>
      <span v-if="hasUnsavedChanges" class="unsaved-indicator">●</span>
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
</template>

<script setup>
import { useAppStore } from '../../stores/appStore';
import { storeToRefs } from 'pinia';

const appStore = useAppStore();
const { isEditMode, appName, appId, hasUnsavedChanges, isSaving } = storeToRefs(appStore);

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

.logo {
  width: 28px;
  height: 28px;
}

.header-left h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #e0e0e0;
}

.unsaved-indicator {
  color: #ff9800;
  font-size: 10px;
  margin-left: -8px;
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
</style>
