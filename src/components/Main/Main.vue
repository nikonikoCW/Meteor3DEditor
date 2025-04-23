<template>
  <div ref="container" class="three-container" id="three-container"></div>
  <div class="layout-main">
    <div class="header">
      <div class="btn button-m" @click="preview">预览</div>
      <div class="btn button-m" @click="down">导出</div>
    </div>
    <div class="layout-content">
      <div class="layout-left">
        <Source>
        </Source>
      </div>
      <div class="layout-right">
        <Menu></Menu>
        <LayerManager />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { onMounted } from 'vue'
import { initScene } from "../../commonjs/initScene.js"
import { loadHRd } from "../../commonjs/loadHdr.js"
import Source from "../Source/source.vue"
import Menu from "../Menu/menu.vue"
import LayerManager from "../LayerManager/layerManager.vue"
// import { downloadGLTFWithAssets, downloadGLB ,downloadAll} from "../../commonjs/downLoad.js"
import GLTFDownloader from "../../commonjs/downLoad.js"
import { dbClick } from "../../commonjs/event.js"
import { flyto, focusOnObject } from "../../commonjs/camera.js"

const router = useRouter()


onMounted(() => {
  console.log('mounted in the composition api!')
  initScene('three-container')
  loadHRd('./assets/day2.hdr')

  document.getElementById('three-container').addEventListener('dblclick', (event) => {
    // let a = dbClick(event)
    // flyto(a[0].object)
    // focusOnObject(a[0].object)
  })
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
  console.log(JSON.parse(sceneData).scene.object);
  const downloader = new GLTFDownloader();
  downloader.downloadAll();
  // downloadGLTFWithAssets('assets/model/scene.gltf');
  // downloadGLB('assets/jifang.glb', 'jifang.gl');
  // downloadGLB('assets/day.hdr', 'day.hdr');
}



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
    flex-direction: row-reverse;
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


.btn {
  cursor: pointer;
  margin: 0 5px;
}

.button-m {
  /* 基本样式 */
  padding: 6px 12px;
  border: none;
  border-radius: 12px;
  font-size: 12px;
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