
<template>
  <div ref="container" class="three-container" id="three-container"></div>
  <div class="layout-menu"><Menu></Menu></div>
</template>

<script setup>
import {onMounted } from 'vue'
import {initScene} from "../../commonjs/initScene.js"
import {loadHRd} from "../../commonjs/loadHdr.js"
import Menu from "../Menu/menu.vue"



onMounted(() => {
  console.log('mounted in the composition api!')
  initScene('three-container')
  loadHRd('./assets/day.hdr')
})

</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100vh;
}
.layout-menu{
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
}
</style>