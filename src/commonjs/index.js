import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import TWEEN from '@tweenjs/tween.js';
import { ViewHelper } from '../commonjs/ViewHelper';
import { border } from "./effect.js"
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import HRDManager from "./loadHdr.js"
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { sceneConfigStore } from "/src/store/layer.js"
const store = sceneConfigStore()

import Aperture from "./effect/Aperture.js"
import MagicFormation from "./effect/MagicFormation.js"
import Fire from "./effect/Fire.js"

class Meteor3D {
    constructor(config) {
        // 构造函数
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        window.scene = this.scene
        this.helper = null;
        this.composer = null
        this.dom = null
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        //transformControls
        this.transformControls = null
        this.transformControlsStatus = false
        this.transMode='translate'
        this.selectedModel = null
        


        this.container = config.container;
        this.scene.background = new THREE.Color(config.backgroundColor || 0x000000);

        this.camera = new THREE.PerspectiveCamera(
            config.fov || 75,
            this.container.clientWidth / this.container.clientHeight,
            config.near || 0.1,
            config.far || 1000
        );
        window.camera = this.camera
        this.camera.position.set(0, 1, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        this.modules = new Map();
        this.animationCallbacks = new Set(); // 存储动画回调
        this.isAnimating = false; // 标记动画循环是否运行
        this.animationFrameId = null; // 存储 requestAnimationFrame ID

        
        // 鼠标控制相机
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        window.controls = this.controls

        window.addEventListener('resize', this.handleResize.bind(this));
        this.initViewHelper()
        this.#startAnimation()
        this.initTransform()

        //初始化左键点击
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.renderer.domElement.addEventListener('click', this.onMouseClick);
        this.isDragging = false;
    }
    initTransform(){
        this.transformControls = new TransformControls(camera, this.renderer.domElement);
        const transformHelper = this.transformControls.getHelper();
        this.scene.add(transformHelper); // 添加变换控件辅助对象到场景
        // this.scene.add(this.transformControls);


        this.isDragging = false;
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
            this.isDragging = event.value;
        });

        // 变换更新时渲染
        this.transformControls.addEventListener('change', () => {
            this.renderer.render(scene, camera);
        });

        
    }
    onMouseClick = (event) => {
        event.preventDefault();

        // 如果正在拖动，忽略点击事件
        if (this.isDragging) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, camera);
        // 检测正方体和变换控件辅助对象


        const objects = [];
        this.scene.children.forEach(element => {
            if (!element.isTransformControlsRoot) objects.push(element);
        });

        const intersects = this.raycaster.intersectObjects(objects,true);//ture选择后代，false不选择后代

        

        if (intersects.length > 0&&this.transformControlsStatus) {
            let seleted = intersects[0].object
            this.selectedModel = seleted
            store.updateScene()
            this.transformControls.attach(seleted);
            // 点击了变换控件（transformHelper），保持当前状态，不detach
        } else {
            // 点击其他地方，取消变换控件
            this.transformControls.detach();
        }
        
    }
    setTransFormMode(mode){
        if(mode==='none'){
            this.transformControlsStatus = false
            this.transformControls.detach();
        }else{
            this.transformControlsStatus = true
            this.transformControls.setMode(mode)
            this.transMode = mode
        }
    }
    initViewHelper() {
        this.helper = new ViewHelper(camera, this.renderer.domElement);
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

    leftClick() {
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
            } else {

            }
        });
    }
    registerModule(name, moduleInstance) {
        this.modules.set(name, moduleInstance);
    }

    getModule(name) {
        return this.modules.get(name);
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    // 添加动画回调
    addAnimationCallback(callback) {
        this.animationCallbacks.add(callback);
    }

    // 移除动画回调
    removeAnimationCallback(callback) {
        this.animationCallbacks.delete(callback);
    }

    // 启动动画循环
    #startAnimation() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        const animateLoop = () => {
            
            const delta = this.clock.getDelta();
            this.scene.backgroundRotation.y += 0.0001
            this.animationFrameId = requestAnimationFrame(animateLoop);
            this.animationCallbacks.forEach(callback => callback());
            this.renderer.autoClear = false
            this.render();



            if (this.helper.animating) this.helper.update(delta);
            this.helper.render(this.renderer);
            
            TWEEN.update();

            
            this.controls.update()
            this.camera.updateProjectionMatrix()
        };
        animateLoop();
    }

    // 停止动画循环
    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.isAnimating = false;
        }
    }

    handleResize() {
        const { clientWidth, clientHeight } = this.container;
        this.camera.aspect = clientWidth / clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(clientWidth, clientHeight);
    }

    dispose() {
        window.removeEventListener('resize', this.handleResize.bind(this));
        this.stopAnimation(); // 停止动画
        this.modules.forEach(module => module.dispose?.());
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
    loadHrd(){
        new HRDManager(this.scene,'./assets/day2.hdr')
    }
    addAperture(position){
        let aperture = new Aperture({
            position:position,
            scale:3
        })
        this.addAnimationCallback(aperture.updateAnimate())
    }
    addMagicFormation(position){
        let magicFormation = new MagicFormation({
            position:position,
        })
        this.addAnimationCallback(magicFormation.updateCircle)
        this.addAnimationCallback(magicFormation.updateRing)
        this.addAnimationCallback(magicFormation.updatePartical)
    }
    addFire(position){
        let fire = new Fire({
            position:position,
            scale:3
        })
        this.addAnimationCallback(fire.updateAnimate())
    }
}


export default Meteor3D;