<template>
  <Transition name="message-fade">
    <div v-if="visible" :class="['message', `message-${type}`]">
      <span class="message-icon">{{ icon }}</span>
      <span class="message-content">{{ content }}</span>
      <button class="message-close" @click="handleClose">×</button>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  id: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  }
});

const emit = defineEmits(['close']);

const visible = ref(true);

const icon = computed(() => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  return icons[props.type] || icons.info;
});

const handleClose = () => {
  visible.value = false;
  setTimeout(() => {
    emit('close', props.id);
  }, 300); // 等待动画完成
};
</script>

<style scoped>
.message {
  display: flex;
  align-items: center;
  min-width: 300px;
  max-width: 500px;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  margin-bottom: 12px;
  backdrop-filter: blur(10px);
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.message-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 10px;
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  white-space: pre-line;
}

.message-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  margin-left: 12px;
  padding: 0;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.message-close:hover {
  opacity: 1;
}

/* 消息类型样式 */
.message-success {
  background: rgba(103, 194, 58, 0.2);
  border: 1px solid rgba(103, 194, 58, 0.4);
  color: #67c23a;
}

.message-success .message-icon {
  color: #67c23a;
}

.message-error {
  background: rgba(245, 108, 108, 0.2);
  border: 1px solid rgba(245, 108, 108, 0.4);
  color: #f56c6c;
}

.message-error .message-icon {
  color: #f56c6c;
}

.message-warning {
  background: rgba(230, 162, 60, 0.2);
  border: 1px solid rgba(230, 162, 60, 0.4);
  color: #e6a23c;
}

.message-warning .message-icon {
  color: #e6a23c;
}

.message-info {
  background: rgba(144, 147, 153, 0.2);
  border: 1px solid rgba(144, 147, 153, 0.4);
  color: #909399;
}

.message-info .message-icon {
  color: #909399;
}

/* 动画 */
.message-fade-enter-active {
  animation: message-fade-in 0.3s ease;
}

.message-fade-leave-active {
  animation: message-fade-out 0.3s ease;
}

@keyframes message-fade-in {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes message-fade-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}
</style>
