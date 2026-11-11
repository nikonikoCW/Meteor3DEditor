<template>
  <section class="preview-panel">
    <div class="preview-toolbar">
      <div class="preview-tabs" role="tablist" aria-label="模型对比">
        <button type="button" role="tab" :aria-selected="active === 'original'" :class="{ active: active === 'original' }" @click="select('original')">原始模型</button>
        <button type="button" role="tab" :aria-selected="active === 'result'" :class="{ active: active === 'result' }" :disabled="!resultUrl" @click="select('result')">减面结果</button>
      </div>
      <div class="viewer-actions">
        <label><input v-model="wireframe" type="checkbox" />线框</label>
        <button type="button" :disabled="!model" @click="frame">重置视角</button>
        <button type="button" :disabled="!viewer && !loading" @click="close">关闭预览</button>
      </div>
    </div>
    <div ref="container" class="preview-viewport">
      <span class="viewport-tag">{{ active === 'original' ? 'ORIGINAL' : 'SIMPLIFIED' }}</span>
      <div v-if="!model" class="preview-empty">
        <svg class="preview-symbol" viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M50 6 94 50 50 94 6 50Z"/><path d="m50 25 25 25-25 25-25-25Z"/></svg>
        <h3>{{ loading ? '正在加载模型…' : '按需开启模型预览' }}</h3>
        <p>{{ loading ? '大模型可能需要等待，您也可以关闭预览。' : '检查轮廓、贴图和动画，再决定减面强度。' }}</p>
        <button type="button" class="open-preview" :disabled="loading || !currentUrl" @click="open">{{ loading ? '加载中…' : active === 'original' ? '预览原始模型' : '预览减面结果' }}<span>↗</span></button>
        <small>仅在点击预览时加载 3D，可直接设置参数并减面</small>
      </div>
      <div v-if="error" class="preview-error" role="alert">{{ error }}</div>
      <div v-if="animations.length" class="animation-controls">
        <select v-model.number="animationIndex" aria-label="选择动画"><option v-for="(clip, index) in animations" :key="index" :value="index">{{ clip.name || `动画 ${index + 1}` }}</option></select>
        <button type="button" @click="toggleAnimation">{{ playing ? '暂停' : '播放动画' }}</button>
      </div>
      <span class="viewport-hint">左键旋转 · 滚轮缩放 · 右键平移</span>
    </div>
    <slot />
  </section>
</template>

<script setup>
import { computed, shallowRef, ref, watch, onBeforeUnmount, nextTick } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createModelLoader } from '@meteor3d/core';

const props = defineProps({ originalUrl: String, resultUrl: String, visible: Boolean });
const container = ref(null);
const active = ref('original');
const wireframe = ref(false);
const loading = ref(false);
const error = ref('');
const model = shallowRef(null);
const viewer = shallowRef(null);
const animations = shallowRef([]);
const animationIndex = ref(0);
const playing = ref(false);
const currentUrl = computed(() => active.value === 'original' ? props.originalUrl : props.resultUrl);
let generation = 0;

function releaseModel(root) {
  const resources = new Set();
  root?.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    if (node.skeleton) resources.add(node.skeleton);
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
      resources.add(material);
      Object.values(material).forEach(value => { if (value?.isTexture) resources.add(value); });
    }
  });
  for (const resource of resources) { resource.source?.data?.close?.(); resource.dispose(); }
}

function close() {
  generation++;
  const current = viewer.value;
  viewer.value = null;
  loading.value = false;
  model.value = null;
  animations.value = [];
  playing.value = false;
  if (!current) return;
  current.renderer.setAnimationLoop(null);
  current.observer.disconnect();
  current.controls.dispose();
  current.loader.dispose();
  current.mixer?.stopAllAction();
  if (current.model) current.mixer?.uncacheRoot(current.model);
  releaseModel(current.model);
  current.environment.dispose();
  current.renderer.dispose();
  current.renderer.forceContextLoss();
  current.renderer.domElement.remove();
}

function select(which) { close(); error.value = ''; active.value = which; }

function frame() {
  const current = viewer.value;
  if (!current?.model) return;
  const box = new THREE.Box3().setFromObject(current.model);
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.001);
  const fov = Math.min(THREE.MathUtils.degToRad(40), 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(40) / 2) * current.camera.aspect));
  const distance = radius / Math.sin(fov / 2) * 1.15;
  current.controls.target.copy(center);
  current.camera.position.copy(center).add(new THREE.Vector3(1, 0.65, 1.3).normalize().multiplyScalar(distance));
  current.camera.near = Math.max(radius / 1000, 0.000001);
  current.camera.far = distance + radius * 100;
  current.camera.updateProjectionMatrix();
  current.controls.update();
}

function applyWireframe() {
  model.value?.traverse(node => {
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) material.wireframe = wireframe.value;
  });
}

async function open() {
  if (loading.value || !currentUrl.value) return;
  close(); error.value = ''; loading.value = true;
  const requestGeneration = generation;
  try {
    await nextTick();
    if (requestGeneration !== generation || !container.value) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.value.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room);
    pmrem.dispose(); room.dispose(); scene.environment = environment.texture;
    scene.add(new THREE.HemisphereLight(0xd9f2ff, 0x556375, 1));
    const light = new THREE.DirectionalLight(0xfff2df, 2);
    light.position.set(4, 6, 5); scene.add(light);
    const loader = createModelLoader(renderer);
    const resize = () => {
      const { width, height } = container.value.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1));
      camera.aspect = Math.max(width, 1) / Math.max(height, 1); camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(container.value); resize();
    const current = { renderer, scene, camera, controls, environment, loader, observer, model: null, mixer: null };
    viewer.value = current;
    await loader.ready;
    const gltf = await loader.gltfLoader.loadAsync(currentUrl.value);
    if (requestGeneration !== generation) { releaseModel(gltf.scene); return; }
    current.model = model.value = gltf.scene;
    scene.add(gltf.scene);
    animations.value = gltf.animations;
    animationIndex.value = 0;
    current.mixer = new THREE.AnimationMixer(gltf.scene);
    applyWireframe(); frame();
    let last = performance.now();
    renderer.setAnimationLoop(time => {
      const delta = Math.max(0, Math.min((time - last) / 1000, 0.1)); last = time;
      if (playing.value) current.mixer.update(delta);
      controls.update(); renderer.render(scene, camera);
    });
  } catch (failure) {
    if (requestGeneration === generation) { close(); error.value = `预览失败：${failure.message}`; }
  } finally { if (requestGeneration === generation) loading.value = false; }
}

function playSelection() {
  const mixer = viewer.value?.mixer;
  mixer?.stopAllAction();
  if (playing.value && animations.value[animationIndex.value]) mixer.clipAction(animations.value[animationIndex.value]).play();
}
function toggleAnimation() { playing.value = !playing.value; playSelection(); }
watch(wireframe, applyWireframe);
watch(animationIndex, playSelection);
watch(() => props.visible, visible => { if (!visible) close(); });
watch(() => props.originalUrl, () => select('original'));
watch(() => props.resultUrl, url => { if (url) select('result'); else if (active.value === 'result') select('original'); });
onBeforeUnmount(close);
</script>

<style scoped>
.preview-panel{min-width:0;min-height:0;display:flex;flex-direction:column;background:#161e22;border:1px solid #2b363b;border-radius:10px;overflow:hidden}
.preview-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #2b363b;flex-wrap:wrap}
.preview-tabs{display:flex;gap:3px;padding:3px;background:#101719;border-radius:6px}
button,select{font:inherit;cursor:pointer}button:disabled{opacity:.4;cursor:not-allowed}
.preview-tabs button{padding:8px 12px;border:0;border-radius:4px;background:none;color:#8d9fa8;font-size:11px}.preview-tabs button.active{background:#303e44;color:#f3f6f7}
.viewer-actions{display:flex;align-items:center;gap:10px;color:#9badb6;font-size:10px}.viewer-actions label{display:flex;align-items:center;gap:4px;white-space:nowrap}.viewer-actions input{accent-color:#b8f275}.viewer-actions button,.animation-controls button{background:none;color:inherit;border:1px solid #3a474d;border-radius:4px;padding:6px;font-size:10px}
.preview-viewport{position:relative;flex:1;min-height:240px;background:radial-gradient(ellipse at 50% 42%,#293940 0%,#172226 75%);overflow:hidden}.preview-viewport :deep(canvas){position:absolute;inset:0;display:block;width:100%;height:100%;touch-action:none}
.preview-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center}.preview-symbol{width:88px;height:88px;stroke:#526e79;stroke-width:4;margin-bottom:8px}.preview-empty h3{font-size:17px;font-weight:500;color:#b4c6ce;margin:12px 0}.preview-empty p{font-size:12px;color:#7e959f;line-height:1.8;margin:0 0 20px}.preview-empty small{font-size:10px;color:#6f8793;margin-top:14px;line-height:1.8}
.open-preview{border:1px solid #597445;border-radius:6px;background:#243322;color:#b8f275;padding:11px 18px;font-size:12px}.open-preview span{margin-left:18px}.open-preview:hover:enabled{background:#30452a}
.viewport-tag{position:absolute;left:18px;top:18px;z-index:1;border:1px solid #49616b;padding:6px 8px;color:#a9c3cb;font-size:9px;letter-spacing:2px;pointer-events:none}.viewport-hint{position:absolute;bottom:15px;left:0;right:0;text-align:center;color:#6f8793;font-size:10px;pointer-events:none}
.preview-error{position:absolute;left:18px;right:18px;top:56px;background:#402b29;color:#ffb1a8;padding:12px;font-size:12px;border-radius:5px;overflow-wrap:anywhere}.animation-controls{position:absolute;right:16px;bottom:42px;display:flex;gap:8px;color:#c1d0d6}.animation-controls select{max-width:180px;background:#1c282e;border:1px solid #3b494f;border-radius:4px;color:inherit;font-size:11px;padding:6px}
</style>
