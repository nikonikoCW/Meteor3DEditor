<template>
  <Teleport to="body">
    <div class="modal-overlay" v-if="visible" @click.self="onCancel">
      <div class="modal-container">
        <div class="modal-header">
          <span>画布设置</span>
          <button class="close-btn" @click="onCancel">×</button>
        </div>
        
        <div class="modal-body">
          <!-- 预设尺寸 -->
          <div class="section">
            <label class="section-label">预设尺寸</label>
            <div class="presets">
              <button 
                v-for="preset in presets" 
                :key="preset.name"
                class="preset-btn"
                :class="{ active: isPresetActive(preset) }"
                @click="applyPreset(preset)"
              >
                <span class="preset-name">{{ preset.name }}</span>
                <span class="preset-size">{{ preset.width }}×{{ preset.height }}</span>
              </button>
            </div>
          </div>

          <!-- 自定义尺寸 -->
          <div class="section">
            <label class="section-label">自定义尺寸</label>
            <div class="size-inputs">
              <div class="input-group">
                <label>宽度</label>
                <input type="number" v-model.number="localCanvas.width" min="320" max="7680" />
                <span class="unit">px</span>
              </div>
              <span class="separator">×</span>
              <div class="input-group">
                <label>高度</label>
                <input type="number" v-model.number="localCanvas.height" min="240" max="4320" />
                <span class="unit">px</span>
              </div>
            </div>
          </div>

          <!-- 背景色 -->
          <div class="section">
            <label class="section-label">背景色</label>
            <div class="color-input">
              <input type="color" v-model="localCanvas.background" />
              <input type="text" v-model="localCanvas.background" class="color-text" />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-cancel" @click="onCancel">取消</button>
          <button class="btn btn-apply" @click="onApply">应用</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  canvas: { type: Object, default: () => ({ width: 1920, height: 1080, background: '#1a1a1a' }) }
});

const emit = defineEmits(['update:visible', 'apply']);

// 预设尺寸
const presets = [
  { name: '1080P', width: 1920, height: 1080 },
  { name: '2K', width: 2560, height: 1440 },
  { name: '4K', width: 3840, height: 2160 },
  { name: '竖屏', width: 1080, height: 1920 }
];

// 本地编辑的画布配置
const localCanvas = reactive({
  width: 1920,
  height: 1080,
  background: '#1a1a1a'
});

// 监听 visible 变化，同步 canvas 数据
watch(() => props.visible, (v) => {
  if (v) {
    localCanvas.width = props.canvas.width || 1920;
    localCanvas.height = props.canvas.height || 1080;
    localCanvas.background = props.canvas.background || '#1a1a1a';
  }
});

// 判断预设是否激活
const isPresetActive = (preset) => {
  return localCanvas.width === preset.width && localCanvas.height === preset.height;
};

// 应用预设
const applyPreset = (preset) => {
  localCanvas.width = preset.width;
  localCanvas.height = preset.height;
};

// 取消
const onCancel = () => {
  emit('update:visible', false);
};

// 应用
const onApply = () => {
  emit('apply', { ...localCanvas });
  emit('update:visible', false);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  width: 420px;
  background: #1e1e1e;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #333;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
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
  padding: 16px;
}

.section {
  margin-bottom: 20px;
}

.section-label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 10px;
}

/* Presets */
.presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 16px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #3a3a3a;
  border-color: #555;
}

.preset-btn.active {
  background: #42b983;
  border-color: #42b983;
}

.preset-btn.active .preset-name,
.preset-btn.active .preset-size {
  color: #fff;
}

.preset-name {
  font-size: 13px;
  color: #ddd;
  font-weight: 500;
}

.preset-size {
  font-size: 10px;
  color: #888;
  margin-top: 2px;
}

/* Size inputs */
.size-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 11px;
  color: #666;
}

.input-group input {
  width: 100px;
  padding: 8px;
  background: #252525;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
}

.input-group input:focus {
  outline: none;
  border-color: #42b983;
}

.unit {
  font-size: 11px;
  color: #666;
  margin-top: 8px;
}

.separator {
  color: #666;
  margin-top: 16px;
}

/* Color input */
.color-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-input input[type="color"] {
  width: 40px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.color-text {
  width: 100px;
  padding: 8px;
  background: #252525;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid #333;
}

.btn {
  padding: 8px 20px;
  font-size: 13px;
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
