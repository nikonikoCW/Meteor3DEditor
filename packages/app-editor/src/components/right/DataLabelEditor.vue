<template>
  <div class="data-label-editor">
    <div class="editor-header">
      <span class="label">{{ label }}</span>
    </div>
    
    <button class="open-editor-btn" @click="openEditor">
      <span class="icon">📝</span>
      代码编写
    </button>

    <LabelEditorModal
      v-if="isModalOpen"
      v-model:visible="isModalOpen"
      :modelValue="modelValue"
      @update:modelValue="onUpdate"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LabelEditorModal from '../modals/LabelEditorModal.vue';

const props = defineProps({
  label: { type: String, default: '' },
  modelValue: { 
    type: Object, 
    default: () => ({
      template: '',
      style: '',
      labels: []
    }) 
  }
});

const emit = defineEmits(['update:modelValue']);

const isModalOpen = ref(false);

const openEditor = () => {
  isModalOpen.value = true;
};

const onUpdate = (newValue) => {
  emit('update:modelValue', newValue);
};
</script>

<style scoped>
.data-label-editor {
  margin-bottom: 16px;
}

.editor-header {
  margin-bottom: 8px;
}

.label {
  font-size: 11px;
  color: #888;
}

.open-editor-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.open-editor-btn:hover {
  background: #444;
  border-color: #42b983;
  color: white;
}

.icon {
  font-size: 16px;
}
</style>
