import test from 'node:test';
import assert from 'node:assert/strict';
import { PersistenceManager } from '../src/PersistenceManager.js';

function createPersistenceManager() {
    const savedScenes = [];
    const manager = Object.create(PersistenceManager.prototype);
    manager.sceneManager = {
        isReady: false,
        objects: [],
        environmentUrl: null,
        gisConfig: null
    };
    manager.editorStore = {
        sceneMetadata: {
            name: '部分恢复场景',
            description: '',
            cameraFar: 1000000
        }
    };
    manager.dbManager = {
        async saveScene(scene) {
            savedScenes.push(scene);
        }
    };
    manager.currentSceneId = 'scene-1';
    manager.objectMap = new Map();
    manager.serializeSceneGraph = () => [];
    manager.serializeDeletedSourceNodes = () => [];
    return { manager, savedScenes };
}

test('saveScene rejects an incomplete scene by default', async () => {
    const { manager, savedScenes } = createPersistenceManager();

    await assert.rejects(
        manager.saveScene(),
        /场景尚未完整加载/
    );
    assert.equal(savedScenes.length, 0);
});

test('saveScene saves the current snapshot when allowIncomplete is explicit', async () => {
    const { manager, savedScenes } = createPersistenceManager();

    await manager.saveScene({ allowIncomplete: true });

    assert.equal(savedScenes.length, 1);
    assert.equal(savedScenes[0].id, 'scene-1');
    assert.deepEqual(savedScenes[0].objects, []);
});
