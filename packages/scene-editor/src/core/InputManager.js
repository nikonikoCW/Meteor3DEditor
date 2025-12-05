import * as THREE from 'three';

/**
 * 输入管理器
 * 处理鼠标点击、射线检测和对象选择
 */
export class InputManager {
    constructor(sceneManager, editorStore, transformManager) {
        this.sceneManager = sceneManager;
        this.editorStore = editorStore;
        this.transformManager = transformManager;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.canvas = sceneManager.renderer.domElement;
        this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    }

    /**
     * 处理鼠标按下事件
     * 执行射线检测并选择对象
     * @param {PointerEvent} event - 指针事件
     */
    onPointerDown(event) {
        if (event.button !== 0) return; // 仅响应左键点击

        // 如果正在拖动变换控制器，则不进行选择
        if (this.transformManager && this.transformManager.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        // 对所有对象（包括子节点）进行射线检测
        const intersects = this.raycaster.intersectObjects(this.sceneManager.objects, true);

        if (intersects.length > 0) {
            // 直接选中被点击的对象（可能是子节点）
            const selectedObject = intersects[0].object;
            this.editorStore.selectObject(selectedObject);
        } else {
            this.editorStore.clearSelection();
        }
    }
}
