import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

class Transform {
    constructor() {
        this.transformControls = new TransformControls(camera, renderer.domElement);
        this._move()
    }
    _move() {

        scene.add(this.transformControls.getHelper());

        // 监听 TransformControls 的变化以更新渲染
        this.transformControls.addEventListener('change', () => {
            renderer.render(scene, camera);
        });
        this.transformControls.addEventListener('dragging-changed', (event) => {
            controls.enabled = !event.value;
        });
    }
    active(Object3D){
        this.transformControls.detach();
        this.transformControls.attach(Object3D);
    }
    remove(){
        this.transformControls.detach();

    }
    setMode(mode) {
        switch (mode) {
            case 'scale':
                this.transformControls.setMode('scale');

                break;
            case 'rotate':
                this.transformControls.setMode('rotate');

                break;

            case 'translate':
                this.transformControls.setMode('translate');
                break;
        }

    }
}

export default Transform;