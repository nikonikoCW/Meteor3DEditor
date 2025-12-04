import { defineStore } from 'pinia';
import { ref, markRaw } from 'vue';

export const useEditorStore = defineStore('editor', () => {
    const selectedObject = ref(null);
    const sceneObjects = ref([]); // For tree view

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

    return {
        selectedObject,
        sceneObjects,
        selectObject,
        clearSelection,
        addObject,
        removeObject
    };
});
