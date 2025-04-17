<!--
 * @Author: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @Date: 2025-04-17 11:00:50
 * @LastEditors: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @LastEditTime: 2025-04-17 11:10:18
 * @FilePath: \nico\src\components\LayerManager\FileNode.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<!-- FileNode.vue -->
<template>
    <div class="file-node">
      <div
        class="node-header hoverable"
        @click="toggle"
        v-if="isFolder"
      >
        <span>{{ expanded ? '📂' : '📁' }}</span>
        {{ node.name }}
      </div>
  
      <div
        class="node-file hoverable"
        v-else
      >
        📄 {{ node.name }}
        <span class="iconfont me-shanchu"></span>
      </div>
  
      <div v-if="isFolder && expanded" class="children">
        <FileNode
          v-for="(child, i) in node.children"
          :key="i"
          :node="child"
        />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import FileNode from './FileNode.vue'
  
  const props = defineProps({
    node: {
      type: Object,
      required: true
    }
  })
  
  const expanded = ref(true)
  const isFolder = computed(() => props.node.children && props.node.children.length)
  
  const toggle = () => {
    if (isFolder.value) {
      expanded.value = !expanded.value
    }
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
  </style>
  