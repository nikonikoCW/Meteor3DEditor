<template>
  <div class="data-code-editor">
    <div class="editor-header">
      <span class="label">{{ label }}</span>
      <button class="edit-btn" @click="openModal">编辑</button>
    </div>
    <div class="preview-snippet" v-if="modelValue">
      <code>{{ truncatedValue }}</code>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="isModalOpen" @click.self="closeModal">
        <div class="modal-container">
          <div class="modal-header">
            <span>{{ label }}</span>
            <button class="close-btn" @click="closeModal">×</button>
          </div>
          <div class="modal-body">
            <div class="editor-wrapper">
              <codemirror
                v-model="localValue"
                :style="{ height: '100%' }"
                :extensions="extensions"
                :autofocus="true"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="closeModal">取消</button>
            <button class="btn btn-apply" @click="applyChanges">应用</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

const props = defineProps({
  label: { type: String, default: '' },
  language: { type: String, default: 'html' },
  modelValue: { type: String, default: '' },
  description: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue']);

const isModalOpen = ref(false);
const localValue = ref('');

// 根据语言选择扩展
const extensions = computed(() => {
  const base = [oneDark];
  if (props.language === 'html') {
    base.push(html());
  } else if (props.language === 'css') {
    base.push(css());
  } else if (props.language === 'javascript') {
    base.push(javascript());
  }
  return base;
});

// 截断显示
const truncatedValue = computed(() => {
  const val = props.modelValue || '';
  return val.length > 50 ? val.slice(0, 50) + '...' : val;
});

const openModal = () => {
  localValue.value = props.modelValue || '';
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const applyChanges = () => {
  emit('update:modelValue', localValue.value);
  closeModal();
};
</script>

<style scoped>
.data-code-editor {
  margin-bottom: 12px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.label {
  font-size: 11px;
  color: #888;
}

.edit-btn {
  padding: 4px 10px;
  font-size: 11px;
  background: #3a3a3a;
  border: 1px solid #555;
  color: #ddd;
  border-radius: 3px;
  cursor: pointer;
}

.edit-btn:hover {
  background: #444;
  border-color: #42b983;
  color: #42b983;
}

.preview-snippet {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 6px 8px;
  overflow: hidden;
}

.preview-snippet code {
  font-size: 10px;
  color: #888;
  white-space: nowrap;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-container {
  width: 80%;
  max-width: 1200px;
  max-height: 90vh;
  background: #1e1e1e;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  color: #fff;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  flex: 1;
  overflow: hidden;
}

.editor-wrapper {
  height: 70vh;
  overflow: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #333;
}

.btn {
  padding: 6px 16px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background: #333;
  color: #aaa;
}

.btn-cancel:hover {
  background: #444;
}

.btn-apply {
  background: #42b983;
  color: #fff;
}

.btn-apply:hover {
  background: #369e6f;
}
</style>
