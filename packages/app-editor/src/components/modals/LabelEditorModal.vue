<template>
  <Teleport to="body">
    <div class="modal-overlay" v-if="visible" @click.self="close">
      <div class="modal-container">
        <div class="modal-header">
          <div class="header-left">
            <h3>3D 标签编辑器</h3>
            <div class="tabs">
              <button 
                v-for="tab in tabs" 
                :key="tab.id"
                :class="['tab-btn', { active: currentTab === tab.id }]"
                @click="currentTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>
          <div class="header-right">
            <button class="btn btn-run" @click="runPreview">▶ 运行</button>
            <button class="btn btn-apply" @click="apply">应用</button>
            <button class="close-btn" @click="close">×</button>
          </div>
        </div>
        
        <div class="modal-body">
          <!-- 左侧编辑区 -->
          <div class="editor-pane">
            <codemirror
              v-model="localCode[currentTab]"
              :style="{ height: '100%' }"
              :extensions="getExtensions(currentTab)"
              :autofocus="true"
              @change="onCodeChange"
            />
          </div>
          
          <!-- 右侧预览区 -->
          <div class="preview-pane">
            <div class="preview-header">
              <span>实时预览</span>
              <span class="preview-hint">基于第一条数据渲染</span>
            </div>
            <div class="preview-content" ref="previewContainer">
              <!-- 预览内容将注入到这里 -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { message } from '../../utils/message';

const props = defineProps({
  visible: Boolean,
  modelValue: {
    type: Object,
    default: () => ({
      template: '',
      style: '',
      labels: []
    })
  }
});

const emit = defineEmits(['update:visible', 'update:modelValue']);

const tabs = [
  { id: 'template', label: 'Template (HTML)' },
  { id: 'style', label: 'Style (CSS)' },
  { id: 'labels', label: 'Data (JSON)' }
];

const currentTab = ref('template');
const localCode = ref({
  template: '',
  style: '',
  labels: '' // JSON string
});

const previewContainer = ref(null);

// 初始化本地数据
watch(() => props.visible, (val) => {
  if (val) {
    localCode.value = {
      template: props.modelValue.template || '',
      style: props.modelValue.style || '',
      labels: JSON.stringify(props.modelValue.labels || [], null, 2)
    };
    // 打开时自动运行一次预览
    nextTick(() => {
      runPreview();
    });
  }
}, { immediate: true });

const getExtensions = (tab) => {
  const base = [oneDark];
  if (tab === 'template') return [...base, html()];
  if (tab === 'style') return [...base, css()];
  if (tab === 'labels') return [...base, json()];
  return base;
};

const onCodeChange = () => {
  // 可以选择自动运行，或者手动运行。这里暂定手动运行以节省性能
};

// 模板渲染函数
const renderTemplate = (template, data) => {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
};

const runPreview = () => {
  if (!previewContainer.value) return;

  try {
    // 1. 解析数据
    let dataList = [];
    try {
      dataList = JSON.parse(localCode.value.labels);
    } catch (e) {
      message.error('JSON 数据格式错误');
      return;
    }

    if (!Array.isArray(dataList) || dataList.length === 0) {
      previewContainer.value.innerHTML = '<div class="empty-preview">无数据</div>';
      return;
    }

    // 取第一条数据用于预览
    const previewData = dataList[0];

    // 2. 渲染 HTML
    const htmlContent = renderTemplate(localCode.value.template, previewData);

    // 3. 构建预览 DOM
    // 使用 Shadow DOM 隔离样式，或者简单地使用 scoped style 模拟
    // 这里为了简单且有效，我们直接清空容器并注入 Style 和 HTML
    // 为了防止样式污染全局，我们给 style 加个前缀或者使用 scoped 属性（如果浏览器支持）
    // 或者更简单：在预览容器内创建一个 iframe？不，iframe 通信麻烦。
    // 我们采用直接注入，但给 CSS 加个 scope 限制（简单模拟）或者直接注入 style 标签（因为是预览，污染也只影响预览区，或者我们可以依赖用户写比较具体的 selector）
    
    // 更好的方式：使用 Shadow DOM
    if (!previewContainer.value.shadowRoot) {
      previewContainer.value.attachShadow({ mode: 'open' });
    }
    
    const shadow = previewContainer.value.shadowRoot;
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: auto;
          position: relative;
          background: #333; /* 预览背景 */
        }
        /* 注入用户样式 */
        ${localCode.value.style}
      </style>
      <div class="preview-wrapper">
        ${htmlContent}
      </div>
    `;
    
    message.success('预览已更新');

  } catch (e) {
    console.error(e);
    message.error('预览渲染失败: ' + e.message);
  }
};

const apply = () => {
  try {
    const labels = JSON.parse(localCode.value.labels);
    emit('update:modelValue', {
      template: localCode.value.template,
      style: localCode.value.style,
      labels: labels
    });
    close();
    message.success('配置已应用');
  } catch (e) {
    message.error('无法应用：JSON 格式错误');
  }
};

const close = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-container {
  width: 90vw;
  height: 85vh;
  background: #1e1e1e;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 50px;
  background: #252525;
  border-bottom: 1px solid #333;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
  color: #fff;
}

.tabs {
  display: flex;
  gap: 2px;
  background: #1e1e1e;
  padding: 2px;
  border-radius: 4px;
}

.tab-btn {
  padding: 6px 16px;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 12px;
  border-radius: 2px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #ccc;
}

.tab-btn.active {
  background: #333;
  color: #42b983;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-pane {
  flex: 1;
  border-right: 1px solid #333;
  overflow: hidden;
}

.preview-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #111;
}

.preview-header {
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  font-size: 12px;
  color: #888;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.btn {
  padding: 6px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-run {
  background: #333;
  color: #fff;
  border: 1px solid #444;
}

.btn-run:hover {
  background: #444;
  border-color: #42b983;
  color: #42b983;
}

.btn-apply {
  background: #42b983;
  color: #fff;
}

.btn-apply:hover {
  background: #3aa876;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
}

.close-btn:hover {
  color: #fff;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}
</style>
