<template>
  <div class="weather-panel">
    <h3>天气效果</h3>
    
    <!-- 下雨设置 -->
    <div class="section">
      <div class="section-header">
        <h4>🌧️ 下雨</h4>
        <div class="switch-container">
          <label class="switch">
            <input type="checkbox" v-model="rainEnabled" @change="onRainToggle">
            <span class="slider"></span>
          </label>
          <span class="switch-label">{{ rainEnabled ? '开启' : '关闭' }}</span>
        </div>
      </div>
      
      <div class="params-container" v-show="rainEnabled">
        <div class="prop-row">
          <label>雨量</label>
          <div class="slider-row">
            <input 
              type="range" 
              v-model.number="rainConfig.intensity" 
              min="100" 
              max="5000" 
              step="100"
              @input="onRainConfigChange"
            >
            <span class="value">{{ rainConfig.intensity }}</span>
          </div>
        </div>
        <div class="prop-row">
          <label>雨速</label>
          <div class="slider-row">
            <input 
              type="range" 
              v-model.number="rainConfig.speed" 
              min="0.5" 
              max="5" 
              step="0.1"
              @input="onRainConfigChange"
            >
            <span class="value">{{ rainConfig.speed.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 下雪设置 -->
    <div class="section">
      <div class="section-header">
        <h4>❄️ 下雪</h4>
        <div class="switch-container">
          <label class="switch">
            <input type="checkbox" v-model="snowEnabled" @change="onSnowToggle">
            <span class="slider"></span>
          </label>
          <span class="switch-label">{{ snowEnabled ? '开启' : '关闭' }}</span>
        </div>
      </div>
      
      <div class="params-container" v-show="snowEnabled">
        <div class="prop-row">
          <label>雪量</label>
          <div class="slider-row">
            <input 
              type="range" 
              v-model.number="snowConfig.intensity" 
              min="100" 
              max="5000" 
              step="100"
              @input="onSnowConfigChange"
            >
            <span class="value">{{ snowConfig.intensity }}</span>
          </div>
        </div>
        <div class="prop-row">
          <label>大小</label>
          <div class="slider-row">
            <input 
              type="range" 
              v-model.number="snowConfig.size" 
              min="0.1" 
              max="2" 
              step="0.1"
              @input="onSnowConfigChange"
            >
            <span class="value">{{ snowConfig.size.toFixed(1) }}</span>
          </div>
        </div>
        <div class="prop-row">
          <label>速度</label>
          <div class="slider-row">
            <input 
              type="range" 
              v-model.number="snowConfig.speed" 
              min="0.1" 
              max="3" 
              step="0.1"
              @input="onSnowConfigChange"
            >
            <span class="value">{{ snowConfig.speed.toFixed(1) }}</span>
          </div>
        </div>
        <div class="prop-row">
          <label>透明度</label>
          <div class="slider-row">
            <input 
              type="range" 
              v-model.number="snowConfig.opacity" 
              min="0.1" 
              max="1" 
              step="0.05"
              @input="onSnowConfigChange"
            >
            <span class="value">{{ snowConfig.opacity.toFixed(2) }}</span>
          </div>
        </div>
        <div class="prop-row">
          <label>颜色</label>
          <input type="color" v-model="snowConfig.color" @change="onSnowConfigChange">
        </div>
      </div>
    </div>

    <div class="warning-info">
      <span class="warning-icon">⚠️</span>
      <small>天气效果仅用于预览，不会随场景保存</small>
    </div>

    <div class="debug-info">
      <small>天气效果会影响场景渲染性能</small>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';

// 下雨开关
const rainEnabled = ref(false);

// 下雨配置
const rainConfig = reactive({
  intensity: 1000,  // 雨量 (粒子数量)
  speed: 2.0        // 雨速
});

// 下雪开关
const snowEnabled = ref(false);

// 下雪配置
const snowConfig = reactive({
  intensity: 1000,  // 雪量 (粒子数量)
  size: 0.5,        // 雪花大小
  speed: 1.0,       // 下落速度
  opacity: 0.8,     // 透明度
  color: '#ffffff'  // 颜色
});

// 切换下雨效果
const onRainToggle = () => {
  if (window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.setRain(rainEnabled.value, {
      count: rainConfig.intensity,
      speed: rainConfig.speed
    });
  }
};

// 下雨参数变化
const onRainConfigChange = () => {
  if (rainEnabled.value && window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.updateRainConfig({
      count: rainConfig.intensity,
      speed: rainConfig.speed
    });
  }
};

// 切换下雪效果
const onSnowToggle = () => {
  if (window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.setSnow(snowEnabled.value, {
      count: snowConfig.intensity,
      size: snowConfig.size,
      speed: snowConfig.speed,
      opacity: snowConfig.opacity,
      color: snowConfig.color
    });
  }
};

// 下雪参数变化
const onSnowConfigChange = () => {
  if (snowEnabled.value && window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.updateSnowConfig({
      count: snowConfig.intensity,
      size: snowConfig.size,
      speed: snowConfig.speed,
      opacity: snowConfig.opacity,
      color: snowConfig.color
    });
  }
};
</script>

<style scoped>
.weather-panel {
  width: 100%;
  height: 100%;
  background: #222;
  color: white;
  padding: 15px;
  overflow-y: auto;
}

h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #fff;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

.section {
  margin-bottom: 20px;
  background: #2a2a2a;
  padding: 10px;
  border-radius: 4px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

h4 {
  margin: 0;
  font-size: 13px;
  color: #ddd;
  font-weight: 500;
}

.params-container {
  padding-top: 10px;
  border-top: 1px solid #333;
}

.prop-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.prop-row label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 6px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-row input[type="range"] {
  flex: 1;
  height: 4px;
  background: #444;
  border-radius: 2px;
  -webkit-appearance: none;
  appearance: none;
}

.slider-row input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: #0066cc;
  border-radius: 50%;
  cursor: pointer;
}

.slider-row input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #0066cc;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.slider-row .value {
  font-size: 12px;
  color: #4CAF50;
  min-width: 45px;
  text-align: right;
  font-family: 'Consolas', 'Monaco', monospace;
}

input[type="color"] {
  width: 100%;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

/* Switch 开关样式 */
.switch-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #444;
  transition: 0.3s;
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4CAF50;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.switch-label {
  font-size: 11px;
  color: #888;
  min-width: 30px;
}

.warning-info {
  margin-top: 15px;
  padding: 8px 10px;
  background: rgba(255, 193, 7, 0.15);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.warning-info .warning-icon {
  font-size: 14px;
}

.warning-info small {
  color: #ffc107;
  font-size: 11px;
}

.debug-info {
  margin-top: 10px;
  color: #666;
  font-size: 10px;
  text-align: center;
}
</style>
