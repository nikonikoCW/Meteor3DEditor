<template>
    <div class="menu scroll-box">
        <div class="tag">矢量几何</div>
        <ul class="thumbnail-list">
            <!-- 示例缩略图1 -->
            <li class="thumbnail-item" v-for="i in vectorList" :key="i.index" :name="i.name">
                <img :src="i.img" :alt="i.name" draggable="true" class="thumbnail draggable">
                <span class="thumbnail-caption">{{ i.name }}</span>
            </li>
        </ul>
        <div class="tag">标签特效</div>
        <ul class="thumbnail-list">
            <!-- 示例缩略图1 -->
            <li class="thumbnail-item" v-for="i in labelList" :key="i.index" :name="i.name">
                <img :src="i.img" :alt="i.name" draggable="true" class="thumbnail draggable">
                <span class="thumbnail-caption">{{ i.name }}</span>
            </li>
        </ul>
        <div class="tag">模型</div>
        <ul class="thumbnail-list">
            <!-- 示例缩略图1 -->
            <li class="thumbnail-item" v-for="i in modelList" :key="i.index" :name="i.name">
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
import addLbael from "/src/commonjs/label.js"
import { sceneConfigStore } from "/src/store/layer.js"
const store = sceneConfigStore()


let raycaster, mouse;
let draggedValue = null;

let vectorList = ref([
    { name: '圆锥', img: 'https://picsum.photos/80/80?random=1' },
    { name: '球体', img: 'https://picsum.photos/80/80?random=2' },
    { name: '平板', img: 'https://picsum.photos/80/80?random=6' },
])
let labelList = ref([
    { name: '弹窗', img: 'https://picsum.photos/80/80?random=1' },
    { name: '特效点', img: 'https://picsum.photos/80/80?random=1' },
    { name: '光圈', img: 'https://picsum.photos/80/80?random=9' },
    { name: '魔法阵', img: 'https://picsum.photos/80/80?random=19' },
    { name: '火焰', img: 'https://picsum.photos/80/80?random=20' },
])
let modelList = ref([
    { name: '车', img: 'https://picsum.photos/80/80?random=3' },
    { name: '机房', img: 'https://picsum.photos/80/80?random=4' },
    { name: '人物', img: 'https://picsum.photos/80/80?random=5' },
])
// let sceneData = ref({
//     scene: {
//         object: [
//         ],
//         environment: {
//             hdr: "environments/sky.hdr",
//             intensity: 1
//         }
//     }
// })

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
window.addEventListener('drop', async (event) => {

    // 将鼠标坐标转换到 NDC（归一化设备坐标）
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 使用射线投射器
    raycaster.params.Line.threshold = 0.1//调整精度
    raycaster.setFromCamera(mouse, camera);

    //去除TransformControl
    let rayList = scene.children.filter(item => item.isTransformControlsRoot != true)
    // 计算射线与场景中的物体的交点
    const intersects = raycaster.intersectObjects(rayList);
    // 如果有交点
    let leftPosition
    if (intersects.length > 0) {
        console.log('落点:', intersects); // 输出交点坐标
        leftPosition = intersects[0].point

    } else {
        leftPosition = new THREE.Vector3(0, 0, 0)
    }
    let putData, uuid
    switch (draggedValue) {
        case '圆锥':

            uuid = addCone(leftPosition)
            putData = {
                type: 'cone',
                name: '圆锥',
            }
            break;
        case '球体':
            uuid = addPoint(leftPosition)
            putData = {
                type: 'ball',
                name: '球体',
            }
            break;
        case '平板':
            uuid = addLand(leftPosition)
            putData = {
                type: 'land',
                name: '平板',
            }
            break;
        case '光圈':
            uuid = meteor3D.addAperture(leftPosition)
            putData = {
                type: 'land',
                name: '光圈',
            }
            break;
        case '魔法阵':
            uuid = meteor3D.addMagicFormation(leftPosition)
            putData = {
                type: 'land',
                name: '魔法阵',
            }
            break;
        case '火焰':
            uuid = meteor3D.addFire(leftPosition)
            putData = {
                type: 'land',
                name: '火焰',
            }
            break;
        case '车':
            uuid = await addModels('assets/model/scene.gltf', leftPosition,0.01)

            putData = {
                type: 'model',
                modeType: "gltf",
                name: '车',
                path: 'assets/model/scene.gltf'
            }
            break;
        case '人物':
            uuid = await addModels('assets/Jackie.glb', leftPosition)
            putData = {
                type: 'model',
                name: '人物',
                modeType: "glb",
                path: 'assets/Jackie.glb'
            }
            break;
        case '机房':
            uuid = await addModels('assets/my-model.glb', leftPosition)
            putData = {
                type: 'model',
                name: '机房',
                modeType: "glb",
                path: 'assets/my-model.glb'
            }
            break;
        case '弹窗':
            let a = new addLbael({
                position:leftPosition,
                name:'警告图标'
            })
            a.createSprite()
            putData = {
                type: 'label',
                name: '弹窗',
            }
            break;
    }
    putData.initPosition = leftPosition
    putData.uuid = uuid
    // sceneData.value.scene.object.push(putData)
    // store.setObject(sceneData.value.scene)
    
    store.updateScene() //更新场景内图层版本号，告知图层面板更新

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

.tag {
    margin: 8px 0 0 8px;
    display: inline-block;
    position: relative;
    padding: 4px 8px;
    background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
    color: #00ffcc;
    text-transform: uppercase;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 2px;
    border-radius: 8px;
    box-shadow: 0 0 15px rgba(0, 255, 204, 0.5),
        0 0 30px rgba(0, 255, 204, 0.3);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    overflow: hidden;
}

.tag:hover {
    box-shadow: 0 0 25px rgba(0, 255, 204, 0.7),
        0 0 50px rgba(0, 255, 204, 0.4);
}

.tag::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent);
    transition: 0.5s;
}

.tag:hover::before {
    left: 100%;
}
</style>