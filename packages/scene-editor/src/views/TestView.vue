<template>
  <div ref="container" class="ion-test-view">
    <canvas ref="canvas"></canvas>
    <div class="ion-overlay">
      <div class="ion-title">Cesium Ion 3D Tiles</div>
      <div class="ion-row">
        <label for="ion-asset-id">Asset ID</label>
        <input
          id="ion-asset-id"
          v-model="ionAssetId"
          type="text"
          placeholder="2275207"
          autocomplete="off"
        />
      </div>
      <div class="ion-row">
        <label for="ion-access-token">Access Token</label>
        <input
          id="ion-access-token"
          v-model="ionAccessToken"
          type="text"
          placeholder="paste your token"
          autocomplete="off"
        />
      </div>
      <div class="ion-actions">
        <button type="button" @click="reinstantiateTiles">Reload</button>
      </div>
      <div class="ion-hint">
        Paste the evaluation Cesium Ion token or your own token and asset id, then
        click Reload.
      </div>
    </div>
    
    <div class="settings-panel">
      <div class="settings-title">Environment Controls (环境控制器)</div>

      <div class="settings-group">
        <label class="settings-row">
          <span>Enabled (开启)</span>
          <input type="checkbox" v-model="controlsSettings.enabled" />
        </label>
        
        <label class="settings-row">
          <span>Enable Damping (开启阻尼)</span>
          <input type="checkbox" v-model="controlsSettings.enableDamping" />
        </label>

        <label class="settings-row">
          <span>Adjust Height (自动贴地)</span>
          <input type="checkbox" v-model="controlsSettings.adjustHeight" />
        </label>

        <label class="settings-row">
          <span>Auto Correct Up (自动回正)</span>
          <input type="checkbox" v-model="controlsSettings.autoAdjustCameraRotation" />
        </label>

        <label class="settings-row">
          <span>Scale Zoom @ Edges (边缘缩放)</span>
          <input type="checkbox" v-model="controlsSettings.scaleZoomOrientationAtEdges" />
        </label>

        <div class="settings-row" style="border-top: 1px solid #333; padding-top: 10px; margin-top: 5px;">
          <span>Use Fallback Plane (兜底平面)</span>
          <!-- Checkbox was here, keeping it compatible with previous layout -->
          <input type="checkbox" v-model="controlsSettings.useFallbackPlane" />
        </div>

        <div class="settings-row" v-if="controlsSettings.useFallbackPlane">
          <label>Offset (偏移)</label>
          <input type="number" v-model.number="controlsSettings.fallbackPlaneConstant" step="10" />
        </div>
        
        <div class="settings-row full-width" v-if="controlsSettings.useFallbackPlane">
          <label>Normal (法线 XYZ)</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;">
            <input type="number" v-model.number="controlsSettings.fallbackPlaneNormal.x" step="0.1" placeholder="x" />
            <input type="number" v-model.number="controlsSettings.fallbackPlaneNormal.y" step="0.1" placeholder="y" />
            <input type="number" v-model.number="controlsSettings.fallbackPlaneNormal.z" step="0.1" placeholder="z" />
          </div>
        </div>
      </div>

      <div class="settings-title">Parameters (参数)</div>
      
      <div class="settings-group">
        <div class="settings-row full-width">
          <label>Damping Factor (阻尼系数)</label>
          <div class="range-wrap">
            <input type="range" v-model.number="controlsSettings.dampingFactor" min="0.01" max="1" step="0.01" />
            <span class="range-val">{{ controlsSettings.dampingFactor }}</span>
          </div>
        </div>

        <div class="settings-row full-width">
          <label>Rotation Speed (旋转速度)</label>
          <div class="range-wrap">
            <input type="range" v-model.number="controlsSettings.rotationSpeed" min="0.1" max="5" step="0.1" />
            <span class="range-val">{{ controlsSettings.rotationSpeed }}</span>
          </div>
        </div>

        <div class="settings-row full-width">
          <label>Zoom Speed (缩放速度)</label>
          <div class="range-wrap">
            <input type="range" v-model.number="controlsSettings.zoomSpeed" min="0.1" max="5" step="0.1" />
            <span class="range-val">{{ controlsSettings.zoomSpeed }}</span>
          </div>
        </div>

        <div class="settings-row full-width">
          <label>Min Altitude (最小俯仰角)</label>
          <div class="range-wrap">
            <input type="range" v-model.number="controlsSettings.minAltitude" min="-90" max="90" step="1" />
            <span class="range-val">{{ controlsSettings.minAltitude }}</span>
          </div>
        </div>

        <div class="settings-row full-width">
          <label>Max Altitude (最大俯仰角)</label>
          <div class="range-wrap">
            <input type="range" v-model.number="controlsSettings.maxAltitude" min="0" max="180" step="1" />
            <span class="range-val">{{ controlsSettings.maxAltitude }}</span>
          </div>
        </div>
      </div>
      
      <div class="settings-group">
        <div class="settings-row">
          <label>Min Dist (最近)</label>
          <input type="number" v-model.number="controlsSettings.minDistance" />
        </div>
        <div class="settings-row">
          <label>Max Dist (最远)</label>
          <input type="number" v-model.number="controlsSettings.maxDistance" />
        </div>
        <div class="settings-row">
          <label>Cam Radius (半径)</label>
          <input type="number" v-model.number="controlsSettings.cameraRadius" step="0.5" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue';
import { EnvironmentControls, TilesRenderer } from '3d-tiles-renderer/three';
import { CesiumIonAuthPlugin, GLTFExtensionsPlugin } from '3d-tiles-renderer/three/plugins';
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  Vector3,
  Quaternion,
  Sphere,
  DataTexture,
  EquirectangularReflectionMapping,
  MathUtils,
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const container = ref(null);
const canvas = ref(null);

const ionAssetId = ref('2275207');
const fallbackIonToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjN2QyMGI5ZS1lY2RmLTQ5OWEtYjkyMy0yY2IwNjVjZTAzNjYiLCJpZCI6NjEwNTMsImlhdCI6MTc2OTM5MzE1Nn0.SPhNmhycOP7_C5MWOA7nrvWLorf3q2Px3fXlktndal4';
const ionAccessToken = ref(fallbackIonToken);

// Settings state
const controlsSettings = reactive({
  enabled: true,
  enableDamping: false,
  dampingFactor: 0.15,
  minDistance: 10,
  maxDistance: 100000,
  cameraRadius: 5,
  minAltitude: 0, // degrees
  maxAltitude: 81, // degrees (approx 0.45 * PI)
  minZoom: 0,
  maxZoom: Infinity,
  rotationSpeed: 1,
  zoomSpeed: 1,
  adjustHeight: false,
  autoAdjustCameraRotation: true,
  scaleZoomOrientationAtEdges: false,
  useFallbackPlane: true,
  fallbackPlaneConstant: 0,
  fallbackPlaneNormal: { x: 0, y: 1, z: 0 },
});

let camera;
let controls;
let scene;
let renderer;
let tiles;
let animationId;
let resizeObserver;

const rotationBetweenDirections = (dir1, dir2) => {
  const rotation = new Quaternion();
  const axis = new Vector3().crossVectors(dir1, dir2);
  rotation.x = axis.x;
  rotation.y = axis.y;
  rotation.z = axis.z;
  rotation.w = 1 + dir1.clone().dot(dir2);
  rotation.normalize();
  return rotation;
};

const setupTiles = () => {
  tiles.fetchOptions.mode = 'cors';
  tiles.registerPlugin(
    new GLTFExtensionsPlugin({
      // Note the DRACO compression files need to be supplied via an explicit source.
      // We use unpkg here but in practice should be provided by the application.
      dracoLoader: new DRACOLoader().setDecoderPath(
        'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/',
      ),
    }),
  );

  scene.add(tiles.group);
};

const reinstantiateTiles = () => {
  if (!scene) return;

  if (tiles) {
    scene.remove(tiles.group);
    tiles.dispose();
    tiles = null;
  }

  localStorage.setItem('ionApiKey', ionAccessToken.value);

  tiles = new TilesRenderer();
  tiles.registerPlugin(
    new CesiumIonAuthPlugin({
      apiToken: ionAccessToken.value,
      assetId: ionAssetId.value,
    }),
  );

  tiles.addEventListener('load-root-tileset', () => {
    // Because Ion examples typically are positioned on the planet surface we can orient
    // it such that up is Y+ and center the model.
    const sphere = new Sphere();
    tiles.getBoundingSphere(sphere);

    const position = sphere.center.clone();
    let distanceToEllipsoidCenter = position.length();

    // If the tileset is global (large radius, centered at origin), pick a default location.
    if (distanceToEllipsoidCenter === 0 && sphere.radius > 1000000) {
      const earthRadius = 6378137;
      const lat = (30.6586 * Math.PI) / 180;
      const lon = (104.0648 * Math.PI) / 180;
      position.set(
        earthRadius * Math.cos(lat) * Math.cos(lon),
        earthRadius * Math.cos(lat) * Math.sin(lon),
        earthRadius * Math.sin(lat),
      );
      distanceToEllipsoidCenter = position.length();
    }

    const surfaceDirection = position.normalize();
    const up = new Vector3(0, 1, 0);
    const rotationToNorthPole = rotationBetweenDirections(surfaceDirection, up);

    tiles.group.quaternion.copy(rotationToNorthPole);
    tiles.group.position.y = -distanceToEllipsoidCenter;
  });

  setupTiles();
};

const onWindowResize = () => {
  if (!container.value || !renderer || !camera) return;

  const width = container.value.clientWidth || 1;
  const height = container.value.clientHeight || 1;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
};

const animate = () => {
  animationId = requestAnimationFrame(animate);

  if (!tiles) return;

  controls.update();
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  camera.updateMatrixWorld();
  tiles.update();

  renderer.render(scene, camera);
};

const syncControls = () => {
  if (!controls) return;

  controls.enabled = controlsSettings.enabled;
  controls.enableDamping = controlsSettings.enableDamping;
  controls.dampingFactor = controlsSettings.dampingFactor;
  controls.minDistance = controlsSettings.minDistance;
  controls.maxDistance = controlsSettings.maxDistance;
  controls.cameraRadius = controlsSettings.cameraRadius;
  controls.minAltitude = MathUtils.degToRad(controlsSettings.minAltitude);
  controls.maxAltitude = MathUtils.degToRad(controlsSettings.maxAltitude);
  controls.minZoom = controlsSettings.minZoom;
  controls.maxZoom = controlsSettings.maxZoom;
  controls.rotationSpeed = controlsSettings.rotationSpeed;
  controls.zoomSpeed = controlsSettings.zoomSpeed;
  controls.adjustHeight = controlsSettings.adjustHeight;
  controls.autoAdjustCameraRotation = controlsSettings.autoAdjustCameraRotation;
  controls.scaleZoomOrientationAtEdges = controlsSettings.scaleZoomOrientationAtEdges;
  controls.useFallbackPlane = controlsSettings.useFallbackPlane;
  
  // Sync fallback plane
  controls.fallbackPlane.normal.set(
    controlsSettings.fallbackPlaneNormal.x, 
    controlsSettings.fallbackPlaneNormal.y, 
    controlsSettings.fallbackPlaneNormal.z
  ).normalize();
  controls.fallbackPlane.constant = controlsSettings.fallbackPlaneConstant;
};

// Watch for changes in settings and update controls
watch(controlsSettings, () => {
  syncControls();
});

onMounted(() => {
  scene = new Scene();

  // Add an env map for MeshStandardMaterial so lighting and metalness are rendered.
  const env = new DataTexture(new Uint8Array(64 * 64 * 4).fill(255), 64, 64);
  env.mapping = EquirectangularReflectionMapping;
  env.needsUpdate = true;
  scene.environment = env;

  renderer = new WebGLRenderer({ canvas: canvas.value, antialias: true, logarithmicDepthBuffer: true });
  renderer.setClearColor(0x151c1f);

  camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000000000);
  camera.position.set(100, 100, -100);
  camera.lookAt(0, 0, 0);

  controls = new EnvironmentControls(scene, camera, renderer.domElement);
  // Initialize controls with default values from our settings object
  // (Or align settings object to controls defaults if we preferred, but here we enforce our defaults)
  syncControls();

  reinstantiateTiles();
  onWindowResize();

  resizeObserver = new ResizeObserver(onWindowResize);
  resizeObserver.observe(container.value);

  animate();
});

onBeforeUnmount(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  if (resizeObserver && container.value) {
    resizeObserver.unobserve(container.value);
  }

  if (tiles) {
    scene.remove(tiles.group);
    tiles.dispose();
    tiles = null;
  }

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
});
</script>

<style scoped>
.ion-test-view {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #151c1f;
}

.ion-test-view canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.ion-overlay {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 320px;
  background: rgba(15, 20, 22, 0.85);
  color: #f5f5f5;
  padding: 12px 14px;
  border-radius: 8px;
  display: grid;
  gap: 10px;
  font-size: 13px;
}

.ion-title {
  font-size: 14px;
  font-weight: 600;
}

.ion-row {
  display: grid;
  gap: 6px;
}

.ion-row label {
  color: #b6c0c6;
}

.ion-row input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #2d3a40;
  background: #0f1416;
  color: #f5f5f5;
}

.ion-actions {
  display: flex;
  justify-content: flex-end;
}

.ion-actions button {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #2d3a40;
  background: #1f2a30;
  color: #f5f5f5;
  cursor: pointer;
}

.ion-actions button:hover {
  background: #25323a;
}

.ion-hint {
  color: #9aa6ad;
  line-height: 1.4;
}

.settings-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 340px;
  max-height: calc(100% - 32px);
  overflow-y: auto;
  background: rgba(15, 20, 22, 0.9);
  color: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 13px;
  scrollbar-width: thin;
  scrollbar-color: #3d4a50 transparent;
}

.settings-panel::-webkit-scrollbar {
  width: 6px;
}
.settings-panel::-webkit-scrollbar-track {
  background: transparent;
}
.settings-panel::-webkit-scrollbar-thumb {
  background-color: #3d4a50;
  border-radius: 3px;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid #2d3a40;
}

.settings-group {
  display: grid;
  gap: 10px;
}

.settings-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
}

.settings-row.full-width {
  grid-template-columns: 1fr;
}

.settings-row label {
  color: #b6c0c6;
}

.settings-row input[type='text'],
.settings-row input[type='number'] {
  width: 80px;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid #2d3a40;
  background: #0f1416;
  color: #f5f5f5;
  text-align: right;
}

.settings-row input[type='range'] {
  width: 100%;
  accent-color: #0080ff;
}

.settings-row input[type='checkbox'] {
  transform: scale(1.2);
  accent-color: #0080ff;
  cursor: pointer;
}

.range-wrap {
  display: grid;
  grid-template-columns: 1fr 40px;
  gap: 8px;
  align-items: center;
}

.range-val {
  text-align: right;
  color: #9aa6ad;
  font-variant-numeric: tabular-nums;
}
</style>
