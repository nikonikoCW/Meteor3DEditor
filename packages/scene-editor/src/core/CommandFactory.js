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
    }

    execute() {
        this.sceneManager.removeObject(this.object);
        this.editorStore?.removeObject(this.object);

        if (this.editorStore?.selectedObject === this.object) {
            this.editorStore.clearSelection();
        }
    }

    undo() {
        this.sceneManager.addObject(this.object);
        this.editorStore?.addObject(this.object);

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
