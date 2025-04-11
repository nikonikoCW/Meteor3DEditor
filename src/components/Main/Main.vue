
<template>
  <div ref="container" class="three-container" id="three-container"></div>
  <div class="layout-menu"><Menu></Menu></div>
  <div class="preview" @click="preview">预览</div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import {onMounted } from 'vue'
import {initScene} from "../../commonjs/initScene.js"
import {loadHRd} from "../../commonjs/loadHdr.js"
import Menu from "../Menu/menu.vue"

const router = useRouter()


onMounted(() => {
  console.log('mounted in the composition api!')
  initScene('three-container')
  loadHRd('./assets/day.hdr')
})

const preview = () => {
  router.push({
    name: 'preview'
  })
}

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
.preview{
  position: absolute;
  right: 12px;
  top: 12px;
  padding: 3px 8px;
  border: 1px solid red;
  cursor: pointer;
}
</style>