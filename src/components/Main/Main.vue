<template>
  <div ref="container" class="three-container" id="three-container"></div>
  <div class="layout-main">
    <div class="header">
    <Header />
    </div>
    <div class="layout-content">
      <div class="layout-left">
        <Source>
        </Source>
      </div>
      <div class="layout-right">
        <Menu></Menu>
        <LayerManager />
        <!-- <Weather /> -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { onMounted } from 'vue'
import Meteor3D from "../../commonjs/index.js"
import { loadHRd } from "../../commonjs/loadHdr.js"
import Source from "../Source/source.vue"
import Menu from "../Menu/menu.vue"
import LayerManager from "../LayerManager/layerManager.vue"
import Weather from '../Weather/weather.vue';
// import { downloadGLTFWithAssets, downloadGLB ,downloadAll} from "../../commonjs/downLoad.js"
import Header from '../Header/header.vue';
// import { dbClick } from "../../commonjs/event.js"
import { flyto, focusOnObject } from "../../commonjs/camera.js"

const router = useRouter()


onMounted(() => {
  console.log('mounted in the composition api!')
  
  const meteor3D = new Meteor3D()
  meteor3D.initScene('three-container')
  loadHRd('./assets/day2.hdr')

  document.getElementById('three-container').addEventListener('dblclick', (event) => {

  })
})

const preview = () => {
  router.push({
    name: 'preview'
  })
}

// 使用示例

// 使用示例





</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}



.layout-main {
  width: 100%;
  height: 100%;

  .header {

    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
    height: 48px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .layout-content {
    width: 100%;
    height: calc(100% - 48px);
    display: flex;
    justify-content: space-between;



    .layout-left {
      height: 100%;
    }

    .layout-right {

      background: rgba(255, 255, 255, 0.2);
      /* 背景颜色 */
      backdrop-filter: blur(10px);
      /* 毛玻璃效果 */
      width: calc(240px + 36px);
      display: flex;
    }
  }
}


</style>