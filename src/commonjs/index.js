import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ViewHelper } from '../commonjs/ViewHelper';

class Meteor3D {
    constructor() {
        // 构造函数
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.helper = null;
    }
    initScene(dom) {
        let that = this

        window.scene = this.scene

        // 创建相机
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        camera.position.set(311.03264809072385, 98.96320277581572, 14.490559617396444);
        window.camera = camera

        // 创建渲染器
        const renderer = new THREE.WebGLRenderer();
        window.renderer = renderer
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById(dom).appendChild(renderer.domElement);

        const light = new THREE.AmbientLight(0xffffff);
        this.scene.add(light);


        // 鼠标控制相机
        const controls = new OrbitControls(camera, renderer.domElement);
        window.controls = controls
        

        this.initViewHelper()

        // 渲染场景
        function animate() {
            requestAnimationFrame(animate);
            that.scene.backgroundRotation.y += 0.0001

            const delta = that.clock.getDelta();
            renderer.autoClear = false
            renderer.render(that.scene, camera);

            if (that.helper.animating) that.helper.update(delta);
            that.helper.render(renderer);

            renderer.autoClear = true


        }
        animate()

        // 监听窗口大小变化
        window.addEventListener('resize', onWindowResize);

        function onWindowResize() {
            // 更新相机宽高比
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix(); // 必须调用，否则相机不会生效

            // 更新渲染器尺寸
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    initViewHelper(){
        this.helper = new ViewHelper(camera, window.renderer.domElement);
        this.helper.controls = controls;
        this.helper.controls.center = controls.target;

        const div = document.createElement('div');
        div.id = 'viewHelper';
        div.style.position = 'absolute';
        div.style.right = '276px';
        div.style.bottom = 0;
        div.style.height = '128px';
        div.style.width = '128px';

        document.body.appendChild(div);

        div.addEventListener('pointerup', (event) => {
            this.helper.handleClick(event)
        });
    }
    weather(){
        
    }
}

// 合并不同功能模块的方法
Object.assign(Meteor3D.prototype);

export default Meteor3D;