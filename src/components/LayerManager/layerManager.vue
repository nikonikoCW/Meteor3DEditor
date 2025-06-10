<!-- FileTree.vue -->
<template>
    <div class="file-tree scroll-box">
        <div class="tabs" @click="log2">
            <div class="tab active">图层管理</div>
        </div>
        <FileNode v-for="(item, index) in sceneChildren" :key="index" :node="item"
            @handle-context-menu="handleContextMenu" />

        <div id="context-menu">
            <div class="menu-item" @click="focus">聚焦</div>
            <div class="menu-item" onclick="alert('你点击了选项2')">高亮</div>
            <div class="menu-item" onclick="alert('你点击了选项2')">描边</div>
            <div class="menu-divider"></div>
            <div class="menu-item" @click="deleteObject(item)">删除<span class="iconfont me-shanchu"
                    @click="deleteObject(node)"></span></div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, toRaw, computed } from 'vue'
import FileNode from './FileNode.vue'
import { focusOnObject } from "../../commonjs/camera.js"
import { sceneConfigStore } from "/src/store/layer.js"
const store = sceneConfigStore()

function log2() {
    console.log(sceneChildren);

}
onMounted(() => {
    const contextMenu = document.getElementById('context-menu');
    // 点击其他地方隐藏菜单
    document.addEventListener('click', function () {
        contextMenu.style.display = 'none';
    });

    // 阻止菜单内部点击事件冒泡
    contextMenu.addEventListener('click', function (e) {
        e.stopPropagation();
    });
})

const sceneChildren = computed(() => {
    store.UpdateVersion;
    let result = []
    if (window.scene && window.scene.children) {
        window.scene.children.forEach(object => {
            if (object.isMesh || object.isSprite) {
                // 基础几何体
                result.push(object);
            } else if (object.isGroup || object.isScene) {
                // 导入的gltf/glb模型通常会是一个Group或Scene
                result.push(object);
            }
        });
    }
    let c = [{
        name: '场景模型',
        isGroup: true,
        children: result
    }]
    return c
});


let contextMenusite = null
const focus = () => {

    let node = contextMenusite

    console.log(node);
    let a = scene.children.filter(item => item.uuid === node.uuid)
    console.log('xxuanzhong', a);
    focusOnObject(window.camera, node)

}
const handleContextMenu = (e, node) => {
    console.log('右键菜单事件:', node.uuid);
    console.log('右键事件:', 1920 - e.clientX, e.clientY);

    contextMenusite = node
    // 这里你可以处理右键菜单的显示位置或其他操作

    const contextMenu = document.getElementById('context-menu');

    // 阻止默认右键菜单
    e.preventDefault();

    // 显示自定义菜单
    contextMenu.style.display = 'block';

    // 获取鼠标位置
    let x = e.clientX;
    let y = e.clientY;

    // 获取窗口尺寸和菜单尺寸
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 如果菜单会超出窗口右边，调整X坐标
    if (x + menuWidth > windowWidth) {
        x = windowWidth - menuWidth;
    }

    // 如果菜单会超出窗口底部，调整Y坐标
    if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight;
    }

    // 设置菜单位置
    contextMenu.style.left = x - (1920 - 240) + 'px';
    contextMenu.style.top = y - 48 + 'px';
};

const deleteObject = () => {
    let node = contextMenusite
    let a = scene.children.filter(item => item.uuid === node.uuid)
    scene.remove(a[0])
    //清除对应的store
    store.deleteObject(node.uuid)
    store.updateScene()

    document.getElementById('context-menu').style.display = 'none';

}
</script>

<style scoped>
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

.file-tree {
    padding: 16px;
    /* max-width: calc(800px); */
    width: calc(240px - 16*2px);
    position: relative;
    /* overflow: scroll; */
}


#context-menu {
    position: absolute;
    /* left: 0; */
    left: 100px;
    top: 80px;
    display: none;
    background-color: white;
    border: 1px solid #ddd;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    z-index: 1000;
    min-width: 100px;
}

.menu-item {
    padding: 8px 15px;
    cursor: pointer;
}

.menu-item:hover {
    background-color: #f0f0f0;
}

.menu-divider {
    height: 1px;
    background-color: #eee;
    margin: 3px 0;
}
</style>