<template>
  <div class="camera-speed-panel">
    <h3>相机速度</h3>

    <div class="section">
      <h4>幽灵模式</h4>

      <div class="prop-row">
        <div class="label-row">
          <label for="ghost-move-speed">移动速度</label>
          <span>{{ moveSpeed.toFixed(1) }}</span>
        </div>
        <input
          id="ghost-move-speed"
          v-model.number="moveSpeed"
          type="range"
          min="1"
          max="100"
          step="1"
          @input="applySettings"
        >
        <input
          v-model.number="moveSpeed"
          type="number"
          min="1"
          max="100"
          step="1"
          @change="applySettings"
        >
        <div class="hint">W/A/S/D/Q/E 的基础移动速度</div>
      </div>

      <div class="prop-row">
        <div class="label-row">
          <label for="ghost-boost-multiplier">加速倍数</label>
          <span>{{ boostMultiplier.toFixed(1) }}×</span>
        </div>
        <input
          id="ghost-boost-multiplier"
          v-model.number="boostMultiplier"
          type="range"
          min="1"
          max="10"
          step="0.5"
          @input="applySettings"
        >
        <input
          v-model.number="boostMultiplier"
          type="number"
          min="1"
          max="10"
          step="0.5"
          @change="applySettings"
        >
        <div class="hint">按住 Shift 时应用的速度倍率</div>
      </div>

      <div class="prop-row">
        <div class="label-row">
          <label for="ghost-look-speed">鼠标灵敏度</label>
          <span>{{ lookSpeed.toFixed(4) }}</span>
        </div>
        <input
          id="ghost-look-speed"
          v-model.number="lookSpeed"
          type="range"
          min="0.0005"
          max="0.01"
          step="0.0005"
          @input="applySettings"
        >
        <input
          v-model.number="lookSpeed"
          type="number"
          min="0.0005"
          max="0.01"
          step="0.0005"
          @change="applySettings"
        >
        <div class="hint">右键拖动鼠标时的视角旋转速度</div>
      </div>
    </div>

    <div class="hint">
      参数会立即应用，下次切换到幽灵模式时仍然有效。
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const moveSpeed = ref(10);
const boostMultiplier = ref(2);
const lookSpeed = ref(0.002);

const getGhostControl = () => {
  return window.editor?.sceneManager?.controlManager?.controls?.get('ghost');
};

const applySettings = () => {
  const ghostControl = getGhostControl();
  if (!ghostControl) return;

  ghostControl.moveSpeed = moveSpeed.value;
  ghostControl.boostMultiplier = boostMultiplier.value;
  ghostControl.lookSpeed = lookSpeed.value;
};

onMounted(() => {
  const ghostControl = getGhostControl();
  if (!ghostControl) return;

  moveSpeed.value = ghostControl.moveSpeed;
  boostMultiplier.value = ghostControl.boostMultiplier;
  lookSpeed.value = ghostControl.lookSpeed;
});
</script>

<style scoped>
.camera-speed-panel {
  width: 100%;
  height: 100%;
  padding: 15px;
  overflow-y: auto;
  color: white;
  background: #222;
  box-sizing: border-box;
}

h3 {
  margin: 0 0 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #444;
  font-size: 16px;
}

.section {
  margin-bottom: 16px;
  padding: 10px;
  border-radius: 4px;
  background: #2a2a2a;
}

h4 {
  margin: 0 0 14px;
  color: #888;
  font-size: 12px;
  font-weight: normal;
  text-transform: uppercase;
}

.prop-row {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 18px;
}

.prop-row:last-child {
  margin-bottom: 0;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.label-row span {
  color: #66aaff;
  font-variant-numeric: tabular-nums;
}

input[type="range"] {
  width: 100%;
}

input[type="number"] {
  padding: 7px 8px;
  border: 1px solid #444;
  border-radius: 3px;
  outline: none;
  color: white;
  background: #1d1d1d;
}

input[type="number"]:focus {
  border-color: #0066cc;
}

.hint {
  color: #888;
  font-size: 12px;
  line-height: 1.5;
}
</style>
