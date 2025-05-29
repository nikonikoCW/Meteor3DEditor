<template>
  <div ref="threeCavans" class="three-container" id="three-container"></div>
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
        <Menu @changeMenu="changeMenu"></Menu>
        <LayerManager v-if="menuName==='图层管理'"/>
        <Weather v-if="menuName==='天气'"/>
        <Attribute v-if="menuName==='属性'"/>
      </div>
      
      <div class="transform-position">
          <TransformControls />
        </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted ,ref} from 'vue'
import Meteor3D from "../../commonjs/index.js"
import Source from "../Source/source.vue"
import Menu from "../Menu/menu.vue"
import TransformControls from "../TransformControls/TransformControls.vue"
import LayerManager from "../LayerManager/layerManager.vue"
import Weather from '../Weather/weather.vue';
import Attribute from '../Attribute/attribute.vue';
import Header from '../Header/header.vue';


const menuName = ref('图层管理')
const threeCavans = ref(null)
const changeMenu = (node) => {
  
  menuName.value = node.name
  console.log(menuName.value);
}
onMounted(() => {
  console.log('mounted in the composition api!')

  const meteor3D = new Meteor3D({
    container:threeCavans.value
  })
  window.meteor3D = meteor3D
  meteor3D.loadHrd()
  document.getElementById('three-container').addEventListener('dblclick', (event) => {

  })
})


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

.transform-position {
  position: fixed;
  right: 300px;
  top:60px;
}
</style>