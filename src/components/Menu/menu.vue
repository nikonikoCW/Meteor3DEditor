<template>
    <div class="menu">
        <ul class="thumbnail-list">
            <!-- 示例缩略图1 -->
            <li class="thumbnail-item" v-for="i in dataList" :key="i.index" :name="i.name">
                <img :src="i.img" :alt="i.name" draggable="true" class="thumbnail draggable">
                <span class="thumbnail-caption">{{ i.name }}</span>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import * as THREE from 'three';
import { addPoint, addCone, addLand, addModels } from "/src/commonjs/basicGeometries.js"
import { sceneConfigStore } from "/src/store/layer.js"
const store = sceneConfigStore()


let raycaster, mouse;
let draggedValue = null;

let dataList = ref([
    { name: '圆锥', img: 'http://116.196.110.130:5353/wz.png' },
    { name: '球体', img: 'http://116.196.110.130:5353/wz.png' },
    { name: '游戏建筑', img: 'http://116.196.110.130:5353/wz.png' },
    { name: '机房', img: 'http://116.196.110.130:5353/wz.png' },
    { name: '人物', img: 'http://116.196.110.130:5353/wz.png' },
    { name: '平板', img: 'http://116.196.110.130:5353/wz.png' },
])
let sceneData = ref({
    scene: {
        object: [
        ],
        environment: {
            hdr: "environments/sky.hdr",
            intensity: 1
        }
    }
})

// 光线投射器
raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();
onMounted(() => {
    document.querySelectorAll('.draggable').forEach(item => {
        item.addEventListener('dragstart', (event) => {
            draggedValue = event.target.alt;
            event.dataTransfer.effectAllowed = 'move';
        });
    });
})


// const canvas = document.getElementById('three-container');
window.addEventListener('dragover', (event) => {
    event.preventDefault();
});
window.addEventListener('drop', (event) => {

    // 将鼠标坐标转换到 NDC（归一化设备坐标）
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 使用射线投射器
    raycaster.params.Line.threshold = 0.1//调整精度
    raycaster.setFromCamera(mouse, camera);

    // 计算射线与场景中的物体的交点
    const intersects = raycaster.intersectObjects(scene.children);

    // 如果有交点
    let leftPosition
    if (intersects.length > 0) {
        console.log('落点:', intersects); // 输出交点坐标
        leftPosition = intersects[0].point

    } else {
        leftPosition = new THREE.Vector3(0, 0, 0)
    }

    let putData,uuid
    switch (draggedValue) {
        case '圆锥':
            addCone(leftPosition)
            putData = {
                type:'cone',
                name:'圆锥',
            }
            break;
        case '球体':
            uuid = addPoint(leftPosition)
            putData = {
                type:'ball',
                name:'球体',
            }
            break;
        case '平板':
            addLand(leftPosition)
            putData = {
                type:'land',
                name:'平板',
            }
            break;
        case '游戏建筑':
            addModels('assets/model/scene.gltf', leftPosition)
         
            putData = {
                type:'model',
                name:'游戏建筑',
                path:'assets/model/scene.gltf'
            }
            break;
        case '人物':
            addModels('assets/Jackie.glb', leftPosition)
            putData = {
                type:'model',
                name:'人物',
                path:'assets/Jackie.glb'
            }
            break;
        case '机房':
            addModels('assets/my-model.glb', leftPosition)
            putData = {
                type:'model',
                name:'机房',
                path:'assets/my-model.glb'
            }
            break;
    }
    putData.initPosition = leftPosition
    putData.uuid = uuid
    sceneData.value.scene.object.push(putData)
    localStorage.setItem("scene",JSON.stringify(sceneData.value))
    store.setObject(sceneData.value.scene)
    // console.log(store.scene);
    
});


</script>

<style scoped>
.menu {
    width: 180px;
    height: 100%;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.thumbnail-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 10px;
    padding: 0;
    list-style: none;
}

.thumbnail-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.thumbnail {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border: 1px solid #ddd;
    border-radius: 4px;
    transition: transform 0.2s;
}

.thumbnail:hover {
    transform: scale(1.1);
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.thumbnail-caption {
    margin-top: 5px;
    font-size: 12px;
    text-align: center;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>