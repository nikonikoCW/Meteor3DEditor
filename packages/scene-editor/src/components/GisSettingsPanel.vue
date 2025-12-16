<template>
  <div class="gis-settings-panel">
    <h3>GIS 配置</h3>

    <!-- 网格辅助线开关 -->
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
      
      <!-- 显示影像地图开关 -->
      <div class="prop-row switch-row" style="margin-top: 12px;">
        <label>显示影像地图</label>
        <div class="toggle-switch">
          <input 
            type="checkbox" 
            id="basemap-toggle" 
            v-model="showBaseMap" 
            @change="handleBaseMapChange"
            :disabled="!isConfigured || isGeneratingBaseMap"
          >
          <label for="basemap-toggle"></label>
        </div>
      </div>
      <p class="hint" v-if="isGeneratingBaseMap">⚙️ 正在生成底图...</p>
      <p class="hint" v-else-if="baseMapUrl">已加载影像底图</p>
      <p class="hint" v-else-if="isConfigured">配置 GIS 后可生成底图</p>
    </div>
    <!-- 未配置状态 -->
    <div v-if="!isConfigured" class="section unconfigured-state">
      <button class="enable-btn" @click="openMapSelector">
        <span class="icon">+</span> 启用地理环境
      </button>
      <p v-if="hasCachedConfig" class="restore-hint">
        检测到历史配置，点击后将自动恢复
      </p>
    </div>

    <!-- 已配置状态 -->
    <template v-else>
      <div class="section info-section">
        <div class="status-header">
          <span class="status-icon">✓</span>
          <span>地理环境已激活</span>
        </div>
        
        <div class="coord-grid">
          <div class="coord-item">
            <span class="label">中心经度</span>
            <span class="value">{{ gisConfig.center.lng.toFixed(6) }}°</span>
          </div>
          <div class="coord-item">
            <span class="label">中心纬度</span>
            <span class="value">{{ gisConfig.center.lat.toFixed(6) }}°</span>
          </div>
        </div>
      </div>

      <div class="section bounds-section">
        <h4>范围信息 ({{ gisConfig.size }}m × {{ gisConfig.size }}m)</h4>
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

      <div class="section action-section">
        <button class="action-btn" @click="openAdjustDialog">调整范围</button>
        <button class="action-btn danger" @click="showRemoveWarning = true">移除 GIS</button>
      </div>
    </template>

    <!-- 地图选择器弹窗 -->
    <MapSelectorDialog 
      v-if="showMapDialog"
      :initial-center="dialogCenter"
      :initial-size="dialogSize"
      :lock-center="isAdjustMode"
      @confirm="handleMapConfirm"
      @cancel="handleMapCancel"
    />

    <!-- 移除警告弹窗 -->
    <div v-if="showRemoveWarning" class="warning-overlay">
      <div class="warning-dialog">
        <h4>⚠️ 高危操作警告</h4>
        <p>移除地理信息后，所有基于经纬度的自动化逻辑将失效，但模型将保留在当前相对位置。</p>
        <p class="confirm-text"><strong>是否继续？</strong></p>
        <div class="actions">
          <button class="btn-cancel" @click="showRemoveWarning = false">取消</button>
          <button class="btn-danger" @click="confirmRemove">确认移除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { GisProjection } from '@meteor3d/core';
import { API_BASE_URL, ASSET_BASE_URL } from '../config';
import MapSelectorDialog from './MapSelectorDialog.vue';

// 路由
const route = useRoute();

// 状态
const isConfigured = ref(false);
const showGrid = ref(false);
const showBaseMap = ref(false);
const baseMapUrl = ref(null);
const isGeneratingBaseMap = ref(false);
const showMapDialog = ref(false);
const showRemoveWarning = ref(false);
const isAdjustMode = ref(false);

// 当前配置
const gisConfig = reactive({
  center: { lng: 0, lat: 0 },
  size: 1000,
  bounds: null
});

// 缓存配置（用于移除后恢复）
const cachedConfig = ref(null);

// 是否有缓存配置
const hasCachedConfig = computed(() => cachedConfig.value !== null);

// 地图弹窗的初始参数
const dialogCenter = computed(() => {
  if (isAdjustMode.value && isConfigured.value) {
    return { ...gisConfig.center };
  }
  if (hasCachedConfig.value) {
    return { ...cachedConfig.value.center };
  }
  return null;
});

const dialogSize = computed(() => {
  if (isAdjustMode.value && isConfigured.value) {
    return gisConfig.size;
  }
  if (hasCachedConfig.value) {
    return cachedConfig.value.size;
  }
  return 1000;
});

// 边界显示
const displayBounds = computed(() => {
  if (!isConfigured.value || !gisConfig.bounds) {
    return { maxLng: '-', minLng: '-', maxLat: '-', minLat: '-' };
  }
  const { maxLng, minLng, maxLat, minLat } = gisConfig.bounds;
  return {
    maxLng: Number(maxLng).toFixed(6),
    minLng: Number(minLng).toFixed(6),
    maxLat: Number(maxLat).toFixed(6),
    minLat: Number(minLat).toFixed(6)
  };
});

// 应用 GIS 配置（公共逻辑）
const applyGisConfig = (cfg, options = {}) => {
  if (!cfg) return;
  
  // 更新 center
  if (cfg.center) {
    gisConfig.center.lng = cfg.center.lng ?? gisConfig.center.lng;
    gisConfig.center.lat = cfg.center.lat ?? gisConfig.center.lat;
  }
  
  // 兼容旧版 range 格式
  if (cfg.range) {
    gisConfig.size = cfg.range.length ?? cfg.range.width ?? gisConfig.size;
  }
  if (cfg.size) {
    gisConfig.size = cfg.size;
  }
  
  // 更新 bounds
  if (cfg.bounds) {
    gisConfig.bounds = { ...cfg.bounds };
  } else if (options.calculateBoundsIfMissing && gisConfig.center.lng && gisConfig.center.lat) {
    gisConfig.bounds = calculateBounds(gisConfig.center, gisConfig.size);
  }
  
  // 更新网格状态
  if (cfg.gridVisible !== undefined) {
    showGrid.value = cfg.gridVisible;
  }
  
  // 更新底图状态
  if (cfg.baseMapUrl) {
    baseMapUrl.value = cfg.baseMapUrl;
    showBaseMap.value = cfg.showBaseMap ?? false;
  }
  
  // 更新 enable 状态
  if (cfg.enable === false) {
    isConfigured.value = false;
    cachedConfig.value = {
      center: { ...gisConfig.center },
      size: gisConfig.size,
      bounds: gisConfig.bounds ? { ...gisConfig.bounds } : null
    };
  } else if (cfg.enable === true || cfg.center) {
    isConfigured.value = true;
  }
};

// 从 SceneManager 恢复状态
const hydrateFromSceneManager = () => {
  const sm = window.editor?.sceneManager;
  if (sm && sm.gisConfig) {
    applyGisConfig(sm.gisConfig, { calculateBoundsIfMissing: true });
  }
};

// 计算边界
const calculateBounds = (center, size) => {
  const latOffset = (size / 2) / 111320;
  const lngOffset = (size / 2) / (111320 * Math.cos(center.lat * Math.PI / 180));
  return {
    maxLat: center.lat + latOffset,
    minLat: center.lat - latOffset,
    maxLng: center.lng + lngOffset,
    minLng: center.lng - lngOffset
  };
};

// 打开地图选择器（新建模式）
const openMapSelector = () => {
  isAdjustMode.value = false;
  showMapDialog.value = true;
};

// 打开调整范围弹窗
const openAdjustDialog = () => {
  isAdjustMode.value = true;
  showMapDialog.value = true;
};

// 地图确认回调
const handleMapConfirm = async (result) => {
  gisConfig.center.lng = result.center.lng;
  gisConfig.center.lat = result.center.lat;
  gisConfig.size = result.size;
  gisConfig.bounds = result.bounds;

  isConfigured.value = true;
  showMapDialog.value = false;
  isAdjustMode.value = false;

  // 同步到 SceneManager
  syncToSceneManager();

  // 自动生成底图
  await generateBaseMapRequest();
};

// 地图取消回调
const handleMapCancel = () => {
  showMapDialog.value = false;
  isAdjustMode.value = false;
};

// 确认移除 GIS（软删除）
const confirmRemove = () => {
  // 缓存当前配置（用于前端恢复）
  cachedConfig.value = {
    center: { ...gisConfig.center },
    size: gisConfig.size,
    bounds: gisConfig.bounds ? { ...gisConfig.bounds } : null
  };

  // 清除前端配置状态
  isConfigured.value = false;
  showRemoveWarning.value = false;

  // 通知 SceneManager 软删除（设置 enable=false，保留数据）
  if (window.editor?.sceneManager) {
    window.editor.sceneManager.clearGisConfig();
  }
};

// 同步到 SceneManager
const syncToSceneManager = () => {
  if (!window.editor?.sceneManager) return;

  const sm = window.editor.sceneManager;
  const gridSegments = Math.max(1, Math.round(gisConfig.size / 10));

  sm.setGisConfig({
    center: { ...gisConfig.center },
    size: gisConfig.size,
    bounds: gisConfig.bounds ? { ...gisConfig.bounds } : null,
    enable: true, // 启用 GIS
    projection: 'WGS84',
    gridVisible: showGrid.value,
    baseMapUrl: baseMapUrl.value,
    showBaseMap: showBaseMap.value
  });

  sm.setGridHelper(showGrid.value, gisConfig.size, gisConfig.size, gridSegments, gridSegments);
};

// 网格切换
const handleGridChange = () => {
  
  if (!window.editor?.sceneManager) return;

  if (isConfigured.value) {
    const gridSegments = Math.max(1, Math.round(gisConfig.size / 10));
    window.editor.sceneManager.setGridHelper(
      showGrid.value, 
      gisConfig.size, 
      gisConfig.size, 
      gridSegments, 
      gridSegments
    );
  } else {
    window.editor.sceneManager.setGridHelper(showGrid.value);
  }
};

// 生成底图请求
const generateBaseMapRequest = async () => {
  if (!gisConfig.bounds || !window.editor?.sceneManager) return;

  // 从路由获取 sceneId
  const sceneId = route.params.sceneId;
  if (!sceneId) {
    console.warn('场景未保存，无法生成底图');
    return;
  }

  isGeneratingBaseMap.value = true;

  try {
    const response = await fetch(`${API_BASE_URL}/scene/basemap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sceneId: sceneId,
        bounds: gisConfig.bounds
      })
    });

    const data = await response.json();

    if (data.success) {
      baseMapUrl.value = data.baseMapUrl;
      
      // 自动开启显示
      showBaseMap.value = true;
      
      // 同步到 SceneManager（确保保存时包含 baseMapUrl）
      syncToSceneManager();
      
      handleBaseMapChange();
    } else {
      console.error('底图生成失败:', data.message);
    }
  } catch (error) {
    console.error('底图生成请求失败:', error);
  } finally {
    isGeneratingBaseMap.value = false;
  }
};

// 底图显示切换
const handleBaseMapChange = () => {
  if (!window.editor?.sceneManager) return;
  
  const sm = window.editor.sceneManager;
  
  if (showBaseMap.value && baseMapUrl.value && gisConfig.bounds) {
    // 显示底图
    const fullUrl = `${ASSET_BASE_URL}${baseMapUrl.value}`;
    sm.setBaseMap(fullUrl, gisConfig.bounds, gisConfig.size, true);
  } else {
    // 隐藏底图
    sm.setBaseMap(null, null, null, false);
  }
};

onMounted(() => {
  hydrateFromSceneManager();
  if (showGrid.value) {
    handleGridChange();
  }
  // 恢复底图显示
  if (showBaseMap.value && baseMapUrl.value) {
    waitForSceneManagerAndShowBaseMap();
  }

  // 等待 sceneManager 就绪后显示底图
  const waitForSceneManagerAndShowBaseMap = () => {
    if (window.editor?.sceneManager) {
      handleBaseMapChange();
    } else {
      requestAnimationFrame(waitForSceneManagerAndShowBaseMap);
    }
  };

  // 监听 GIS 配置更新事件
  const handler = (e) => {
    if (!e?.detail) return;
    
    // 使用公共函数应用配置
    applyGisConfig(e.detail);
    
    // 如果需要显示底图，等待 sceneManager 就绪
    if (showBaseMap.value && baseMapUrl.value && gisConfig.bounds) {
      waitForSceneManagerAndShowBaseMap();
    }
  };

  window.addEventListener('gis-config-updated', handler);
  onBeforeUnmount(() => {
    window.removeEventListener('gis-config-updated', handler);
  });
});
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

.switch-row {
  margin-bottom: 0;
}

.hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #777;
}

/* Toggle Switch */
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

/* Unconfigured State */
.unconfigured-state {
  text-align: center;
  padding: 20px 10px;
}

.enable-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #0066cc, #0088ff);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.enable-btn:hover {
  background: linear-gradient(135deg, #0077dd, #0099ff);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.4);
}

.enable-btn .icon {
  font-size: 18px;
  font-weight: bold;
}

.restore-hint {
  margin-top: 12px;
  font-size: 12px;
  color: #4CAF50;
}

/* Info Section */
.info-section {
  padding: 16px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: #4CAF50;
  font-size: 14px;
  font-weight: 500;
}

.status-icon {
  font-size: 16px;
}

.coord-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.coord-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.coord-item .label {
  color: #888;
  font-size: 11px;
}

.coord-item .value {
  color: #fff;
  font-size: 13px;
  font-family: monospace;
}

/* Bounds Section */
.bounds-section {
  margin-top: -10px;
}

.bounds-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(3, auto);
  column-gap: 0;
  row-gap: 8px;
}

.bounds-cell {
  background: #333;
  border: 1px solid #3d3d3d;
  border-radius: 4px;
  padding: 8px;
  text-align: center;
}

.bounds-cell .label {
  color: #aaa;
  font-size: 11px;
  margin-bottom: 4px;
}

.bounds-cell .value {
  color: #fff;
  font-size: 12px;
  font-family: monospace;
}

.bounds-cell.north { grid-column: 1 / span 2; grid-row: 1; }
.bounds-cell.south { grid-column: 1 / span 2; grid-row: 3; }
.bounds-cell.west  { grid-column: 1; grid-row: 2; }
.bounds-cell.east  { grid-column: 2; grid-row: 2; }

/* Action Section */
.action-section {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  background: #333;
  border: 1px solid #444;
  color: #ccc;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #444;
  color: #fff;
}

.action-btn.danger {
  color: #ff6b6b;
  border-color: #ff6b6b33;
}

.action-btn.danger:hover {
  background: #ff6b6b22;
  border-color: #ff6b6b;
}

/* Warning Dialog */
.warning-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.warning-dialog {
  background: #2a2a2a;
  width: 400px;
  max-width: 90vw;
  padding: 24px;
  border-radius: 8px;
  border: 2px solid #ff6b6b;
  box-shadow: 0 8px 32px rgba(255, 107, 107, 0.2);
}

.warning-dialog h4 {
  margin: 0 0 16px 0;
  color: #ff6b6b;
  font-size: 16px;
  text-align: center;
  text-transform: none;
}

.warning-dialog p {
  color: #ccc;
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.warning-dialog .confirm-text {
  text-align: center;
  color: #fff;
}

.warning-dialog .actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-cancel {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: 1px solid #444;
  color: #aaa;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel:hover {
  color: #fff;
  border-color: #666;
}

.btn-danger {
  flex: 1;
  padding: 10px;
  background: #ff4d4f;
  border: none;
  color: white;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
}

.btn-danger:hover {
  background: #ff7875;
}
</style>
