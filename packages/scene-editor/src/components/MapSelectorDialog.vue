<template>
  <div class="map-selector-overlay" @click.self="handleCancel">
    <div class="map-selector-dialog">
      <div class="dialog-header">
        <h3>{{ lockCenter ? '调整范围' : '选择地理位置' }}</h3>
        <button class="close-btn" @click="handleCancel">×</button>
      </div>

      <div class="dialog-body">
        <div class="map-container" ref="mapContainer"></div>
        
        <div class="controls">
          <div class="size-control">
            <label>选框边长 (米)</label>
            <input 
              type="number" 
              v-model.number="boxSize" 
              min="100" 
              max="10000" 
              step="100"
              @input="updateBoxes"
            >
          </div>
          
          <!-- 鼠标位置（预览） -->
          <div class="info-display preview" v-if="hoverCenter && !lockCenter">
            <div class="info-title">鼠标位置（预览）</div>
            <div class="coord-row">
              <div class="coord-item">
                <span class="label">经度</span>
                <span class="value">{{ hoverCenter.lng.toFixed(6) }}°</span>
              </div>
              <div class="coord-item">
                <span class="label">纬度</span>
                <span class="value">{{ hoverCenter.lat.toFixed(6) }}°</span>
              </div>
            </div>
          </div>

          <!-- 已选定位置 -->
          <div class="info-display selected" v-if="selectedCenter">
            <div class="info-title">
              <span class="selected-icon">✓</span>
              已选定位置
            </div>
            <div class="coord-row">
              <div class="coord-item">
                <span class="label">中心经度</span>
                <span class="value">{{ selectedCenter.lng.toFixed(6) }}°</span>
              </div>
              <div class="coord-item">
                <span class="label">中心纬度</span>
                <span class="value">{{ selectedCenter.lat.toFixed(6) }}°</span>
              </div>
            </div>
          </div>

          <p class="hint" v-if="!lockCenter && !selectedCenter">
            移动鼠标预览位置，点击地图选定中心点
          </p>
          <p class="hint" v-else-if="!lockCenter && selectedCenter">
            已选定中心点，可继续点击修改位置或调整选框大小
          </p>
          <p class="hint" v-else>
            中心点已锁定，可调整选框大小后确认
          </p>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn-cancel" @click="handleCancel">取消</button>
        <button class="btn-confirm" @click="handleConfirm" :disabled="!selectedCenter">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
  initialCenter: {
    type: Object,
    default: null
  },
  initialSize: {
    type: Number,
    default: 1000
  },
  lockCenter: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['confirm', 'cancel']);

const mapContainer = ref(null);
const boxSize = ref(props.initialSize);

// 鼠标悬停位置（预览）
const hoverCenter = ref(null);
// 已选定的中心位置（点击后）
const selectedCenter = ref(props.initialCenter ? { ...props.initialCenter } : null);

let map = null;
let previewBox = null;   // 灰色预览框
let selectedBox = null;  // 红色已选定框

// 天地图 Token
const TIANDITU_TOKEN = 'd3940c4f1d55fdfb8b053ad7f1e0c80d';

// 根据中心点和边长计算正方形边界
const calculateSquareBounds = (center, sizeMeters) => {
  if (!center) return null;
  
  const latOffset = (sizeMeters / 2) / 111320;
  const lngOffset = (sizeMeters / 2) / (111320 * Math.cos(center.lat * Math.PI / 180));
  
  return L.latLngBounds(
    [center.lat - latOffset, center.lng - lngOffset],
    [center.lat + latOffset, center.lng + lngOffset]
  );
};

// 计算经纬度边界值
const calculateBoundsCoords = (center, sizeMeters) => {
  if (!center) return null;
  
  const latOffset = (sizeMeters / 2) / 111320;
  const lngOffset = (sizeMeters / 2) / (111320 * Math.cos(center.lat * Math.PI / 180));
  
  return {
    maxLat: center.lat + latOffset,
    minLat: center.lat - latOffset,
    maxLng: center.lng + lngOffset,
    minLng: center.lng - lngOffset
  };
};

// 更新预览框（灰色，跟随鼠标）
const updatePreviewBox = () => {
  if (!map || !hoverCenter.value || props.lockCenter) return;
  
  const bounds = calculateSquareBounds(hoverCenter.value, boxSize.value);
  if (!bounds) return;
  
  if (previewBox) {
    previewBox.setBounds(bounds);
  } else {
    previewBox = L.rectangle(bounds, {
      color: '#888888',
      weight: 2,
      fillColor: '#888888',
      fillOpacity: 0.15,
      dashArray: '5, 5'
    }).addTo(map);
  }
};

// 更新已选定框（红色）
const updateSelectedBox = () => {
  if (!map || !selectedCenter.value) return;
  
  const bounds = calculateSquareBounds(selectedCenter.value, boxSize.value);
  if (!bounds) return;
  
  if (selectedBox) {
    selectedBox.setBounds(bounds);
  } else {
    selectedBox = L.rectangle(bounds, {
      color: '#ff0000',
      weight: 3,
      fillColor: '#ff0000',
      fillOpacity: 0.25
    }).addTo(map);
  }
};

// 更新所有选框
const updateBoxes = () => {
  updatePreviewBox();
  updateSelectedBox();
};

// 初始化地图
const initMap = () => {
  if (!mapContainer.value) return;

  const defaultCenter = props.initialCenter || { lat: 39.9042, lng: 116.4074 };
  
  map = L.map(mapContainer.value, {
    center: [defaultCenter.lat, defaultCenter.lng],
    zoom: 14,
    zoomControl: true
  });

  // 天地图卫星影像图层
  L.tileLayer(
    `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TOKEN}`,
    {
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      maxZoom: 18,
      attribution: '© 天地图'
    }
  ).addTo(map);

  // 天地图标注图层
  L.tileLayer(
    `https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TOKEN}`,
    {
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      maxZoom: 18
    }
  ).addTo(map);

  // 如果有初始中心点（调整范围模式或恢复配置）
  if (props.initialCenter) {
    selectedCenter.value = { ...props.initialCenter };
    updateSelectedBox();
  }

  // 非锁定模式：鼠标移动显示预览框
  if (!props.lockCenter) {
    map.on('mousemove', (e) => {
      hoverCenter.value = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      updatePreviewBox();
    });

    // 点击选定位置
    map.on('click', (e) => {
      selectedCenter.value = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      updateSelectedBox();
    });

    // 鼠标离开地图时隐藏预览框
    map.on('mouseout', () => {
      if (previewBox) {
        map.removeLayer(previewBox);
        previewBox = null;
      }
      hoverCenter.value = null;
    });
  }
};

// 确认选择
const handleConfirm = () => {
  if (!selectedCenter.value) return;
  
  const bounds = calculateBoundsCoords(selectedCenter.value, boxSize.value);
  
  emit('confirm', {
    center: { ...selectedCenter.value },
    size: boxSize.value,
    bounds
  });
};

// 取消
const handleCancel = () => {
  emit('cancel');
};

// 监听 boxSize 变化
watch(boxSize, () => {
  updateBoxes();
});

onMounted(() => {
  setTimeout(() => {
    initMap();
  }, 100);
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
.map-selector-overlay {
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

.map-selector-dialog {
  background: #2a2a2a;
  border-radius: 8px;
  width: 800px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid #444;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #444;
}

.dialog-header h3 {
  margin: 0;
  color: #fff;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.dialog-body {
  flex: 1;
  padding: 20px;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 400px;
  border-radius: 4px;
  overflow: hidden;
  background: #333;
}

.controls {
  margin-top: 16px;
}

.size-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.size-control label {
  color: #aaa;
  font-size: 13px;
  white-space: nowrap;
}

.size-control input {
  width: 120px;
  background: #333;
  border: 1px solid #444;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
}

.size-control input:focus {
  border-color: #0066cc;
  outline: none;
}

.info-display {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.info-display.preview {
  background: #333;
  border: 1px solid #555;
}

.info-display.selected {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid #4CAF50;
}

.info-title {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-display.selected .info-title {
  color: #4CAF50;
}

.selected-icon {
  font-size: 14px;
}

.coord-row {
  display: flex;
  gap: 24px;
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
  font-size: 14px;
  font-family: monospace;
}

.hint {
  color: #888;
  font-size: 12px;
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #444;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background: transparent;
  color: #aaa;
  border: 1px solid #444;
}

.btn-cancel:hover {
  color: #fff;
  border-color: #666;
}

.btn-confirm {
  background: #0066cc;
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: #0077ee;
}

.btn-confirm:disabled {
  background: #444;
  color: #666;
  cursor: not-allowed;
}
</style>
