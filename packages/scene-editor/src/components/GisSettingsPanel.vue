<template>
  <div class="gis-settings-panel">
    <h3>GIS 配置</h3>

    <div class="section">
      <div class="prop-row switch-row">
        <label>开启 GIS 坐标</label>
        <div class="toggle-switch">
          <input 
            type="checkbox" 
            id="gis-toggle" 
            v-model="isEnabled" 
            @change="handleToggleChange"
          >
          <label for="gis-toggle"></label>
        </div>
      </div>
    </div>

    <div class="section">
      <h4>辅助功能</h4>
      <div class="prop-row switch-row">
        <label>显示网格辅助线</label>
        <div class="toggle-switch">
          <input 
            type="checkbox" 
            id="grid-toggle" 
            v-model="showGrid" 
            @change="handleGridChange"
          >
          <label for="grid-toggle"></label>
        </div>
      </div>
      <p class="hint">说明：当前网格以 10m × 10m 为一个小格</p>
    </div>

    <!-- GIS Info Display -->
    <div v-if="isEnabled && hasValidConfig" class="section info-section">
      <h4>配置信息</h4>
      <div class="prop-row">
        <label>中心经度</label>
        <span class="value">{{ gisConfig.center.lng }}°</span>
      </div>
      <div class="prop-row">
        <label>中心纬度</label>
        <span class="value">{{ gisConfig.center.lat }}°</span>
      </div>
      <div class="prop-row">
        <label>范围 (长/宽)</label>
        <span class="value">{{ gisConfig.range.length }}m / {{ gisConfig.range.width }}m</span>
      </div>
      <div class="prop-row">
        <label>投影坐标系</label>
        <span class="value">{{ projectionLabel }}</span>
      </div>
      <button class="edit-btn" @click="openDialog">修改配置</button>
    </div>

    <div v-if="isEnabled && hasValidConfig" class="section bounds-section">
      <h4>范围信息</h4>
      <div class="bounds-grid">
        <div class="bounds-cell north">
          <div class="label">最大纬度</div>
          <div class="value">{{ displayBounds.maxLat }}°</div>
        </div>
        <div class="bounds-cell west">
          <div class="label">最小经度</div>
          <div class="value">{{ displayBounds.minLng }}°</div>
        </div>
        <div class="bounds-cell east">
          <div class="label">最大经度</div>
          <div class="value">{{ displayBounds.maxLng }}°</div>
        </div>
        <div class="bounds-cell south">
          <div class="label">最小纬度</div>
          <div class="value">{{ displayBounds.minLat }}°</div>
        </div>
      </div>
    </div>

    <div class="debug-info">
      <small>GIS 坐标系统控制</small>
    </div>

    <!-- Config Dialog -->
    <div v-if="showDialog" class="modal-overlay">
      <div class="modal-content">
        <h4>GIS 场景配置</h4>
        
        <div class="form-group">
          <label>中心点坐标 (经度/纬度)</label>
          <div class="input-group">
            <input type="number" v-model.number="tempConfig.center.lng" placeholder="经度" step="0.000001">
            <input type="number" v-model.number="tempConfig.center.lat" placeholder="纬度" step="0.000001">
          </div>
        </div>

        <div class="form-group">
          <label>范围 (米)</label>
          <div class="input-group">
            <input type="number" v-model.number="tempConfig.range.length" placeholder="长度 (m)">
            <input type="number" v-model.number="tempConfig.range.width" placeholder="宽度 (m)">
          </div>
        </div>

        <div class="form-group">
          <label>投影坐标系</label>
          <select v-model="tempConfig.projection">
            <option value="WGS84">WGS84</option>
            <option value="CGCS2000">CGCS2000 (大地2000)</option>
            <option value="Xian80">Xi'an 80 (西安80)</option>
          </select>
        </div>

        <div class="error-msg" v-if="errorMsg">{{ errorMsg }}</div>

        <div class="modal-actions">
          <button @click="cancelEdit" class="btn-cancel">取消</button>
          <button @click="confirmEdit" class="btn-confirm">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { GisProjection } from '@meteor3d/core';

const isEnabled = ref(false);
const showGrid = ref(false);
const showDialog = ref(false);
const errorMsg = ref('');
const hasValidConfig = ref(false);

const gisConfig = reactive({
  center: { lng: 0, lat: 0 },
  range: { length: 5000, width: 6000 },
  projection: 'WGS84'
});

const tempConfig = reactive({
  center: { lng: null, lat: null },
  range: { length: null, width: null },
  projection: 'WGS84'
});

const projectionLabel = computed(() => {
  const map = {
    'WGS84': 'WGS84',
    'CGCS2000': '大地2000',
    'Xian80': '西安80'
  };
  return map[gisConfig.projection] || gisConfig.projection;
});

const displayBounds = computed(() => {
  if (!hasValidConfig.value) {
    return { maxLng: '-', minLng: '-', maxLat: '-', minLat: '-' };
  }

  const bounds = computeBoundsWithCore(gisConfig.center, gisConfig.range, gisConfig.projection);
  if (!bounds) {
    return { maxLng: '-', minLng: '-', maxLat: '-', minLat: '-' };
  }

  const { maxLng, minLng, maxLat, minLat } = bounds;
  return {
    maxLng: Number(maxLng).toFixed(6),
    minLng: Number(minLng).toFixed(6),
    maxLat: Number(maxLat).toFixed(6),
    minLat: Number(minLat).toFixed(6),
  };
});

const hydrateFromSceneManager = () => {
  const sm = window.editor?.sceneManager;
  if (sm && sm.gisConfig) {
    const cfg = sm.gisConfig;
    if (cfg.center) {
      gisConfig.center.lng = cfg.center.lng ?? gisConfig.center.lng;
      gisConfig.center.lat = cfg.center.lat ?? gisConfig.center.lat;
    }
    if (cfg.range) {
      gisConfig.range.length = cfg.range.length ?? gisConfig.range.length;
      gisConfig.range.width = cfg.range.width ?? gisConfig.range.width;
    }
    if (cfg.projection) {
      gisConfig.projection = cfg.projection;
    }
    showGrid.value = cfg.gridVisible ?? false;
    isEnabled.value = true;
    hasValidConfig.value = true;
  }
};

onMounted(() => {
  hydrateFromSceneManager();
  if (showGrid.value) {
    handleGridChange();
  }

  // 监听 SceneManager 的 GIS 配置更新事件
  const handler = (e) => {
    if (!e?.detail) return;
    const cfg = e.detail;

    if (cfg.center) {
      gisConfig.center.lng = cfg.center.lng ?? gisConfig.center.lng;
      gisConfig.center.lat = cfg.center.lat ?? gisConfig.center.lat;
    }
    if (cfg.range) {
      gisConfig.range.length = cfg.range.length ?? gisConfig.range.length;
      gisConfig.range.width = cfg.range.width ?? gisConfig.range.width;
    }
    if (cfg.projection) {
      gisConfig.projection = cfg.projection;
    }

    const prevShowGrid = showGrid.value;
    if (cfg.gridVisible !== undefined) {
      showGrid.value = cfg.gridVisible;
    }

    isEnabled.value = true;
    hasValidConfig.value = true;

    // 只有当网格显示状态发生变化时才触发更新，避免事件循环
    if (showGrid.value !== prevShowGrid) {
      handleGridChange();
    }
  };
  window.addEventListener('gis-config-updated', handler);
  onBeforeUnmount(() => {
    window.removeEventListener('gis-config-updated', handler);
  });
});

const handleToggleChange = () => {
  if (isEnabled.value) {
    // Turning ON
    openDialog();
  } else {
    // Turning OFF
    hasValidConfig.value = false;
    if (window.editor && window.editor.sceneManager) {
      window.editor.sceneManager.setGridHelper(false);
    }
  }
};

const getGridParams = () => {
  const length = hasValidConfig.value ? gisConfig.range.length : tempConfig.range.length || 10;
  const width = hasValidConfig.value ? gisConfig.range.width : tempConfig.range.width || 300;
  const widthSegments = Math.max(1, Math.round((width || 30) / 10));
  const lengthSegments = Math.max(1, Math.round((length || 30) / 10));
  return { length: length || 30, width: width || 30, widthSegments, lengthSegments };
};

const handleGridChange = () => {
  if (window.editor && window.editor.sceneManager) {
    const { length, width, widthSegments, lengthSegments } = getGridParams();
    window.editor.sceneManager.setGridHelper(showGrid.value, length, width, widthSegments, lengthSegments);
  }
};

// 使用核心库的投影工具计算边界
const computeBoundsWithCore = (center, range, projection) => {
  try {
    const gp = new GisProjection({
      center: { lng: Number(center.lng), lat: Number(center.lat) },
      projection,
    });
    return gp.computeBounds({
      length: Number(range.length),
      width: Number(range.width),
    });
  } catch (e) {
    console.error('computeBounds error:', e);
    return null;
  }
};

const openDialog = () => {
  // Init temp config with current values or defaults
  tempConfig.center.lng = hasValidConfig.value ? gisConfig.center.lng : null;
  tempConfig.center.lat = hasValidConfig.value ? gisConfig.center.lat : null;
  tempConfig.range.length = hasValidConfig.value ? gisConfig.range.length : null;
  tempConfig.range.width = hasValidConfig.value ? gisConfig.range.width : null;
  tempConfig.projection = hasValidConfig.value ? gisConfig.projection : 'WGS84'; // Default to WGS84 for dropdown
  
  errorMsg.value = '';
  showDialog.value = true;
};

const validate = () => {
  if (tempConfig.center.lng === null || tempConfig.center.lat === null) return '请输入完整的中心点坐标';
  if (!tempConfig.range.length || !tempConfig.range.width) return '请输入完整的范围尺寸';
  if (!tempConfig.projection) return '请选择投影坐标系';
  return '';
};

const confirmEdit = () => {
  const error = validate();
  if (error) {
    errorMsg.value = error;
    return;
  }

  // Save config
  gisConfig.center.lng = tempConfig.center.lng;
  gisConfig.center.lat = tempConfig.center.lat;
  gisConfig.range.length = tempConfig.range.length;
  gisConfig.range.width = tempConfig.range.width;
  gisConfig.projection = tempConfig.projection;

  hasValidConfig.value = true;
  isEnabled.value = true;
  showDialog.value = false;
  // 通知 SceneManager 更新 GIS 配置和网格大小
  if (window.editor && window.editor.sceneManager) {
    const { length, width, widthSegments, lengthSegments } = getGridParams();
    window.editor.sceneManager.setGisConfig({
      center: { ...gisConfig.center },
      range: { ...gisConfig.range },
      projection: gisConfig.projection,
      gridVisible: showGrid.value
    });
    window.editor.sceneManager.setGridHelper(showGrid.value, length, width, widthSegments, lengthSegments);
  }
};

const cancelEdit = () => {
  showDialog.value = false;
  // If we were turning it on but cancelled, revert toggle
  if (!hasValidConfig.value) {
    isEnabled.value = false;
  }
};
</script>

<style scoped>
.gis-settings-panel {
  width: 100%;
  height: 100%;
  background: #222;
  color: white;
  padding: 15px;
  overflow-y: auto;
  position: relative;
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
}

.prop-row label {
  color: #aaa;
}

.value {
  color: white;
  font-family: monospace;
}

.switch-row {
  margin-bottom: 0;
}

.hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #777;
}

.bounds-section {
  margin-top: -10px;
}

.bounds-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(3, auto);
  column-gap: 0;
  row-gap: 8px;
  align-items: center;
  justify-items: stretch;
}

.bounds-cell {
  background: #333;
  border: 1px solid #3d3d3d;
  border-radius: 4px;
  padding: 8px;
  width: 100%;
  text-align: center;
}

.bounds-cell .label {
  color: #aaa;
  font-size: 12px;
  margin-bottom: 4px;
}

.bounds-cell .value {
  color: #fff;
  font-size: 13px;
}

.bounds-cell.north { grid-column: 1 / span 2; grid-row: 1; }
.bounds-cell.south { grid-column: 1 / span 2; grid-row: 3; }
.bounds-cell.west  { grid-column: 1; grid-row: 2; }
.bounds-cell.east  { grid-column: 2; grid-row: 2; }

/* Toggle Switch Styles */
.toggle-switch {
  position: relative;
  width: 40px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #444;
  transition: .4s;
  border-radius: 20px;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.toggle-switch input:checked + label {
  background-color: #0066cc;
}

.toggle-switch input:checked + label:before {
  transform: translateX(20px);
}

.edit-btn {
  width: 100%;
  padding: 6px;
  background: #333;
  border: 1px solid #444;
  color: #ccc;
  border-radius: 3px;
  cursor: pointer;
  margin-top: 10px;
  font-size: 12px;
}

.edit-btn:hover {
  background: #444;
  color: white;
}

.debug-info {
  margin-top: 20px;
  color: #444;
  font-size: 10px;
  text-align: center;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #2a2a2a;
  width: 320px;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  border: 1px solid #444;
}

.modal-content h4 {
  margin: 0 0 20px 0;
  color: white;
  font-size: 14px;
  text-align: center;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 6px;
}

.input-group {
  display: flex;
  gap: 10px;
}

input[type="number"],
select {
  width: 100%;
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 6px 8px;
  border-radius: 3px;
  font-size: 12px;
}

input:focus,
select:focus {
  border-color: #0066cc;
  outline: none;
}

.error-msg {
  color: #ff4d4f;
  font-size: 12px;
  margin-bottom: 15px;
  text-align: center;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel,
.btn-confirm {
  padding: 6px 16px;
  border-radius: 4px;
  border: none;
  font-size: 12px;
  cursor: pointer;
}

.btn-cancel {
  background: transparent;
  color: #aaa;
  border: 1px solid #444;
}

.btn-cancel:hover {
  color: white;
  border-color: #666;
}

.btn-confirm {
  background: #0066cc;
  color: white;
}

.btn-confirm:hover {
  background: #0077ee;
}
</style>
