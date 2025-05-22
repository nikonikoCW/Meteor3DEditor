import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import TWEEN from '@tweenjs/tween.js';
import { ViewHelper } from '../commonjs/ViewHelper';
import { border } from "./effect.js"
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';

import { TransformControls } from 'three/addons/controls/TransformControls.js';
import Transform from "./transform.js"
import WeatherEffect from "./weather.js"

class Meteor3D {
    constructor() {
        // 构造函数
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.helper = null;
        this.composer = null
        this.dom = null
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.transform = null
    }
    initScene(dom) {
        let that = this
        this.dom = dom

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
        this.composer = new EffectComposer(renderer);

        //添加后处理group
        border(this.composer)
        const weather = new WeatherEffect()

        // 渲染场景
        function animate() {
            requestAnimationFrame(animate);
            that.scene.backgroundRotation.y += 0.0001

            const delta = that.clock.getDelta();
            renderer.autoClear = false

            renderer.render(that.scene, camera);
            // that.composer.render();

            if (that.helper.animating) that.helper.update(delta);
            that.helper.render(renderer);

            // renderer.autoClear = true


            TWEEN.update();


            controls.update()
            camera.updateProjectionMatrix()
            weather.animation()


        }
        animate()

        // this.transform = new Transform()
        //控制器
        
        const transformControls = new TransformControls(camera, renderer.domElement);
        const transformHelper = transformControls.getHelper();
        this.scene.add(transformHelper); // 添加变换控件辅助对象到场景
        // this.scene.add(transformControls);

        
        let isDragging = false;
        transformControls.addEventListener('dragging-changed', (event) => {
            controls.enabled = !event.value;
            isDragging = event.value;
        });

        // 变换更新时渲染
        transformControls.addEventListener('change', () => {
            renderer.render(scene, camera);
        });

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        function onMouseClick(event) {
            event.preventDefault();

            // 如果正在拖动，忽略点击事件
            if (isDragging) return;

            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            // 检测正方体和变换控件辅助对象
            

            const objects = [];
            that.scene.children.forEach(element => {
                if(!element.isTransformControlsRoot) objects.push( element );
            });

            const intersects  = raycaster.intersectObjects( objects, false );
    
        
            
            if (intersects.length > 0) {
                // 点击了正方体，附加变换控件
                transformControls.attach(intersects[0].object);
                // 点击了变换控件（transformHelper），保持当前状态，不detach
            } else {
                // 点击其他地方，取消变换控件
                transformControls.detach();
            }
        }

        renderer.domElement.addEventListener('click', onMouseClick);
        //控制器结束
        
        

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
    initViewHelper() {
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

    leftClick(){
        document.getElementById(this.dom).addEventListener('click', (event) => {
            
            // 将鼠标坐标转换到 NDC（归一化设备坐标）
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // 使用射线投射器
            this.raycaster.params.Line.threshold = 0.1//调整精度
            this.raycaster.setFromCamera(this.mouse, camera);

            // 计算射线与场景中的物体的交点
            const intersects = this.raycaster.intersectObjects(scene.children);

            // 如果有交点
            if (intersects.length > 0) {
                
                console.log('Clicked at:', intersects[0].object); // 输出交点坐标
                // this.transform.active(intersects[0].object)
            }else{
                
            }
        });
    }
    weather() {

    }
}

// 合并不同功能模块的方法
Object.assign(Meteor3D.prototype);

export default Meteor3D;