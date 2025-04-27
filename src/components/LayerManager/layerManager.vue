<!-- FileTree.vue -->
<template>
    <div class="file-tree">
        <p @click="log2">图层管理</p>
        <FileNode v-for="(item, index) in store.files" :key="index" :node="item" @handle-context-menu="handleContextMenu"/>
        
        <div id="context-menu">
            <div class="menu-item" @click="focus">聚焦</div>
            <div class="menu-item" onclick="alert('你点击了选项2')">高亮</div>
            <div class="menu-item" onclick="alert('你点击了选项2')">描边</div>
            <div class="menu-divider"></div>
            <div class="menu-item" onclick="alert('你点击了选项3')">删除</div>
        </div>
    </div>
</template>

<script setup>
import { ref ,onMounted,toRaw} from 'vue'
import FileNode from './FileNode.vue'
import { sceneConfigStore } from "/src/store/layer.js"
import { focusOnObject ,getView,flyto} from "../../commonjs/camera.js"
const store = sceneConfigStore()

function log2(){
    console.log(store.files);
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


let contextMenusite = null
const focus = () => {
  
  let node = contextMenusite
  
  console.log(node);
  let a = scene.children.filter(item => item.uuid === node.uuid)
  console.log('xxuanzhong',a);
  focusOnObject(window.camera , a[0])

}
const handleContextMenu = (e, node) => {
  console.log('右键菜单事件:', node.uuid);
  console.log('右键事件:', e);

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
    // console.log(x,x-1920+240);
    
    //240是父辈菜单的宽度
    contextMenu.style.left = x-windowWidth+240 + 'px';
    contextMenu.style.top = y + 'px';
};

</script>

<style scoped>
.file-tree {
    padding: 16px;
    max-width: 800px;
}


#context-menu {
    position: fixed;
    /* left: 0; */
    display: none;
    background-color: white;
    border: 1px solid #ddd;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    z-index: 1000;
    min-width: 150px;
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