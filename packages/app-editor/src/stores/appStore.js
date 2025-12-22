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

    // 场景状态
    const isSceneReady = ref(false);
    const sceneInstance = ref(null);  // Core SDK 实例

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
                    enabled: w.enabled !== false,  // 默认启用
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

            // 确保每个 widget 都有 enabled 属性（兼容旧数据）
            widgets.value = (app.widgets || []).map(w => ({
                ...w,
                // 优先使用 enabled，如果没有则回退到 visible，都没有则默认 true
                enabled: w.enabled !== undefined ? w.enabled : (w.visible !== false)
            }));

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
        // 重置场景状态
        isSceneReady.value = false;
        sceneInstance.value = null;
    }

    // 设置场景就绪状态
    function setSceneReady(ready, instance = null) {
        isSceneReady.value = ready;
        if (instance) {
            sceneInstance.value = instance;
        }
        if (!ready) {
            sceneInstance.value = null;
        }
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
                case 'enable':
                    targetWidget.enabled = true;
                    break;
                case 'disable':
                    targetWidget.enabled = false;
                    break;
                case 'toggle':
                    targetWidget.enabled = !targetWidget.enabled;
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
        isSceneReady,
        sceneInstance,
        isSaving,
        isLoading,
        hasUnsavedChanges,
        // 方法
        selectWidget,
        clearSelection,
        addWidget,
        removeWidget,
        setSceneId,
        setSceneReady,
        toggleEditMode,
        saveApp,
        loadApp,
        newApp,
        triggerEvent
    };
});
