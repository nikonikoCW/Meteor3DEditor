<template>
    <div class="panel">
        <div class="tabs">
            <div class="tab active">属性</div>
        </div>

        <div class="label">类型</div>
        <input type="text" value="Mesh" disabled>

        <div class="label">名称</div>
        <input type="text" value="BoxGeometry" v-model="models.name" @change="updateObejct('name')">

        <div class="label">位置</div>
        <div class="row">
            <input type="text" v-model="models.position_x" placeholder="X" @change="updateObejct('position')">
            <input type="text" v-model="models.position_y" placeholder="Y" @change="updateObejct('position')">
            <input type="text" v-model="models.position_z" placeholder="Z" @change="updateObejct('position')">
        </div>

        <div class="label">旋转</div>
        <div class="row">
            <input type="text" value="0.000">
            <input type="text" value="0.000">
            <input type="text" value="0.000">
        </div>

        <div class="label">缩放</div>
        <div class="row">
            <input type="text" value="1.000">
            <input type="text" value="1.000">
            <input type="text" value="1.000">
        </div>

        <div class="toggle"><el-switch v-model="models.visible" size="small"  @change="updateObejct('visible')" class="mr-12"/> 可见性
        </div>
        <div class="toggle"><el-switch v-model="models.visible" size="small"  @change="updateObejct('visible')" class="mr-12"/> 投射阴影</div>
        <div class="toggle"><el-switch v-model="models.visible" size="small"  @change="updateObejct('visible')" class="mr-12"/> 接收阴影</div>
        <div class="toggle"><el-switch v-model="models.visible" size="small"  @change="updateObejct('visible')" class="mr-12"/> 视锥体裁剪</div>
    </div>
</template>

<script setup>
import { reactive, onMounted, computed, ref, watch } from 'vue'
import { sceneConfigStore } from "/src/store/layer.js"
import { storeToRefs } from 'pinia';
const store = sceneConfigStore()

const { UpdateVersion } = storeToRefs(store);
const models = reactive({
    name: '',
    visible: false,
    position_x:0,
    position_y:0,
    position_z:0,
})



const updateUI = () => {
    if(meteor3D.selectedModel===null) return
    models.name = meteor3D.selectedModel.name;
    models.visible = meteor3D.selectedModel.visible;

    
    models.position_x = meteor3D.selectedModel.position.x;
    models.position_y = meteor3D.selectedModel.position.y;
    models.position_z = meteor3D.selectedModel.position.z;
}
const updateObejct = (call) => {
    const updateValue = {
        name: () => {
            meteor3D.selectedModel.name = models.name
        },
        visible: () => {
            meteor3D.selectedModel.visible = models.visible
        },
        position: () => {
            meteor3D.selectedModel.position.set(models.position_x,models.position_y,models.position_z)
        }
    }
    updateValue[call]()
}


watch(UpdateVersion, (newVal, oldVal) => {
    console.log('someState changed:', newVal);
    updateUI()
}, { immediate: true });

</script>

<style scoped>
.mr-12{
    margin-right: 12px;
}
.panel {
    width: 300px;
    background-color: rgba(0, 0, 0, 0);
    padding: 15px;
    border-radius: 5px;

    font-family: sans-serif;
    color: #fff;
}

.tabs {
    display: flex;
    background-color: rgba(0, 0, 0, 0.2);
    margin-bottom: 15px;
}

.tab {
    flex: 1;
    padding: 10px;
    text-align: center;
    color: #fff;
    background-color: rgba(0, 0, 0, 0.2);
    border-bottom: 2px solid transparent;
}

.tab.active {
    background-color: rgba(0, 0, 0, 0.1);
}

.label {
    margin: 10px 0 5px;
    font-size: 14px;
}

input[type="text"] {
    width: calc(100% - 12px);
    padding: 5px;
    margin-bottom: 10px;
    background: #444;
    border: none;
    color: white;
}

.row {
    display: flex;
    gap: 5px;
}

.row input {
    flex: 1;
}

.toggle {
    display: flex;
    align-items: center;
    margin: 10px 0;
    font-size: 14px;
}

.toggle input {
    margin-right: 8px;
}
</style>