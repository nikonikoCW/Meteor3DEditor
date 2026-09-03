<template>
  <div class="scene-tree-panel">
    <h3>场景树</h3>
    <div class="tree-list">
      <TreeNode 
        v-for="obj in rootSceneObjects"
        :key="obj.userData.bid"
        :node="obj"
        :level="0"
        :selectedObject="selectedObject"
        :refresh-version="treeVersion"
        @select="selectObject"
        @delete="deleteObject"
        @reparent="reparentObject"
      />
      <div v-if="sceneObjects.length === 0" class="empty-message">
        场景中没有对象
      </div>
    </div>
  </div>
</template>

<script setup>
import { useEditorStore } from '../stores/editorStore';
import { DeleteObjectCommand, ReparentObjectCommand } from '../core/CommandFactory';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import TreeNode from './TreeNode.vue';

const editorStore = useEditorStore();
const { sceneObjects, selectedObject, treeVersion } = storeToRefs(editorStore);
const rootSceneObjects = computed(() => sceneObjects.value.filter((obj) => obj.parent?.isScene));


const selectObject = (obj) => {
  editorStore.selectObject(obj);
};

const reparentObject = ({ nodeBid, parentBid }) => {
  if (!window.editor) return;
  const { sceneManager, historyManager } = window.editor;
  const node = sceneManager.findObjectByBid(nodeBid);
  const parent = sceneManager.findObjectByBid(parentBid);
  if (!node || !parent) return;
  try {
    historyManager.execute(new ReparentObjectCommand(node, parent, editorStore));
  } catch (error) {
    console.warn('[SceneTree] Reparent rejected:', error.message);
  }
};

const deleteObject = (obj) => {
  if (!window.editor) return;
  
  const { sceneManager, historyManager, persistenceManager } = window.editor;
  const command = new DeleteObjectCommand(sceneManager, obj, persistenceManager, editorStore);
  historyManager.execute(command);
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
