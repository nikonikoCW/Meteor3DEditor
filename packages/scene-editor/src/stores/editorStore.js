import { defineStore } from 'pinia';
import { ref, markRaw } from 'vue';

export const useEditorStore = defineStore('editor', () => {
    const selectedObject = ref(null);
    const sceneObjects = ref([]); // For tree view

    // 版本号：markRaw 对象的深层属性变化无法被 Vue 追踪，
    // 通过递增此值来通知依赖组件（如 SceneTree）强制刷新。
    const treeVersion = ref(0);

    function selectObject(object) {
        selectedObject.value = object ? markRaw(object) : null;
    }

    function clearSelection() {
        selectedObject.value = null;
    }

    function addObject(object) {
        sceneObjects.value.push(markRaw(object));
    }

    function removeObject(object) {
        const index = sceneObjects.value.indexOf(object);
        if (index > -1) {
            sceneObjects.value.splice(index, 1);
        }
    }

    function resetObjects(objects = []) {
        // Replace with fresh array to avoid residue across scene loads
        sceneObjects.value = objects.map(obj => markRaw(obj));
    }

    /** 通知场景树等组件刷新（用于 markRaw 对象属性变更后） */
    function notifyTreeUpdate() {
        treeVersion.value++;
    }

    return {
        selectedObject,
        sceneObjects,
        treeVersion,
        selectObject,
        clearSelection,
        addObject,
        removeObject,
        resetObjects,
        notifyTreeUpdate
    };
});
