<template>
  <div class="scene-settings-panel">
    <h3>场景配置</h3>
    
    <div class="section">
      <h4>基本信息</h4>
      <div class="prop-row">
        <label>场景名称</label>
        <input type="text" v-model="editorStore.sceneMetadata.name" placeholder="输入场景名称">
      </div>
      <div class="prop-row">
        <label>描述</label>
        <textarea v-model="editorStore.sceneMetadata.description" rows="3" placeholder="场景描述..."></textarea>
      </div>
    </div>

    <div class="section">
      <h4>环境设置</h4>
      <div class="prop-row">
        <label>背景色</label>
        <input type="color" v-model="sceneConfig.backgroundColor">
      </div>
      <div class="prop-row">
        <label>环境光强度</label>
        <input type="number" v-model.number="sceneConfig.ambientIntensity" step="0.1" min="0" max="5">
      </div>
      <div class="prop-row">
        <label>相机可视距离 (Far)</label>
        <input type="number" v-model.number="editorStore.sceneMetadata.cameraFar" @change="onCameraFarChange" step="1000" min="100">
      </div>
    </div>

    <div class="section">
      <h4>调试设置</h4>
      <div class="prop-row switch-row">
        <label>性能监视器</label>
        <div class="switch-container">
          <label class="switch">
            <input type="checkbox" v-model="showStats" @change="onStatsToggle">
            <span class="slider"></span>
          </label>
          <span class="switch-label">{{ showStats ? '开启' : '关闭' }}</span>
        </div>
      </div>
      <div class="hint" v-if="showStats">
        在场景右上角显示 FPS 和渲染延迟
      </div>

      <div class="prop-row switch-row" style="margin-top: 12px;">
        <label>三角形统计</label>
        <div class="switch-container">
          <label class="switch">
            <input type="checkbox" v-model="showTriangleStats" @change="onTriangleStatsToggle">
            <span class="slider"></span>
          </label>
          <span class="switch-label">{{ showTriangleStats ? '开启' : '关闭' }}</span>
        </div>
      </div>
      <div class="stats-display" v-if="showTriangleStats">
        <div class="stats-row">
          <span class="stats-label">GPU 渲染三角形</span>
          <span class="stats-value">{{ triangleStats.rendered.toLocaleString() }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">场景总三角形</span>
          <span class="stats-value">{{ triangleStats.total.toLocaleString() }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Draw Calls</span>
          <span class="stats-value">{{ triangleStats.drawCalls.toLocaleString() }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">纹理数量</span>
          <span class="stats-value">{{ triangleStats.textureCount.toLocaleString() }}</span>
        </div>
      </div>

      <div class="prop-row switch-row" style="margin-top: 12px;">
        <label>坐标轴</label>
        <div class="switch-container">
          <label class="switch">
            <input type="checkbox" v-model="showAxes" @change="onAxesToggle">
            <span class="slider"></span>
          </label>
          <span class="switch-label">{{ showAxes ? '开启' : '关闭' }}</span>
        </div>
      </div>
      <div class="hint" v-if="showAxes">
        显示 XYZ 坐标轴（红=X 绿=Y 蓝=Z）
      </div>

      <div class="prop-row switch-row" style="margin-top: 12px;">
        <label>BVH 可视化</label>
        <div class="switch-container">
          <label class="switch">
            <input type="checkbox" v-model="showBVH" @change="onBVHToggle">
            <span class="slider"></span>
          </label>
          <span class="switch-label">{{ showBVH ? '开启' : '关闭' }}</span>
        </div>
      </div>
      <div class="bvh-depth-control" v-if="showBVH">
        <div class="depth-row">
          <span class="depth-label">显示深度</span>
          <span class="depth-value">{{ bvhDepth }}</span>
        </div>
        <input type="range" v-model.number="bvhDepth" @input="onBVHDepthChange" min="1" max="20" step="1">
        <div class="hint">调整 BVH 包围盒显示的层级深度</div>
      </div>
    </div>
    
    <div class="debug-info">
      <small>这里是场景级别的全局配置</small>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onBeforeUnmount, onMounted } from 'vue';
import { useEditorStore } from '../stores/editorStore';

const editorStore = useEditorStore();

// 模拟的场景配置数据，未来应该连接到 Store (部分暂未接入后端的数据)
const sceneConfig = reactive({
  backgroundColor: '#000000',
  ambientIntensity: 1.0
});

// 性能监视器开关状态
const showStats = ref(false);

// 三角形统计开关状态
const showTriangleStats = ref(false);

// 三角形统计数据
const triangleStats = reactive({
  rendered: 0,
  total: 0,
  drawCalls: 0,
  textureCount: 0
});

// 坐标轴开关状态
const showAxes = ref(false);

// BVH 可视化开关状态
const showBVH = ref(false);

// BVH 显示深度
const bvhDepth = ref(10);

// 切换性能监视器
const onStatsToggle = () => {
  if (window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.toggleStats(showStats.value);
  }
};

// 修改相机视距
const onCameraFarChange = () => {
  if (window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.setCameraFar(editorStore.sceneMetadata.cameraFar);
  }
};

onMounted(() => {
  if (window.editor && window.editor.sceneManager) {
    // 首次如果不存在值，则初始化一次
    if (!editorStore.sceneMetadata.cameraFar) {
      editorStore.setSceneMetadata({ cameraFar: window.editor.sceneManager.getCameraFar() });
    }
  }
});

// 切换三角形统计
const onTriangleStatsToggle = () => {
  if (window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.toggleTriangleStats(
      showTriangleStats.value,
      (stats) => {
        triangleStats.rendered = stats.rendered;
        triangleStats.total = stats.total;
        triangleStats.drawCalls = stats.drawCalls;
        triangleStats.textureCount = stats.textureCount;
      },
      100
    );
  }
};

// 切换坐标轴显示
const onAxesToggle = () => {
  if (window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.setAxesHelper(showAxes.value, 10);
  }
};

// 切换 BVH 可视化
const onBVHToggle = () => {
  if (window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.setBVHHelper(showBVH.value, bvhDepth.value);
  }
};

// 更新 BVH 深度
const onBVHDepthChange = () => {
  if (window.editor && window.editor.sceneManager && showBVH.value) {
    window.editor.sceneManager.updateBVHDepth(bvhDepth.value);
  }
};

// 组件卸载时关闭统计和 BVH Helper
onBeforeUnmount(() => {
  if (window.editor && window.editor.sceneManager) {
    window.editor.sceneManager.toggleTriangleStats(false);
    window.editor.sceneManager.setBVHHelper(false);
  }
});
</script>

<style scoped>
.scene-settings-panel {
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

h4 {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #888;
  font-weight: normal;
  text-transform: uppercase;
}

.prop-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.prop-row label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

input[type="text"],
input[type="number"],
textarea {
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 6px 8px;
  border-radius: 3px;
  font-size: 12px;
  width: 100%;
}

textarea {
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #0066cc;
  outline: none;
}

input[type="color"] {
  width: 100%;
  height: 30px;
  padding: 0;
  border: none;
  cursor: pointer;
}

.debug-info {
  margin-top: 20px;
  color: #444;
  font-size: 10px;
  text-align: center;
}

/* Switch 开关样式 */
.switch-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.switch-row > label {
  margin-bottom: 0;
}

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

.hint {
  font-size: 10px;
  color: #666;
  margin-top: 4px;
  padding-left: 4px;
}

/* 三角形统计显示样式 */
.stats-display {
  margin-top: 8px;
  padding: 8px;
  background: #1a1a1a;
  border-radius: 4px;
  border: 1px solid #333;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.stats-row:not(:last-child) {
  border-bottom: 1px solid #333;
}

.stats-label {
  font-size: 11px;
  color: #888;
}

.stats-value {
  font-size: 12px;
  color: #4CAF50;
  font-weight: 500;
  font-family: 'Consolas', 'Monaco', monospace;
}

/* BVH 深度控制样式 */
.bvh-depth-control {
  margin-top: 8px;
  padding: 8px;
  background: #1a1a1a;
  border-radius: 4px;
  border: 1px solid #333;
}

.depth-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.depth-label {
  font-size: 11px;
  color: #888;
}

.depth-value {
  font-size: 12px;
  color: #4CAF50;
  font-weight: 500;
  font-family: 'Consolas', 'Monaco', monospace;
}

.bvh-depth-control input[type="range"] {
  width: 100%;
  height: 4px;
  background: #444;
  border-radius: 2px;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.bvh-depth-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: #4CAF50;
  border-radius: 50%;
  cursor: pointer;
}

.bvh-depth-control input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #4CAF50;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
</style>
