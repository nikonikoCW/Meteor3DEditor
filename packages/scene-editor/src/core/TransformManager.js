import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { TransformCommand } from './CommandFactory.js';

/**
 * 变换管理器
 * 负责处理对象的移动、旋转和缩放操作
 * 集成了 TransformControls 和历史记录功能
 */
export class TransformManager {
    constructor(sceneManager, historyManager, persistenceManager = null) {
        this.sceneManager = sceneManager;
        this.historyManager = historyManager;
        this.persistenceManager = persistenceManager;
        this.controls = new TransformControls(sceneManager.camera, sceneManager.renderer.domElement);

        // 拖拽时禁用轨道控制器，避免冲突
        this.controls.addEventListener('dragging-changed', (event) => {
            sceneManager.controls.enabled = !event.value;
        });

        this.dragStartParams = null;
        this.isDragging = false;

        // 鼠标按下：记录初始状态
        this.controls.addEventListener('mouseDown', () => {
            this.isDragging = true;
            if (this.controls.object) {
                this.dragStartParams = {
                    position: this.controls.object.position.clone(),
                    rotation: this.controls.object.rotation.clone(),
                    scale: this.controls.object.scale.clone()
                };
            }
        });

        // 鼠标松开：检查变化并创建历史命令
        this.controls.addEventListener('mouseUp', () => {
            this.isDragging = false;
            if (this.controls.object && this.dragStartParams) {
                const newState = {
                    position: this.controls.object.position.clone(),
                    rotation: this.controls.object.rotation.clone(),
                    scale: this.controls.object.scale.clone()
                };

                // 仅当状态发生改变时才添加命令
                if (!this.dragStartParams.position.equals(newState.position) ||
                    !this.dragStartParams.rotation.equals(newState.rotation) ||
                    !this.dragStartParams.scale.equals(newState.scale)) {

                    const command = new TransformCommand(
                        this.controls.object,
                        this.dragStartParams,
                        newState,
                        this.persistenceManager
                    );
                    this.historyManager.execute(command);
                }

                // 触发 UI 更新事件
                window.dispatchEvent(new CustomEvent('transform-changed', {
                    detail: { object: this.controls.object }
                }));
            }
        });

        // 拖拽过程中实时更新（可选，用于实时更新 UI）
        this.controls.addEventListener('objectChange', () => {
            if (this.controls.object) {
                window.dispatchEvent(new CustomEvent('transform-changed', {
                    detail: { object: this.controls.object }
                }));
            }
        });

        // 使用 getHelper() 将控制器添加到场景中
        const transformControlsHelper = this.controls.getHelper();
        sceneManager.scene.add(transformControlsHelper);
    }

    /**
     * 附加控制器到对象
     * @param {THREE.Object3D} object - 要变换的对象
     */
    attach(object) {
        this.controls.attach(object);
    }

    /**
     * 分离控制器
     */
    detach() {
        this.controls.detach();
    }

    /**
     * 设置变换模式
     * @param {string} mode - 'translate', 'rotate', 或 'scale'
     */
    setMode(mode) {
        this.controls.setMode(mode);
    }

    /**
     * 更新选中状态
     * 供外部调用以同步 UI 变化
     */
    updateSelection() {
        // TransformControls 在循环中会自动更新，
        // 此方法用于满足 PropertiesPanel 的调用接口。
        // 未来可以在此处添加特定的更新逻辑。
    }
}
