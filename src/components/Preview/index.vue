<!--
 * @Author: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @Date: 2025-04-11 11:16:38
 * @LastEditors: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @LastEditTime: 2025-05-09 15:48:38
 * @FilePath: \nico\src\components\Preview\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
    <div ref="container" class="three-container" id="three-container"></div>
</template>

<script setup>
import { addPoint, addCone, addLand, addModels } from "/src/commonjs/basicGeometries.js"
import { onMounted } from 'vue'
import Meteor3D from "../../commonjs/index.js"
import { loadHRd } from "../../commonjs/loadHdr.js"

onMounted(() => {
    console.log('mounted in the composition api!')
    
  const meteor3D = new Meteor3D()
  meteor3D.initScene('three-container')
    loadHRd('./assets/day.hdr')

    if (!sceneData) return
    JSON.parse(sceneData).scene.object.forEach(element => {
        console.log(element);
        switch (element.type) {
            case 'cone':
                addCone(element.initPosition)
                break;
            case 'ball':
                addPoint(element.initPosition)
                break;
            case 'land':
                addLand(element.initPosition)
                break;
            case 'model':
                addModels(element.path,element.initPosition)
                break;
        }

    });
})

let sceneData = localStorage.getItem('scene')



</script>

<style scoped>
.three-container {
    width: 100%;
    height: 100vh;
}
</style>