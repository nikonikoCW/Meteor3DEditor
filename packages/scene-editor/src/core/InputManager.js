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

        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('click', this.onClickCapture, true);
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
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
            moved: false
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

        if (pointerDown.moved) {
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

        // If a transform gizmo consumed the click/drag, leave selection unchanged.
        if (this.transformManager && this.transformManager.isDragging) return;

        this.selectAt(event.clientX, event.clientY);
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

    selectAt(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        let intersects = this.sceneManager.raycastObjects(this.mouse, {
            recursive: true,
            includeTileMap: false
        });

        if (this.editorStore.ignoreInvisibleOnPick) {
            intersects = intersects.filter(hit => hit.object.visible !== false);
        }

        if (intersects.length > 0) {
            const hitObject = intersects[0].object;

            // Tiles are created asynchronously under the persisted wrapper.
            // Always transform that wrapper instead of an internal tile mesh.
            let tilesetRoot = hitObject;
            while (tilesetRoot && tilesetRoot.userData?.modelType !== 'Tileset') {
                tilesetRoot = tilesetRoot.parent;
            }

            const selectedObject = hitObject.userData.selectionRoot
                || tilesetRoot
                || hitObject;
            this.editorStore.selectObject(selectedObject);
        } else {
            this.editorStore.clearSelection();
        }
    }

    dispose() {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.canvas.removeEventListener('click', this.onClickCapture, true);
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        if (this.suppressClickTimer) {
            window.clearTimeout(this.suppressClickTimer);
            this.suppressClickTimer = null;
        }
    }
}