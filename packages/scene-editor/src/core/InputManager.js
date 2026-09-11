import * as THREE from 'three';

/**
 * 输入管理器
 * 处理鼠标点击和对象选择
 * 使用 SceneManager 的 BVH 加速射线检测
 */
export class InputManager {
    constructor(sceneManager, editorStore, transformManager) {
        this.sceneManager = sceneManager;
        this.editorStore = editorStore;
        this.transformManager = transformManager;
        this.mouse = new THREE.Vector2();
        this.clickMoveThreshold = 4;
        this.pointerDown = null;
        this.suppressNextClick = false;
        this.suppressClickTimer = null;

        this.canvas = sceneManager.renderer.domElement;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onClickCapture = this.onClickCapture.bind(this);
        this.onSceneClick = this.onSceneClick.bind(this);

        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('click', this.onClickCapture, true);
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
        this.sceneManager.on('scene-click', this.onSceneClick);
    }

    /**
     * 处理鼠标按下事件，只记录按下位置，不立刻做射线检测。
     * @param {PointerEvent} event - 指针事件
     */
    onPointerDown(event) {
        if (event.button !== 0) return;

        this.pointerDown = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            moved: false,
            // TransformControls 的监听器先注册；若按中控制轴，它会同步进入 dragging。
            // 在 pointerdown 阶段保存，避免 pointerup 时 mouseUp 已将 isDragging 重置。
            transformInteraction: Boolean(
                this.transformManager?.isDragging || this.transformManager?.controls?.dragging
            )
        };
    }

    onPointerMove(event) {
        if (!this.pointerDown || event.pointerId !== this.pointerDown.pointerId) return;

        const dx = event.clientX - this.pointerDown.x;
        const dy = event.clientY - this.pointerDown.y;
        if ((dx * dx + dy * dy) > this.clickMoveThreshold * this.clickMoveThreshold) {
            this.pointerDown.moved = true;
        }
    }

    onPointerUp(event) {
        if (!this.pointerDown || event.pointerId !== this.pointerDown.pointerId) return;

        const pointerDown = this.pointerDown;
        this.pointerDown = null;

        if (pointerDown.moved || pointerDown.transformInteraction) {
            this.suppressNextClick = true;
            if (this.suppressClickTimer) {
                window.clearTimeout(this.suppressClickTimer);
            }
            this.suppressClickTimer = window.setTimeout(() => {
                this.suppressNextClick = false;
                this.suppressClickTimer = null;
            }, 250);
            return;
        }

        // 普通点击交给 core 的 scene-click：一次射线同时服务选择和点击事件。
    }

    onClickCapture(event) {
        if (!this.suppressNextClick) return;

        this.suppressNextClick = false;
        if (this.suppressClickTimer) {
            window.clearTimeout(this.suppressClickTimer);
            this.suppressClickTimer = null;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    /** 使用 core 已完成的 scene-click 拾取结果更新编辑器选择。 */
    onSceneClick(clickData) {
        let hitObject = clickData.object || null;

        // 默认路径完全复用 core 的命中结果。仅当用户明确开启“忽略隐藏对象”且
        // 最近命中不可见时，才额外检测一次以寻找后方的可见对象。
        if (hitObject && this.editorStore.ignoreInvisibleOnPick && !this.isEffectivelyVisible(hitObject)) {
            hitObject = this.findFirstVisibleObject(clickData.screenPosition);
        }

        const selectedObject = this.resolveSelectedObject(hitObject);
        if (selectedObject) {
            this.editorStore.selectObject(selectedObject);
        } else {
            this.editorStore.clearSelection();
        }

        if (this.transformManager?.getMode() !== 'select') return;

        console.log('🖱️ [scene-editor] left-click:', {
            screenPosition: clickData.screenPosition,
            worldPosition: clickData.worldPosition,
            lngLat: clickData.lngLat,
            hitObject: this.summarizeObject(clickData.object),
            selectedObject: this.summarizeObject(selectedObject)
        });
    }

    findFirstVisibleObject(screenPosition) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((screenPosition.x - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((screenPosition.y - rect.top) / rect.height) * 2 + 1;

        const intersects = this.sceneManager.raycastObjects(this.mouse, {
            recursive: true,
            includeTileMap: false,
            firstHitOnly: true
        });

        return intersects.find(hit => this.isEffectivelyVisible(hit.object))?.object || null;
    }

    isEffectivelyVisible(object) {
        let current = object;
        while (current) {
            if (current.visible === false) return false;
            current = current.parent;
        }
        return true;
    }

    resolveSelectedObject(hitObject) {
        if (!hitObject || this.isTileMapObject(hitObject)) return null;

        let tilesetRoot = hitObject;
        while (tilesetRoot && tilesetRoot.userData?.modelType !== 'Tileset') {
            tilesetRoot = tilesetRoot.parent;
        }

        return hitObject.userData.selectionRoot || tilesetRoot || hitObject;
    }

    isTileMapObject(object) {
        const mapGroup = this.sceneManager.tileMapManager?.mapGroup;
        if (!mapGroup) return false;

        let current = object;
        while (current) {
            if (current === mapGroup) return true;
            current = current.parent;
        }
        return false;
    }

    summarizeObject(object) {
        return object ? {
            bid: object.userData?.bid || null,
            name: object.name || '',
            type: object.type,
            modelType: object.userData?.modelType || null
        } : null;
    }

    dispose() {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.canvas.removeEventListener('click', this.onClickCapture, true);
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        this.sceneManager.off('scene-click', this.onSceneClick);
        if (this.suppressClickTimer) {
            window.clearTimeout(this.suppressClickTimer);
            this.suppressClickTimer = null;
        }
    }
}
