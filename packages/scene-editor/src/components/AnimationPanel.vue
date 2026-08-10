<template>
  <div class="animation-panel">
    <h3>动画</h3>

    <div v-if="selectedObject" class="section">
      <div class="section-header">
        <div>
          <h4>动画播放</h4>
          <p>选择并配置当前模型的动画片段</p>
        </div>
        <label class="switch" :class="{ disabled: !hasAnimations }">
          <input v-model="animationEnabled" type="checkbox" :disabled="!hasAnimations" aria-label="开启动画">
          <span class="switch-track" aria-hidden="true"></span>
        </label>
      </div>

      <div class="divider"></div>

      <div class="prop-row">
        <label for="animation-clip">动画片段</label>
        <select id="animation-clip" v-model="selectedAnimation" :disabled="!hasAnimations">
          <option value="" disabled>请选择动画</option>
          <option v-for="animation in animationOptions" :key="animation.value" :value="animation.value">
            {{ animation.label }}
          </option>
        </select>
      </div>

      <div class="prop-row">
        <div class="label-row">
          <label for="animation-speed">播放速度</label>
          <span>{{ playbackSpeed.toFixed(1) }}×</span>
        </div>
        <input id="animation-speed" v-model.number="playbackSpeed" type="range" min="0.1" max="3" step="0.1" :disabled="!hasAnimations">
        <div class="range-marks" aria-hidden="true">
          <span>0.1×</span><span>1.0×</span><span>3.0×</span>
        </div>
      </div>

      <div v-if="!hasAnimations" class="empty-state">
        <span>▶</span>
        <span>当前对象没有可用动画</span>
      </div>
    </div>

    <p v-else class="empty-message">请选择包含动画的模型</p>
    <div class="ui-note">当前仅提供界面配置，暂未接入动画播放逻辑</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../stores/editorStore';

const editorStore = useEditorStore();
const { selectedObject } = storeToRefs(editorStore);
const selectedAnimation = ref('');
const playbackSpeed = ref(1);
const animationEnabled = ref(false);

// 只读取已有 animations 生成选项，不创建或控制 AnimationMixer。
const animationClips = computed(() => {
  let object = selectedObject.value;
  while (object) {
    if (Array.isArray(object.animations) && object.animations.length > 0) return object.animations;
    object = object.parent;
  }
  return [];
});

const animationOptions = computed(() => animationClips.value.map((clip, index) => ({
  value: String(index),
  label: clip?.name?.trim() || `动画 ${index + 1}`
})));
const hasAnimations = computed(() => animationOptions.value.length > 0);

watch(selectedObject, () => {
  selectedAnimation.value = animationOptions.value[0]?.value || '';
  playbackSpeed.value = 1;
  animationEnabled.value = false;
}, { immediate: true });
</script>

<style scoped>
.animation-panel { width: 100%; height: 100%; padding: 15px; overflow-y: auto; color: white; background: #222; }
h3 { margin: 0 0 20px; padding-bottom: 10px; border-bottom: 1px solid #444; font-size: 16px; }
.section { padding: 12px; border-radius: 4px; background: #2a2a2a; }
.section-header, .label-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
h4 { margin: 0; color: #ddd; font-size: 13px; font-weight: 500; }
.section-header p { margin: 3px 0 0; color: #777; font-size: 11px; line-height: 1.4; }
.divider { height: 1px; margin: 12px 0; background: #383838; }
.prop-row { display: flex; flex-direction: column; gap: 7px; margin-bottom: 18px; }
.prop-row:last-of-type { margin-bottom: 0; }
.prop-row > label, .label-row label { color: #aaa; font-size: 12px; }
.label-row span { color: #66aaff; font-size: 12px; font-variant-numeric: tabular-nums; }
select { width: 100%; min-width: 0; padding: 7px 9px; border: 1px solid #444; border-radius: 3px; outline: none; color: #eee; background: #1d1d1d; font-size: 12px; }
select:focus { border-color: #0066cc; }
select:disabled, input[type="range"]:disabled { cursor: not-allowed; opacity: 0.45; }
input[type="range"] { width: 100%; accent-color: #0066cc; cursor: pointer; }
.range-marks { display: flex; justify-content: space-between; color: #666; font-size: 10px; font-variant-numeric: tabular-nums; }
.switch { position: relative; display: inline-flex; flex-shrink: 0; cursor: pointer; }
.switch.disabled { cursor: not-allowed; opacity: 0.45; }
.switch input { position: absolute; opacity: 0; pointer-events: none; }
.switch-track { position: relative; width: 42px; height: 22px; border-radius: 999px; background: #444; transition: background 0.2s; }
.switch-track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #aaa; transition: transform 0.2s, background 0.2s; }
.switch input:checked + .switch-track { background: #0066cc; }
.switch input:checked + .switch-track::after { background: white; transform: translateX(20px); }
.switch input:focus-visible + .switch-track { box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.35); }
.empty-state { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; padding: 14px 10px; border: 1px dashed #444; border-radius: 4px; color: #777; font-size: 12px; }
.empty-message { margin-top: 40px; color: #666; font-size: 13px; text-align: center; }
.ui-note { margin-top: 12px; color: #666; font-size: 10px; line-height: 1.5; text-align: center; }
</style>
