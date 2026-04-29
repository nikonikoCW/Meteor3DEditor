<template>
  <div class="toolbar">
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
      <button @click="save" class="save-btn">💾 保存</button>
    </div>
    
    <BatchLoaderDialog v-model:visible="showBatchLoader" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { message } from '../utils/message';
import BatchLoaderDialog from './BatchLoaderDialog.vue';

const showBatchLoader = ref(false);

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

const save = async (isAutoSave = false) => {
  if (window.editor && window.editor.persistenceManager) {
    await window.editor.persistenceManager.saveScene();
    if (isAutoSave === true) {
      // Auto save implicitly without toast, or maybe a subtle indication could be added later
    } else {
      message.success('场景已保存！');
    }
  }
};

let autoSaveTimer = null;

onMounted(() => {
  autoSaveTimer = setInterval(() => {
    save(true);
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
</style>
