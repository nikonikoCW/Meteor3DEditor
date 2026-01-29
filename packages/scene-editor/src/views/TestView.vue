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
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
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
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const container = ref(null);
const canvas = ref(null);

const ionAssetId = ref('2275207');
const fallbackIonToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjN2QyMGI5ZS1lY2RmLTQ5OWEtYjkyMy0yY2IwNjVjZTAzNjYiLCJpZCI6NjEwNTMsImlhdCI6MTc2OTM5MzE1Nn0.SPhNmhycOP7_C5MWOA7nrvWLorf3q2Px3fXlktndal4';
const ionAccessToken = ref(fallbackIonToken);

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

onMounted(() => {
  scene = new Scene();

  // Add an env map for MeshStandardMaterial so lighting and metalness are rendered.
  const env = new DataTexture(new Uint8Array(64 * 64 * 4).fill(255), 64, 64);
  env.mapping = EquirectangularReflectionMapping;
  env.needsUpdate = true;
  scene.environment = env;

  renderer = new WebGLRenderer({ canvas: canvas.value, antialias: true });
  renderer.setClearColor(0x151c1f);

  camera = new PerspectiveCamera(60, 1, 1, 1000000000);
  camera.position.set(100, 100, -100);
  camera.lookAt(0, 0, 0);

  controls = new EnvironmentControls(scene, camera, renderer.domElement);
  controls.adjustHeight = false;
  controls.minDistance = 1;
  controls.maxAltitude = Math.PI;

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
</style>
