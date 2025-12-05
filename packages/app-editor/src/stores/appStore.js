import { defineStore } from 'pinia';
import { ref, markRaw } from 'vue';

export const useAppStore = defineStore('app', () => {
    const widgets = ref([]); // 2D widgets list
    const selectedWidget = ref(null);
    const currentSceneId = ref(null);

    function selectWidget(widget) {
        // 不要使用 markRaw，否则会导致响应性丢失，无法实时更新位置
        selectedWidget.value = widget;
    }

    function clearSelection() {
        selectedWidget.value = null;
    }

    function addWidget(widget) {
        // 同理，不要使用 markRaw，我们需要 widgets 数组里的对象是响应式的
        widgets.value.push(widget);
    }

    function removeWidget(widget) {
        const index = widgets.value.indexOf(widget);
        if (index > -1) {
            widgets.value.splice(index, 1);
        }
    }
    
    function setSceneId(id) {
        currentSceneId.value = id;
    }

    return {
        widgets,
        selectedWidget,
        currentSceneId,
        selectWidget,
        clearSelection,
        addWidget,
        removeWidget,
        setSceneId
    };
});

