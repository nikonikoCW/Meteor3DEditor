<!-- FileTree.vue -->
<template>
    <div class="file-tree">
        <p @click="log2">图层管理</p>
        <FileNode v-for="(item, index) in store.files" :key="index" :node="item" />
    </div>
</template>

<script setup>
import { ref } from 'vue'
import FileNode from './FileNode.vue'
import { sceneConfigStore } from "/src/store/layer.js"
const store = sceneConfigStore()

const files = ref([
    {
        name: '文件夹A',
        children: [
            {
                name: '文件夹C',
                children: [
                    { name: '文件1.txt', type: '文本', time: '2025-04-10' },
                    { name: '文件2.png', type: '图片', time: '2025-04-11' }
                ]
            },
            { name: '文件2.png', type: '图片', time: '2025-04-11' }
        ]
    },
    {
        name: '文件夹B',
        children: [
            { name: '文档.docx', type: '文档', time: '2025-04-12' },
            { name: '演示.pptx', type: 'PPT', time: '2025-04-13' }
        ]
    }
])

function log2(){
    console.log(store.files);
}
</script>

<style scoped>
.file-tree {
    padding: 16px;
    max-width: 800px;
}
</style>