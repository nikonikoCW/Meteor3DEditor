import * as THREE from 'three';

/**
 * Add object command.
 * Adds an object to the scene and keeps the editor store in sync.
 */
export class AddObjectCommand {
    constructor(sceneManager, object, persistenceManager = null, editorStore = null) {
        this.sceneManager = sceneManager;
        this.object = object;
        this.persistenceManager = persistenceManager;
        this.editorStore = editorStore;
    }

    execute() {
        this.sceneManager.addObject(this.object);
        this.editorStore?.addObject(this.object);
    }

    undo() {
        this.sceneManager.removeObject(this.object);
        this.editorStore?.removeObject(this.object);

        if (this.editorStore?.selectedObject === this.object) {
            this.editorStore.clearSelection();
        }
    }
}

/**
 * Delete object command.
 * Removes an object from the scene and keeps the editor store in sync.
 */
export class DeleteObjectCommand {
    constructor(sceneManager, object, persistenceManager = null, editorStore = null) {
        this.sceneManager = sceneManager;
        this.object = object;
        this.persistenceManager = persistenceManager;
        this.editorStore = editorStore;
        this.wasSelected = editorStore?.selectedObject === object;
        this.oldParent = object.parent;
        this.oldOrder = this.oldParent?.children.indexOf(object) ?? -1;
        this.wasTrackedRoot = sceneManager.objects.includes(object);
    }

    execute() {
        if (this.wasTrackedRoot) {
            this.sceneManager.removeObject(this.object);
            this.editorStore?.removeObject(this.object);
        } else {
            this.sceneManager.raycastManager.disposeBVH(this.object);
            this.sceneManager.bidRegistry.unregisterTree(this.object);
            this.object.removeFromParent();
            this.sceneManager.markTriangleStatsDirty();
            this.editorStore?.notifyTreeUpdate();
        }

        if (this.editorStore?.selectedObject === this.object) {
            this.editorStore.clearSelection();
        }
    }

    undo() {
        if (this.wasTrackedRoot) {
            this.sceneManager.addObject(this.object);
            this.editorStore?.addObject(this.object);
        } else if (this.oldParent) {
            this.oldParent.add(this.object);
            const index = this.oldParent.children.indexOf(this.object);
            this.oldParent.children.splice(index, 1);
            this.oldParent.children.splice(Math.min(this.oldOrder, this.oldParent.children.length), 0, this.object);
            this.sceneManager.bidRegistry.registerTree(this.object);
            this.sceneManager.raycastManager.buildBVH(this.object);
            this.sceneManager.markTriangleStatsDirty();
            this.editorStore?.notifyTreeUpdate();
        }

        if (this.wasSelected) {
            this.editorStore?.selectObject(this.object);
        }
    }
}

/**
 * Groups multiple commands into one undo/redo step.
 */
export class CompositeCommand {
    constructor(commands = []) {
        this.commands = commands;
    }

    execute() {
        for (const command of this.commands) {
            command.execute();
        }
    }

    undo() {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
}

/**
 * Transform object command.
 * Handles moving, rotating and scaling objects with undo/redo support.
 */
export class TransformCommand {
    /**
     * @param {THREE.Object3D} object
     * @param {Object} oldState { position, rotation, scale }
     * @param {Object} newState { position, rotation, scale }
     * @param {PersistenceManager} persistenceManager
     */
    constructor(object, oldState, newState, persistenceManager = null) {
        this.object = object;
        this.oldState = oldState;
        this.newState = newState;
        this.persistenceManager = persistenceManager;
    }

    execute() {
        this.applyState(this.newState);
    }

    undo() {
        this.applyState(this.oldState);
    }

    applyState(state) {
        this.object.position.copy(state.position);
        this.object.rotation.copy(state.rotation);
        this.object.scale.copy(state.scale);

        this.object.userData.positionModified = true;
        this.object.userData.rotationModified = true;
        this.object.userData.scaleModified = true;

        this.dispatchChange();
    }

    dispatchChange() {
        window.dispatchEvent(new CustomEvent('transform-changed', {
            detail: { object: this.object }
        }));
    }
}


/**
 * Moves a scene node without changing its BID.
 */
export class ReparentObjectCommand {
    constructor(node, newParent, editorStore = null, newOrder = null) {
        this.node = node;
        this.newParent = newParent;
        this.editorStore = editorStore;
        this.newOrder = newOrder;
        this.oldParent = node.parent;
        this.oldOrder = this.oldParent?.children.indexOf(node) ?? -1;
        node.updateMatrix();
        this.oldLocalMatrix = node.matrix.clone();
        this.newLocalMatrix = null;
    }

    execute() {
        this.assertValidParent();
        this.newParent.attach(this.node);
        this.moveToOrder(this.newParent, this.newOrder);
        if (this.newLocalMatrix) {
            this.applyLocalMatrix(this.newLocalMatrix);
        } else {
            this.node.updateMatrix();
            this.newLocalMatrix = this.node.matrix.clone();
        }
        this.markModified();
    }

    undo() {
        if (!this.oldParent) return;
        this.oldParent.add(this.node);
        this.applyLocalMatrix(this.oldLocalMatrix);
        this.moveToOrder(this.oldParent, this.oldOrder);
        this.markModified();
    }

    assertValidParent() {
        if (!this.newParent || this.newParent === this.node) {
            throw new Error('A node cannot be parented to itself');
        }
        let current = this.newParent;
        while (current) {
            if (current === this.node) {
                throw new Error('Reparenting would create a scene graph cycle');
            }
            current = current.parent;
        }
    }

    applyLocalMatrix(matrix) {
        matrix.decompose(this.node.position, this.node.quaternion, this.node.scale);
        this.node.rotation.setFromQuaternion(this.node.quaternion);
        this.node.updateMatrix();
        this.node.updateMatrixWorld(true);
    }

    moveToOrder(parent, order) {
        if (!Number.isInteger(order) || order < 0) return;
        const currentIndex = parent.children.indexOf(this.node);
        if (currentIndex < 0) return;
        parent.children.splice(currentIndex, 1);
        parent.children.splice(Math.min(order, parent.children.length), 0, this.node);
    }

    markModified() {
        this.node.userData.positionModified = true;
        this.node.userData.rotationModified = true;
        this.node.userData.scaleModified = true;
        this.editorStore?.notifyTreeUpdate();
    }
}
