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
        @click="deleteObject(node)"
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
  