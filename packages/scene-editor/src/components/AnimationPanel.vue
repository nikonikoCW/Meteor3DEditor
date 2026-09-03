<template>
  <div class="animation-panel">
    <h3>动画</h3>

    <div v-if="selectedObject" class="section">
      <div class="section-header">
        <div>
          <h4>开启动画</h4>
          <p>关闭时停止动画并恢复模型初始姿势</p>
        </div>
        <label class="switch" :class="{ disabled: !hasAnimations }">
          <input v-model="animationEnabled" type="checkbox" :disabled="!hasAnimations" @change="onEnabledChange" aria-label="开启动画">
          <span class="switch-track" aria-hidden="true"></span>
        </label>
      </div>

      <div class="divider"></div>

      <div class="playback-row">
        <div class="playback-copy">
          <label for="animation-playing">播放状态</label>
          <span>{{ !animationEnabled ? '未开启' : animationPlaying ? '播放中' : '已暂停' }}</span>
        </div>
        <label class="switch" :class="{ disabled: !hasAnimations || !animationEnabled }">
          <input id="animation-playing" v-model="animationPlaying" type="checkbox" :disabled="!hasAnimations || !animationEnabled" @change="onPlayingChange" aria-label="播放动画">
          <span class="switch-track" aria-hidden="true"></span>
        </label>
      </div>

      <div class="prop-row">
        <label for="animation-clip">动画片段</label>
        <select id="animation-clip" v-model="selectedAnimation" :disabled="!hasAnimations" @change="onClipChange">
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
        <input id="animation-speed" v-model.number="playbackSpeed" type="range" min="0.1" max="3" step="0.1" :disabled="!hasAnimations" @input="onSpeedInput">
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
    <div class="ui-note">动画设置仅在当前编辑会话生效，暂未随场景保存</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../stores/editorStore';

const editorStore = useEditorStore();
const { selectedObject } = storeToRefs(editorStore);
const animationOptions = ref([]);
const selectedAnimation = ref('');
const playbackSpeed = ref(1);
const animationEnabled = ref(false);
const animationPlaying = ref(false);
const hasAnimations = computed(() => animationOptions.value.length > 0);

const getSceneManager = () => window.editor?.sceneManager;
const getSelectedBid = () => selectedObject.value?.userData?.bid || null;

const resetPanel = () => {
  animationOptions.value = [];
  selectedAnimation.value = '';
  playbackSpeed.value = 1;
  animationEnabled.value = false;
  animationPlaying.value = false;
};

const syncFromSelection = () => {
  const sceneManager = getSceneManager();
  const bid = getSelectedBid();
  if (!sceneManager || !bid) {
    resetPanel();
    return;
  }

  animationOptions.value = sceneManager.getAnimations(bid).map((clip) => ({
    ...clip,
    value: String(clip.index)
  }));

  const state = sceneManager.getAnimationState(bid);
  selectedAnimation.value = state ? String(state.clipIndex) : (animationOptions.value[0]?.value || '');
  playbackSpeed.value = state?.speed ?? 1;
  animationEnabled.value = state?.enabled ?? false;
  animationPlaying.value = state?.playing ?? false;
};

const onClipChange = () => {
  const sceneManager = getSceneManager();
  const bid = getSelectedBid();
  const clip = animationOptions.value.find(item => item.value === selectedAnimation.value);
  if (sceneManager && bid && clip) {
    sceneManager.setAnimationClip(bid, { index: clip.index, name: clip.name });
  }
};

const onSpeedInput = () => {
  const sceneManager = getSceneManager();
  const bid = getSelectedBid();
  if (sceneManager && bid) sceneManager.setAnimationSpeed(bid, playbackSpeed.value);
};

const onEnabledChange = () => {
  const sceneManager = getSceneManager();
  const bid = getSelectedBid();
  if (!sceneManager || !bid) return;

  const updated = sceneManager.setAnimationEnabled(bid, animationEnabled.value);
  if (!updated) {
    syncFromSelection();
    return;
  }

  if (!animationEnabled.value) animationPlaying.value = false;
};

const onPlayingChange = () => {
  const sceneManager = getSceneManager();
  const bid = getSelectedBid();
  if (!sceneManager || !bid) return;

  const updated = sceneManager.setAnimationPlaying(bid, animationPlaying.value);
  if (!updated) syncFromSelection();
};

watch(selectedObject, syncFromSelection, { immediate: true });
</script>

<style scoped>
.animation-panel { width: 100%; height: 100%; padding: 15px; overflow-y: auto; color: white; background: #222; }
h3 { margin: 0 0 20px; padding-bottom: 10px; border-bottom: 1px solid #444; font-size: 16px; }
.section { padding: 12px; border-radius: 4px; background: #2a2a2a; }
.section-header, .label-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
h4 { margin: 0; color: #ddd; font-size: 13px; font-weight: 500; }
.section-header p { margin: 3px 0 0; color: #777; font-size: 11px; line-height: 1.4; }
.divider { height: 1px; margin: 12px 0; background: #383838; }
.playback-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
.playback-copy { display: flex; flex-direction: column; gap: 3px; }
.playback-copy label { color: #aaa; font-size: 12px; }
.playback-copy span { color: #777; font-size: 11px; }
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
