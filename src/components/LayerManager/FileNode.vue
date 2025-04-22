<template>
  <div class="file-node">
    <div class="node-header hoverable" @click="toggle" v-if="isFolder">
      <span>{{ expanded ? '📂' : '📁' }}</span>
      {{ node.name }}
    </div>

    <div class="node-file hoverable" @click="deleteObject(node)" @contextmenu.prevent="(e) => handleContextMenu(e, node)" v-else>
      <span class="me-moxing iconfont" style="color:white;"></span> {{ node.name }}
      <span class="iconfont me-shanchu"></span>
    </div>

    <div v-if="isFolder && expanded" class="children">
      <FileNode v-for="(child, i) in node.children" :key="i" :node="child" />
    </div>
  </div>
  <div id="context-menu">
        <div class="menu-item" onclick="alert('你点击了选项1')">选项1</div>
        <div class="menu-item" onclick="alert('你点击了选项2')">选项2</div>
        <div class="menu-divider"></div>
        <div class="menu-item" onclick="alert('你点击了选项3')">选项3</div>
    </div>
</template>

<script setup>
import { defineEmits } from 'vue';
import { ref, computed ,onMounted} from 'vue'
import FileNode from './FileNode.vue'

import { sceneConfigStore } from "/src/store/layer.js"
const store = sceneConfigStore()


const emit = defineEmits(['message-to-parent']);

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  item: Object
})

const expanded = ref(true)
const isFolder = computed(() => props.node.children)

const toggle = () => {
  if (isFolder.value) {
    expanded.value = !expanded.value
  }
}
const deleteObject = (node) => {
  console.log(node);
  let a = scene.children.filter(item => item.uuid === node.uuid)
  scene.remove(a[0])

  //清除对应的store
  store.deleteObject(node.uuid)

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

function handleContextMenu(e,node) {
  console.log(e,node);
  
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
}

</script>

<style scoped>
.file-node {
  margin-left: 16px;
  margin-bottom: 4px;
}

.node-header {
  font-weight: bold;
  cursor: pointer;
  user-select: none;
}

.node-file {
  margin-left: 20px;
  color: #555;
}

.children {
  margin-top: 4px;
}

.hoverable {
  transition: background-color 0.2s;
  cursor: pointer;
}

.hoverable:hover {
  background-color: #e8f0fe;
}


#target-div {
    width: 300px;
    height: 200px;
    background-color: #fff;
    border: 2px dashed #ccc;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: default;
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

.info-text {
    margin-top: 20px;
    text-align: center;
    color: #666;
}
</style>