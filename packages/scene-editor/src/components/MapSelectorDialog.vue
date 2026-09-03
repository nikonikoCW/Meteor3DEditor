<template>
  <div class="map-selector-overlay" @click.self="handleCancel">
    <div class="map-selector-dialog">
      <div class="dialog-header">
        <h3>{{ lockCenter ? '调整范围' : '选择地理位置' }}</h3>
        <button class="close-btn" @click="handleCancel">×</button>
      </div>

      <div class="dialog-body">
        <div class="map-wrapper">
          <div class="map-container" ref="mapContainer"></div>

          <form
            v-if="!lockCenter"
            ref="searchPanel"
            class="search-panel"
            @submit.prevent="searchPlace"
            @click.stop
          >
            <div class="search-box">
              <span class="search-icon" aria-hidden="true">⌕</span>
              <input
                v-model="searchKeyword"
                class="search-input"
                type="search"
                placeholder="搜索地名、地址、POI..."
                autocomplete="off"
                @focus="searchResults.length && (showSearchResults = true)"
              >
              <button
                class="search-btn"
                type="submit"
                :disabled="searchLoading || !searchKeyword.trim()"
              >
                {{ searchLoading ? '搜索中...' : '搜索' }}
              </button>
            </div>

            <div v-if="showSearchResults" class="search-results">
              <button
                v-for="(poi, index) in searchResults"
                :key="`${poi.id || poi.name}-${index}`"
                class="result-item"
                type="button"
                @click="selectSearchResult(poi)"
              >
                <span class="result-icon" aria-hidden="true">⌖</span>
                <span class="result-info">
                  <span class="result-name">{{ poi.name }}</span>
                  <span class="result-address">{{ poi.fullAddress || '暂无详细地址' }}</span>
                </span>
              </button>
              <div v-if="searchError" class="search-message">{{ searchError }}</div>
              <div v-else-if="!searchResults.length" class="search-message">未找到相关结果，请尝试其他关键词</div>
            </div>
          </form>
        </div>
        
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
          
          <div class="position-info-row">
            <!-- 鼠标位置（预览） -->
          <div class="info-display preview">
            <div class="info-title">鼠标位置（预览）</div>
            <div class="coord-row">
              <div class="coord-item">
                <span class="label">经度</span>
                <span class="value">{{ hoverCenter ? hoverCenter.lng.toFixed(6) + '°' : '--' }}</span>
              </div>
              <div class="coord-item">
                <span class="label">纬度</span>
                <span class="value">{{ hoverCenter ? hoverCenter.lat.toFixed(6) + '°' : '--' }}</span>
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
const searchPanel = ref(null);
const boxSize = ref(props.initialSize);
const searchKeyword = ref('');
const searchResults = ref([]);
const showSearchResults = ref(false);
const searchLoading = ref(false);
const searchError = ref('');

// 鼠标悬停位置（预览）
const hoverCenter = ref(null);
// 已选定的中心位置（点击后）
const selectedCenter = ref(props.initialCenter ? { ...props.initialCenter } : null);

let map = null;
let previewBox = null;   // 灰色预览框
let selectedBox = null;  // 红色已选定框
let searchMarker = null;
let placeSearch = null;

// 天地图 Token
const TIANDITU_TOKEN = 'd3940c4f1d55fdfb8b053ad7f1e0c80d';
const AMAP_KEY = '435f260ac56f7c9e60fa08bc0cd722d2';
const AMAP_SECURITY_CODE = '7da5bddeedccb781bbfcfa43f5917b9a';
const AMAP_SCRIPT_ID = 'amap-place-search-sdk';

// 高德 JS API 返回 GCJ-02 坐标，天地图使用 WGS84，需要在定位前转换。
const gcj02ToWgs84 = (lng, lat) => {
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) {
    return [lng, lat];
  }

  const PI = Math.PI;
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  const transformLat = (x, y) => {
    let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    value += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    value += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
    value += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
    return value;
  };
  const transformLng = (x, y) => {
    let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    value += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    value += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
    value += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
    return value;
  };

  let dLat = transformLat(lng - 105, lat - 35);
  let dLng = transformLng(lng - 105, lat - 35);
  const radLat = lat / 180 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = dLat * 180 / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
  dLng = dLng * 180 / (a / sqrtMagic * Math.cos(radLat) * PI);
  return [lng - dLng, lat - dLat];
};

const loadAmapSdk = () => {
  if (window.AMap?.PlaceSearch) return Promise.resolve(window.AMap);

  window._AMapSecurityConfig = {
    ...window._AMapSecurityConfig,
    securityJsCode: AMAP_SECURITY_CODE
  };

  return new Promise((resolve, reject) => {
    const handleLoaded = () => {
      if (window.AMap?.PlaceSearch) resolve(window.AMap);
      else reject(new Error('高德地图搜索插件加载失败'));
    };
    const handleError = () => reject(new Error('高德地图服务加载失败'));
    const existingScript = document.getElementById(AMAP_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener('load', handleLoaded, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = AMAP_SCRIPT_ID;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.PlaceSearch`;
    script.async = true;
    script.addEventListener('load', handleLoaded, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });
};

const ensurePlaceSearch = async () => {
  if (placeSearch) return placeSearch;
  const AMap = await loadAmapSdk();
  placeSearch = new AMap.PlaceSearch({ pageSize: 8, pageIndex: 1 });
  return placeSearch;
};

const normalizeAddressPart = (value) => Array.isArray(value) ? value.join('') : (value || '');

const searchPlace = async () => {
  const keyword = searchKeyword.value.trim();
  if (!keyword || searchLoading.value) return;

  searchLoading.value = true;
  searchError.value = '';
  searchResults.value = [];
  showSearchResults.value = false;

  try {
    const service = await ensurePlaceSearch();
    const result = await new Promise((resolve, reject) => {
      service.search(keyword, (status, response) => {
        if (status === 'complete' || status === 'no_data') resolve(response || {});
        else reject(new Error(response?.info || '搜索失败，请稍后重试'));
      });
    });

    const pois = result?.poiList?.pois || [];
    searchResults.value = pois
      .filter((poi) => poi.location)
      .slice(0, 8)
      .map((poi) => ({
        id: poi.id,
        name: poi.name,
        lng: Number(poi.location.lng),
        lat: Number(poi.location.lat),
        fullAddress: [
          normalizeAddressPart(poi.pname),
          normalizeAddressPart(poi.cityname),
          normalizeAddressPart(poi.adname),
          normalizeAddressPart(poi.address)
        ].filter(Boolean).join(' ')
      }));
  } catch (error) {
    searchError.value = error?.message || '搜索失败，请稍后重试';
  } finally {
    searchLoading.value = false;
    showSearchResults.value = true;
  }
};

const selectSearchResult = (poi) => {
  if (!map || props.lockCenter) return;

  const [lng, lat] = gcj02ToWgs84(poi.lng, poi.lat);
  selectedCenter.value = { lng, lat };
  searchKeyword.value = poi.name;
  showSearchResults.value = false;
  updateSelectedBox();

  if (searchMarker) map.removeLayer(searchMarker);
  searchMarker = L.circleMarker([lat, lng], {
    radius: 7,
    color: '#ffffff',
    weight: 3,
    fillColor: '#6366f1',
    fillOpacity: 1
  }).addTo(map).bindTooltip(poi.name, {
    permanent: true,
    direction: 'top',
    offset: [0, -10]
  });

  map.flyTo([lat, lng], 16, { duration: 1.2 });
};

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

  const defaultCenter = props.initialCenter || { lat: 34.218182, lng: 108.959407 };
  
  map = L.map(mapContainer.value, {
    center: [defaultCenter.lat, defaultCenter.lng],
    zoom: 14,
    zoomControl: true
  });

  if (searchPanel.value) {
    L.DomEvent.disableClickPropagation(searchPanel.value);
    L.DomEvent.disableScrollPropagation(searchPanel.value);
  }

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

  // 所有模式下都显示鼠标坐标；锁定模式只禁用中心点和预览框更新。
  map.on('mousemove', (e) => {
    hoverCenter.value = {
      lat: e.latlng.lat,
      lng: e.latlng.lng
    };
    updatePreviewBox();
  });

  if (!props.lockCenter) {
    // 点击选定位置
    map.on('click', (e) => {
      showSearchResults.value = false;
      if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
      }
      selectedCenter.value = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      updateSelectedBox();
    });
  }

  // 鼠标离开地图时清空坐标，并隐藏预览框。
  map.on('mouseout', () => {
    if (previewBox) {
      map.removeLayer(previewBox);
      previewBox = null;
    }
    hoverCenter.value = null;
  });
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
  width: 1120px;
  max-width: 96vw;
  max-height: 94vh;
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
  min-height: 0;
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.map-container {
  width: 100%;
  height: clamp(480px, 64vh, 700px);
  border-radius: 4px;
  overflow: hidden;
  background: #333;
}

.map-wrapper {
  position: relative;
}

.search-panel {
  position: absolute;
  top: 16px;
  left: 56px;
  z-index: 1000;
  width: min(420px, calc(100% - 80px));
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: rgba(24, 24, 30, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(12px);
}

.search-icon {
  flex: 0 0 32px;
  color: #9ba3b7;
  font-size: 22px;
  line-height: 1;
  text-align: center;
}

.search-input {
  min-width: 0;
  flex: 1;
  padding: 9px 2px;
  color: #f2f3f7;
  font-size: 14px;
  background: transparent;
  border: none;
  outline: none;
}

.search-input::placeholder {
  color: #787f8f;
}

.search-input::-webkit-search-cancel-button {
  filter: invert(1);
  opacity: 0.45;
}

.search-btn {
  flex: 0 0 auto;
  padding: 9px 18px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  background: #2563eb;
  border: none;
  border-radius: 7px;
  cursor: pointer;
}

.search-btn:hover:not(:disabled) {
  background: #3478f6;
}

.search-btn:disabled {
  color: #818697;
  background: #41434b;
  cursor: not-allowed;
}

.search-results {
  max-height: 360px;
  margin-top: 8px;
  overflow-y: auto;
  background: rgba(24, 24, 30, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
}

.result-item {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 11px;
  padding: 12px 14px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: rgba(52, 120, 246, 0.14);
}

.result-icon {
  flex: 0 0 28px;
  height: 28px;
  color: #82aaff;
  font-size: 18px;
  line-height: 28px;
  text-align: center;
  background: rgba(52, 120, 246, 0.16);
  border-radius: 7px;
}

.result-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.result-name,
.result-address {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-name {
  color: #f0f1f5;
  font-size: 13px;
  font-weight: 500;
}

.result-address {
  color: #8e94a3;
  font-size: 11px;
}

.search-message {
  padding: 24px 16px;
  color: #9aa0ad;
  font-size: 13px;
  text-align: center;
}

.controls {
  margin-top: 16px;
}

.position-info-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.position-info-row .info-display {
  min-width: 0;
  margin-bottom: 0;
}

.position-info-row .info-display:only-child {
  grid-column: 1 / -1;
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
@media (max-width: 720px) {
  .dialog-body {
    padding: 12px;
  }

  .position-info-row {
    grid-template-columns: 1fr;
  }

  .map-container {
    height: 460px;
  }

  .search-panel {
    top: 10px;
    left: 46px;
    width: calc(100% - 56px);
  }

  .search-icon {
    display: none;
  }

  .search-btn {
    padding-inline: 12px;
  }
}
</style>
