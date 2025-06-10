<template>
  <div class="file-node">
    <div class="node-header hoverable" @click="toggle" v-if="isFolder" @contextmenu.prevent="(e) => handleContextMenu(e, node)">
      <span>{{ expanded ? '📂' : '📁' }}</span>
      {{ node.name }}
    </div>

    <div class="node-file hoverable"  @contextmenu.prevent="(e) => handleContextMenu(e, node)" v-else>
      <span class="me-moxing iconfont" style="color:white;"></span> {{ node.name }}
    </div>

    <div v-if="isFolder && expanded" class="children">
      <FileNode v-for="(child, i) in node.children" :key="i" :node="child" @handle-context-menu="handleContextMenu"/>
    </div>
  </div>
</template>

<script setup>
import { defineEmits } from 'vue';
import { ref, computed ,onMounted,toRaw} from 'vue'
import FileNode from './FileNode.vue'


const emit = defineEmits(['message-to-parent']);

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
})


const expanded = ref(true)
const isFolder = computed(() => props.node.isGroup)

const toggle = () => {
  if (isFolder.value) {
    expanded.value = !expanded.value
  }
}





function handleContextMenu(e,node) {
  emit('handle-context-menu', e, node);
}

</script>

<style scoped>
.file-node {
  margin-left: 8px;
  margin-bottom: 4px;
}

.node-header {
  font-weight: bold;
  cursor: pointer;
  user-select: none;
}

.node-file {
  margin-left: 4px;
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


</style>