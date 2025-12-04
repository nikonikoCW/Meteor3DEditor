import * as THREE from 'three';

/**
 * 添加对象命令
 * 用于将对象添加到场景中，支持撤销/重做
 */
export class AddObjectCommand {
    constructor(sceneManager, object, persistenceManager = null) {
        this.sceneManager = sceneManager;
        this.object = object;
        this.persistenceManager = persistenceManager;
    }

    /**
     * 执行命令：添加对象
     */
    execute() {
        this.sceneManager.addObject(this.object);
    }

    /**
     * 撤销命令：移除对象
     */
    undo() {
        this.sceneManager.removeObject(this.object);
    }
}

/**
 * 删除对象命令
 * 用于从场景中移除对象，支持撤销/重做
 */
export class DeleteObjectCommand {
    constructor(sceneManager, object, persistenceManager = null) {
        this.sceneManager = sceneManager;
        this.object = object;
        this.persistenceManager = persistenceManager;
    }

    /**
     * 执行命令：移除对象
     */
    execute() {
        this.sceneManager.removeObject(this.object);
    }

    /**
     * 撤销命令：重新添加对象
     */
    undo() {
        this.sceneManager.addObject(this.object);
    }
}

/**
 * 变换对象命令
 * 用于处理对象的移动、旋转、缩放，支持撤销/重做
 */
export class TransformCommand {
    /**
     * @param {THREE.Object3D} object - 被变换的对象
     * @param {Object} oldState - 变换前的状态 { position, rotation, scale }
     * @param {Object} newState - 变换后的状态 { position, rotation, scale }
     * @param {PersistenceManager} persistenceManager - 持久化管理器
     */
    constructor(object, oldState, newState, persistenceManager = null) {
        this.object = object;
        this.oldState = oldState; // { position, rotation, scale }
        this.newState = newState;
        this.persistenceManager = persistenceManager;
    }

    /**
     * 执行命令：应用新的变换状态
     */
    execute() {
        this.object.position.copy(this.newState.position);
        this.object.rotation.copy(this.newState.rotation);
        this.object.scale.copy(this.newState.scale);

        // 标记对象为已修改，以便持久化保存
        this.object.userData.positionModified = true;
        this.object.userData.rotationModified = true;
        this.object.userData.scaleModified = true;
    }

    /**
     * 撤销命令：恢复旧的变换状态
     */
    undo() {
        this.object.position.copy(this.oldState.position);
        this.object.rotation.copy(this.oldState.rotation);
        this.object.scale.copy(this.oldState.scale);

        // 即使是撤销，也标记为已修改，确保状态一致性
        this.object.userData.positionModified = true;
        this.object.userData.rotationModified = true;
        this.object.userData.scaleModified = true;
    }
}
