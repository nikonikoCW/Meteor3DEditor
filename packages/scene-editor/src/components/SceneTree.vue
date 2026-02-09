<template>
  <div class="scene-tree-panel">
    <h3>场景树</h3>
    <div class="tree-list">
      <TreeNode 
        v-for="obj in sceneObjects" 
        :key="obj.uuid + '-' + treeVersion"
        :node="obj"
        :level="0"
        :selectedObject="selectedObject"
        @select="selectObject"
        @delete="deleteObject"
      />
      <div v-if="sceneObjects.length === 0" class="empty-message">
        场景中没有对象
      </div>
    </div>
  </div>
</template>

<script setup>
import { useEditorStore } from '../stores/editorStore';
import { DeleteObjectCommand } from '../core/CommandFactory';
import { storeToRefs } from 'pinia';
import TreeNode from './TreeNode.vue';

const editorStore = useEditorStore();
const { sceneObjects, selectedObject, treeVersion } = storeToRefs(editorStore);


const selectObject = (obj) => {
  editorStore.selectObject(obj);
};

const deleteObject = (obj) => {
  if (!window.editor) return;
  
  const { sceneManager, historyManager, persistenceManager } = window.editor;
  const command = new DeleteObjectCommand(sceneManager, obj, persistenceManager);
  historyManager.execute(command);
  editorStore.removeObject(obj);
  
  // 如果删除的是选中对象，清除选择
  if (selectedObject.value && selectedObject.value.uuid === obj.uuid) {
    editorStore.clearSelection();
  }
};
</script>

<style scoped>
.scene-tree-panel {
  width: 250px;
  background: #222;
  color: white;
  padding: 10px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
}

h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #aaa;
  text-transform: uppercase;
}

.tree-list {
  flex: 1;
  overflow-y: auto;
}

.empty-message {
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 13px;
}
</style>
