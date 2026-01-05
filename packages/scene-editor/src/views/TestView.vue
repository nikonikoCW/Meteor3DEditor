<template>
  <div class="test-view">
    <div ref="canvasContainer" class="canvas-container"></div>
    
    <div class="controls-panel">
      <h3>GIS Map Test</h3>
      <div class="control-group">
        <label>Longitude:</label>
        <input type="number" v-model.number="center.lon" step="0.0001">
      </div>
      <div class="control-group">
        <label>Latitude:</label>
        <input type="number" v-model.number="center.lat" step="0.0001">
      </div>
      <div class="control-group">
        <label>Size (m):</label>
        <input type="number" v-model.number="size" step="100">
      </div>
      <div class="control-group">
        <label>Clipping:</label>
        <input type="checkbox" v-model="clippingEnabled" @change="handleClippingChange">
      </div>
      <button @click="updateMap">Generate Map</button>
      <div class="info">
        <p>Red Cube = Scene Center (0,0,0)</p>
        <p>Map should be centered on the cube.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GeoCoordinateSystem } from '../core/GeoCoordinateSystem';
import { TileMapManager } from '../core/TileMapManager';
import { GisUtils } from '../core/GisUtils';

const canvasContainer = ref(null);
const center = ref({ lon: 116.39139867165989, lat: 39.90321926881745 }); // Beijing
const size = ref(500);
const clippingEnabled = ref(true);

let scene, camera, renderer, controls;
let tileMapManager;
let geoSystem; // Layer 1
let animationId;
let markerSphere;

const targetLocation = { 
  lon: 116.39206488446678, 
  lat: 39.899969381477916 
};

const initThree = () => {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);
  
  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.position.set(0, 500, 500);
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.localClippingEnabled = true; // IMPORTANT for map clipping
  canvasContainer.value.appendChild(renderer.domElement);
  
  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  
  // Helpers
  const axesHelper = new THREE.AxesHelper(100);
  scene.add(axesHelper);
  
  // const gridHelper = new THREE.GridHelper(1000, 20);
  // scene.add(gridHelper);
  
  // Center Marker (Red Cube)
  const geometry = new THREE.BoxGeometry(10, 10, 10);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.y = 5;
  scene.add(cube);

  // Calibration Marker (Green Sphere)
  const sphereGeo = new THREE.SphereGeometry(5, 32, 32);
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  markerSphere = new THREE.Mesh(sphereGeo, sphereMat);
  markerSphere.position.y = 5;
  scene.add(markerSphere);

  // Initialize Layer 1: GeoCoordinateSystem
  geoSystem = new GeoCoordinateSystem(center.value.lon, center.value.lat);

  // Initialize Layer 2: TileMapManager (depends on Layer 1)
  tileMapManager = new TileMapManager(scene, geoSystem);
  
  // Initial Map
  updateMap();
  
  animate();
};

const updateMap = () => {
  if (tileMapManager && geoSystem) {
    // Update GeoSystem Center (if changed)
    geoSystem.setCenter(center.value.lon, center.value.lat);

    // Update Map (only needs size and clipping now)
    tileMapManager.updateMap(size.value, clippingEnabled.value);
    
    // Update Marker Position using Layer 1
    const pos = geoSystem.project(targetLocation.lon, targetLocation.lat);
    markerSphere.position.set(pos.x, 5, pos.z);
    console.log('Marker Position:', pos);
  }
};

const handleClippingChange = () => {
  if (tileMapManager) {
    tileMapManager.setClipping(clippingEnabled.value);
  }
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  controls.update();
  if (tileMapManager) {
    tileMapManager.update(camera);
  }
  renderer.render(scene, camera);
};

const handleResize = () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
};

onMounted(() => {
  initThree();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  cancelAnimationFrame(animationId);
  if (tileMapManager) tileMapManager.dispose();
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.test-view {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.controls-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  color: white;
  width: 300px;
}

.control-group {
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-group label {
  margin-right: 10px;
}

.control-group input {
  width: 150px;
  padding: 5px;
  background: #444;
  border: 1px solid #666;
  color: white;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 10px;
  background: #0066cc;
  border: none;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #0077ee;
}

.info {
  margin-top: 20px;
  font-size: 12px;
  color: #aaa;
  border-top: 1px solid #555;
  padding-top: 10px;
}
</style>
