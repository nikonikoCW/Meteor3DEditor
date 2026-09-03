import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OrbitCameraControl } from '../src/controls/OrbitCameraControl.js';

const createHarness = () => {
    const updateCalls = [];
    const control = Object.create(OrbitCameraControl.prototype);
    control.enabled = true;
    control.orbitControls = {
        target: new THREE.Vector3(),
        autoRotate: false,
        autoRotateSpeed: 2,
        update: (delta) => updateCalls.push(delta)
    };
    return { control, updateCalls };
};

test('setAutoRotate configures speed and enabled state without changing target', () => {
    const { control, updateCalls } = createHarness();
    control.orbitControls.target.set(10, 2, -4);

    assert.equal(control.setAutoRotate(true, 3.5), true);

    assert.deepEqual(control.getAutoRotate(), {
        enabled: true,
        speed: 3.5
    });
    assert.deepEqual(control.orbitControls.target.toArray(), [10, 2, -4]);
    assert.deepEqual(updateCalls, [0]);
});

test('setAutoRotate preserves speed when it is omitted', () => {
    const { control } = createHarness();
    control.orbitControls.target.set(1, 2, 3);
    control.orbitControls.autoRotateSpeed = -2;

    control.setAutoRotate(true);
    control.setAutoRotate(false);

    assert.deepEqual(control.getAutoRotate(), {
        enabled: false,
        speed: -2
    });
    assert.deepEqual(control.orbitControls.target.toArray(), [1, 2, 3]);
});

test('setAutoRotate rejects invalid input before changing state', () => {
    const { control } = createHarness();

    assert.throws(() => control.setAutoRotate('yes'), TypeError);
    assert.throws(() => control.setAutoRotate(true, Infinity), TypeError);

    assert.deepEqual(control.getAutoRotate(), {
        enabled: false,
        speed: 2
    });
});

test('update forwards normal delta and clamps a long suspended frame', () => {
    const { control, updateCalls } = createHarness();
    control.update(0.016);
    control.update(3600);
    assert.deepEqual(updateCalls, [0.016, 0.1]);

    control.enabled = false;
    control.update(0.032);
    assert.deepEqual(updateCalls, [0.016, 0.1]);
});

test('update discards elapsed time on the first frame after visibility resumes', () => {
    const { control, updateCalls } = createHarness();
    control.resetDeltaOnNextUpdate = true;

    control.update(120);
    control.update(0.016);

    assert.deepEqual(updateCalls, [0, 0.016]);
});
