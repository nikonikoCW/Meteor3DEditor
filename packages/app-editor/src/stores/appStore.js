import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as appService from '../services/appService';

export const useAppStore = defineStore('app', () => {
    // 应用数据
    const appId = ref(null);
    const appName = ref('未命名应用');
    const canvas = ref({
        width: 1920,
        height: 1080,
        background: '#1a1a1a'
    });

    const widgets = ref([]);
    const selectedWidget = ref(null);
    const currentSceneId = ref(null);
    const isEditMode = ref(false);

    // 保存状态
    const isSaving = ref(false);
    const isLoading = ref(false);
    const hasUnsavedChanges = ref(false);

    function toggleEditMode() {
        isEditMode.value = !isEditMode.value;
        if (!isEditMode.value) {
            selectedWidget.value = null;
        }
    }

    function selectWidget(widget) {
        selectedWidget.value = widget;
    }

    function clearSelection() {
        selectedWidget.value = null;
    }

    function addWidget(widget) {
        widgets.value.push(widget);
        hasUnsavedChanges.value = true;
    }

    function removeWidget(widget) {
        const index = widgets.value.indexOf(widget);
        if (index > -1) {
            widgets.value.splice(index, 1);
            if (selectedWidget.value === widget) {
                selectedWidget.value = null;
            }
        }
        hasUnsavedChanges.value = true;
    }

    function setSceneId(id) {
        currentSceneId.value = id;
    }

    // 保存应用到后端
    async function saveApp() {
        if (isSaving.value) return;

        isSaving.value = true;
        try {
            const appData = {
                name: appName.value,
                description: '',
                canvas: canvas.value,
                widgets: widgets.value.map(w => ({
                    id: w.id,
                    type: w.type,
                    position: w.position,
                    size: w.size,
                    rotation: w.rotation,
                    data: w.data,
                    visible: w.visible !== false,  // 默认 true
                    interactions: w.interactions || []
                }))
            };

            if (appId.value) {
                // 更新现有应用
                await appService.updateApp(appId.value, appData);
            } else {
                // 创建新应用
                const result = await appService.createApp(appData);
                appId.value = result.appId;
            }

            hasUnsavedChanges.value = false;
            return true;
        } catch (error) {
            console.error('保存失败:', error);
            throw error;
        } finally {
            isSaving.value = false;
        }
    }

    // 从后端加载应用
    async function loadApp(id) {
        if (isLoading.value) return;

        isLoading.value = true;
        try {
            const app = await appService.getApp(id);

            appId.value = app.appId;
            appName.value = app.name;
            canvas.value = app.canvas || { width: 1920, height: 1080, background: '#1a1a1a' };
            widgets.value = app.widgets || [];

            hasUnsavedChanges.value = false;
            selectedWidget.value = null;

            return app;
        } catch (error) {
            console.error('加载失败:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    // 创建新应用
    function newApp() {
        appId.value = null;
        appName.value = '未命名应用';
        canvas.value = { width: 1920, height: 1080, background: '#1a1a1a' };
        widgets.value = [];
        selectedWidget.value = null;
        hasUnsavedChanges.value = false;
    }

    // 触发组件事件，执行交互规则
    function triggerEvent(widgetId, eventName) {
        const widget = widgets.value.find(w => w.id === widgetId);
        if (!widget || !widget.interactions) return;

        // 找到匹配的交互规则
        const rules = widget.interactions.filter(i => i.event === eventName);

        for (const rule of rules) {
            const targetWidget = widgets.value.find(w => w.id === rule.target);
            if (!targetWidget) continue;

            // 执行动作
            switch (rule.action) {
                case 'show':
                    targetWidget.visible = true;
                    break;
                case 'hide':
                    targetWidget.visible = false;
                    break;
                case 'toggle':
                    targetWidget.visible = targetWidget.visible === false ? true : false;
                    break;
            }
        }
    }

    return {
        // 状态
        appId,
        appName,
        canvas,
        widgets,
        selectedWidget,
        currentSceneId,
        isEditMode,
        isSaving,
        isLoading,
        hasUnsavedChanges,
        // 方法
        selectWidget,
        clearSelection,
        addWidget,
        removeWidget,
        setSceneId,
        toggleEditMode,
        saveApp,
        loadApp,
        newApp,
        triggerEvent
    };
});
