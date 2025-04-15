<template>
  <div ref="container" class="three-container" id="three-container"></div>
  <div class="layout-menu">
    <Menu></Menu>
  </div>
  <div class="preview button-m" @click="preview">预览</div>
  <div class="down button-m" @click="down">导出</div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { onMounted } from 'vue'
import { initScene } from "../../commonjs/initScene.js"
import { loadHRd } from "../../commonjs/loadHdr.js"
import Menu from "../Menu/menu.vue"
import { downloadGLTFWithAssets, downloadGLB } from "../../commonjs/downLoad.js"

const router = useRouter()


onMounted(() => {
  console.log('mounted in the composition api!')
  initScene('three-container')
  loadHRd('./assets/day2.hdr')
})

const preview = () => {
  router.push({
    name: 'preview'
  })
}

// 使用示例

// 使用示例

const down = () => {
  let sceneData = localStorage.getItem('scene')
  // downloadGLTFWithAssets('assets/dungeon_low_poly_game_level_challenge/scene.gltf');
  // downloadGLB('assets/dungeon_low_poly_game_level_challenge/scene.gltf', 'my-model.gltf');
  downloadGLB('assets/day.hdr', 'day.hdr');
}

</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100vh;
}

.layout-menu {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
}

.preview {
  position: absolute;
  right: 12px;
  top: 12px;
  cursor: pointer;
}

.down {
  position: absolute;
  right: 80px;
  top: 12px;
  cursor: pointer;
}

.button-m {
  /* 基本样式 */
  padding: 6px 12px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  color: white;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;

  /* 磨砂玻璃效果 */
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  /* Safari 兼容 */
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

  /* 边框增强质感 */
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Hover 特效 */
.button-m:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

/* 点击动画 */
.button-m:active {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* 可选：添加内部高光增强玻璃感 */
.button-m::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px 12px 0 0;
}
</style>