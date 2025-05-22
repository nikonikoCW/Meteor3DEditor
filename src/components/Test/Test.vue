<template>
  <div class="scene-wrapper" ref="mains" id="mainContent">
  </div>
</template>

<script setup>
import * as THREE from 'three';
import { ref, onMounted } from 'vue';
import SceneManager from "../../commonjs/Meteor3d.js"

const mains = ref(null);
let sceneManager = null

onMounted(() => {
  let container = mains.value
  sceneManager = new SceneManager({
    container
  });
  if (sceneManager) {
    // 添加一个立方体
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    sceneManager.getScene().add(cube);
    // sceneManager.animate()
    sceneManager.addAnimationCallback(() => {
      cube.rotation.x += 0.01;
    });
    sceneManager.addAnimationCallback(() => {
      cube.rotation.y += 0.01;
    });
    // // 动画：旋转立方体
  }
});
</script>

<style scoped>
/* 样式部分与之前相同，保持不变 */
.scene-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
}

</style>