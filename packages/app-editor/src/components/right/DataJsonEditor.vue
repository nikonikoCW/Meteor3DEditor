<template>
  <div class="data-json-editor">
    <div class="editor-header">
      <span class="label">{{ label }}</span>
      <button class="edit-btn" @click="openModal">编辑</button>
    </div>
    <div class="data-summary" v-if="modelValue && modelValue.length">
      <span class="count">{{ modelValue.length }} 条数据</span>
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
            <div class="error-message" v-if="parseError">
              {{ parseError }}
            </div>
          </div>
          <div class="modal-footer">
            <span class="placeholder-hint" v-if="placeholder">
              格式示例：{{ truncatedPlaceholder }}
            </span>
            <div class="buttons">
              <button class="btn btn-cancel" @click="closeModal">取消</button>
              <button class="btn btn-apply" @click="applyChanges" :disabled="!!parseError">应用</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

const props = defineProps({
  label: { type: String, default: '' },
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue']);

const isModalOpen = ref(false);
const localValue = ref('');
const parseError = ref('');

const extensions = [oneDark, json()];

const truncatedPlaceholder = computed(() => {
  const p = props.placeholder || '';
  return p.length > 60 ? p.slice(0, 60) + '...' : p;
});

const openModal = () => {
  localValue.value = JSON.stringify(props.modelValue || [], null, 2);
  parseError.value = '';
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

// 监听本地值变化，实时校验 JSON
watch(localValue, (val) => {
  try {
    JSON.parse(val);
    parseError.value = '';
  } catch (e) {
    parseError.value = 'JSON 格式错误: ' + e.message;
  }
});

const applyChanges = () => {
  if (parseError.value) return;
  try {
    const parsed = JSON.parse(localValue.value);
    if (!Array.isArray(parsed)) {
      parseError.value = '数据必须是数组格式';
      return;
    }
    emit('update:modelValue', parsed);
    closeModal();
  } catch (e) {
    parseError.value = 'JSON 解析失败';
  }
};
</script>

<style scoped>
.data-json-editor {
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

.data-summary {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 6px 8px;
}

.count {
  font-size: 11px;
  color: #42b983;
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
  width: 650px;
  max-height: 80vh;
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
  display: flex;
  flex-direction: column;
}

.editor-wrapper {
  height: 350px;
  overflow: auto;
}

.error-message {
  padding: 8px 16px;
  background: #3d1f1f;
  color: #ff6b6b;
  font-size: 11px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #333;
}

.placeholder-hint {
  font-size: 10px;
  color: #666;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.buttons {
  display: flex;
  gap: 8px;
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

.btn-apply:disabled {
  background: #555;
  cursor: not-allowed;
}
</style>
