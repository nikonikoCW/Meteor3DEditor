/*
 * @Author: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @Date: 2025-04-10 17:38:30
 * @LastEditors: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @LastEditTime: 2025-04-21 14:43:38
 * @FilePath: \nico\src\commonjs\initScene.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';


export const initScene = (dom) => {
    const scene = new THREE.Scene();
    window.scene = scene
    let clock = new THREE.Clock();

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(311.03264809072385, 98.96320277581572, 14.490559617396444);
    window.camera = camera

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer();
    window.renderer = renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById(dom).appendChild(renderer.domElement);
    // document.body.appendChild(renderer.domElement);
    // renderer.domElement.id = 'dragCanvas'

    const light = new THREE.AmbientLight(0xffffff);
    scene.add(light);


    // 鼠标控制相机
    const controls = new OrbitControls(camera, renderer.domElement);
    window.controls = controls

    
    let helper = new ViewHelper( camera, window.renderer.domElement );
    helper.controls = controls;
    helper.controls.center = controls.target;

    const div = document.createElement( 'div' );
    div.id = 'viewHelper';
    div.style.position = 'absolute';
    div.style.right = 0;
    div.style.bottom = 0;
    div.style.height = '128px';
    div.style.width = '128px';
    
    document.body.appendChild( div );
    
    div.addEventListener( 'pointerup', (event) => {
        helper.handleClick( event ) 
    });

    // 渲染场景
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        if ( helper.animating ) helper.update( delta );
        // controls.update();
        renderer.autoClear = false
        renderer.render(scene, camera);
        helper.render(renderer);
        renderer.autoClear = true
        scene.backgroundRotation.y += 0.0001
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

export const initViewHelper = () => {


}