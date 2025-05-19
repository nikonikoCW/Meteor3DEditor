<template>
    <div class="header-left">
        <img src="/assets/images/meteor.png" alt="" class="logo">
        <span class="logo-name">Meteor3D</span>
    </div>
    <div class="header-rght">
        <!-- <div class="btn button-m" @click="preview">预览</div> -->
        <!-- 导入 -->
        <label class="custom-upload-btn">
            <div class="btn button-m">导入</div>
            <input type="file" class="file-input" id="realFileInput" @change="importJson" />
        </label>
        <div class="btn button-m" @click="exportJson">导出</div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import ExportScene from "../../commonjs/exportScene.js"
import ImportScene from "../../commonjs/importScene.js"

const router = useRouter()
const exportJson = () => {
    let sceneData = localStorage.getItem('scene')
    console.log(JSON.parse(sceneData).scene.object);
    const downloader = new ExportScene();
    downloader.downloadJson();
    // downloadGLTFWithAssets('assets/model/scene.gltf');
    // downloadGLB('assets/jifang.glb', 'jifang.gl');
    // downloadGLB('assets/day.hdr', 'day.hdr');
}


const preview = () => {
  router.push({
    name: 'preview'
  })
}

const importJson = (event) => {
    const importScene = new ImportScene()
    const file = event.target.files[0];
    if (!file) return;


    // 验证文件类型
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        console.log('不是json');

        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const content = JSON.parse(e.target.result);
            importScene.LoadJson(content)
        } catch (error) {
        } finally {
        }
    };

    reader.onerror = () => {
        console.log('读取失败');

    };

    reader.readAsText(file);
};

</script>

<style scoped>
.header-left{
    height: 48px;
    display: flex;
    align-items: center;
    .logo-name{
        font-size: 28px;
        font-weight: 600;
        margin: 0 5px;
    }
    .logo{
        width: 48px;
        height: 48px;
        margin-left: 8px;
    }
}
.header-rght {
    display: flex;
    align-items: center;

    .file-input {
        display: none;
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