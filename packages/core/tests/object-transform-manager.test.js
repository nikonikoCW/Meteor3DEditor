import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Group } from '@tweenjs/tween.js';
import { ObjectTransformManager } from '../src/ObjectTransformManager.js';

const createHarness = () => {
    const object = new THREE.Object3D();
    const tweenGroup = new Group();
    const manager = new ObjectTransformManager({
        findObjectByBid: (bid) => bid === 'target-bid' ? object : null
    }, tweenGroup);
    return { object, tweenGroup, manager };
};

test('moveTo applies position and rotation immediately when duration is zero', () => {
    const { object, manager } = createHarness();
    object.rotation.order = 'ZYX';

    const result = manager.moveTo(
        'target-bid',
        { x: 10, y: 2, z: -5 },
        { x: 0.1, y: 0.2, z: 0.3 }
    );

    assert.equal(result, true);
    assert.deepEqual(object.position.toArray(), [10, 2, -5]);
    assert.deepEqual([object.rotation.x, object.rotation.y, object.rotation.z], [0.1, 0.2, 0.3]);
    assert.equal(object.rotation.order, 'ZYX');
});

test('moveTo uses the tween group when duration is greater than zero', () => {
    const { object, tweenGroup, manager } = createHarness();

    assert.equal(manager.moveTo(
        'target-bid',
        { x: 4, y: 5, z: 6 },
        { x: 0, y: Math.PI, z: 0 },
        1000
    ), true);
    assert.deepEqual(object.position.toArray(), [0, 0, 0]);

    tweenGroup.update(Infinity);

    assert.deepEqual(object.position.toArray(), [4, 5, 6]);
    assert.ok(object.quaternion.angleTo(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0))
    ) < 1e-10);
});

test('moveTo returns false for an unknown BID', () => {
    const { manager } = createHarness();
    assert.equal(manager.moveTo(
        'missing-bid',
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        500
    ), false);
});

test('moveTo rejects invalid input before mutating the object', () => {
    const { object, manager } = createHarness();
    object.position.set(1, 2, 3);

    assert.throws(() => manager.moveTo(
        '',
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 }
    ), TypeError);
    assert.throws(() => manager.moveTo(
        'target-bid',
        { x: 9, y: 9, z: 9 },
        { x: 0, y: Number.NaN, z: 0 }
    ), TypeError);
    assert.throws(() => manager.moveTo(
        'target-bid',
        { x: 9, y: 9, z: 9 },
        { x: 0, y: 0, z: 0 },
        -1
    ), RangeError);
    assert.deepEqual(object.position.toArray(), [1, 2, 3]);
});
