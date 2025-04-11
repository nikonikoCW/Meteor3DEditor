<template>
    <div ref="container" class="three-container" id="three-container"></div>
</template>

<script setup>
import { addPoint, addCone, addLand, addModels } from "/src/commonjs/basicGeometries.js"
import { onMounted } from 'vue'
import { initScene } from "../../commonjs/initScene.js"
import { loadHRd } from "../../commonjs/loadHdr.js"

onMounted(() => {
    console.log('mounted in the composition api!')
    initScene('three-container')
    loadHRd('./assets/day.hdr')

    if (!sceneData) return
    JSON.parse(sceneData).object.forEach(element => {
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