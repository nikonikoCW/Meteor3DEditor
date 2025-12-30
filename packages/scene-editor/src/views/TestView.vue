<template>
  <div class="test-view">
    <div class="header">
      <h1>🌐 3D Tiles 测试</h1>
      <div class="controls">
        <input type="text" v-model="tilesetUrl" placeholder="tileset.json URL" class="url-input" />
        <button @click="loadTileset">加载</button>
      </div>
    </div>
    <div ref="container" class="container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TilesRenderer } from '3d-tiles-renderer'

const container = ref(null)
const tilesetUrl = ref('https://file.threehub.cn/3dtiles/test/tileset.json')

let scene, camera, renderer, controls, tilesRenderer, animationId

const init = () => {
  const box = container.value
  
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75, box.clientWidth / box.clientHeight, 0.1, 1000)
  camera.position.set(0, 30, 30)
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true })
  renderer.setSize(box.clientWidth, box.clientHeight)
  box.appendChild(renderer.domElement)
  
  controls = new OrbitControls(camera, renderer.domElement)
  scene.add(new THREE.AxesHelper(1000))
  
  animate()
}

const loadTileset = () => {
  // 移除旧的
  if (tilesRenderer) {
    scene.remove(tilesRenderer.group.parent)
    tilesRenderer.dispose()
  }
  
  tilesRenderer = new TilesRenderer(tilesetUrl.value)
  tilesRenderer.setCamera(camera)
  tilesRenderer.setResolutionFromRenderer(camera, renderer)
  
  const model = new THREE.Group().add(tilesRenderer.group)
  scene.add(model)
  
  const box3 = new THREE.Box3()
  tilesRenderer.addEventListener('load-tile-set', () => {
    if (tilesRenderer.getBoundingBox(box3)) {
      box3.getCenter(tilesRenderer.group.position)
      tilesRenderer.group.position.multiplyScalar(-1)
    }
  })
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  if (tilesRenderer) tilesRenderer.update()
  renderer.render(scene, camera)
}

onMounted(() => init())
onUnmounted(() => {
  cancelAnimationFrame(animationId)
  tilesRenderer?.dispose()
  renderer?.dispose()
})
</script>

<style scoped>
.test-view { display: flex; flex-direction: column; height: 100vh; background: #1a1a1a; color: white; }
.header { padding: 16px; background: #222; display: flex; align-items: center; gap: 20px; }
.header h1 { margin: 0; font-size: 18px; }
.controls { display: flex; gap: 10px; flex: 1; }
.url-input { flex: 1; padding: 8px; background: #333; border: 1px solid #444; border-radius: 4px; color: white; }
button { padding: 8px 16px; background: #0066cc; border: none; border-radius: 4px; color: white; cursor: pointer; }
button:hover { background: #0077dd; }
.container { flex: 1; }
</style>
