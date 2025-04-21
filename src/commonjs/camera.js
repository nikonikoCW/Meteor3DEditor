import TWEEN from '@tweenjs/tween.js';
import * as THREE from 'three';

export function flyto (val) {
    // 创建平滑过渡动画
    new TWEEN.Tween(window.camera.position)
        .to({
            x: val.position.x,
            y: val.position.y,
            z: val.position.z
        }, 500) // 过渡时间 1000 毫秒
        .easing(TWEEN.Easing.Quadratic.Out) // 
        .start();

    new TWEEN.Tween(window.controls.target)
        .to({
            x: val.target.x,
            y: val.target.y,
            z: val.target.z
        }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        
        .start();

    console.log('相机状态已恢复:');
    
}

export function getView () {
    let camera = {
        position: window.camera.position.clone(),
        target: window.controls.target.clone() 
    };
    console.log(camera);
    
}

export function focusOnObject(object3D, camera=window.camera, distance = 5) {
    // 获取模型的位置
    const targetPosition = object3D.getWorldPosition(new THREE.Vector3());
    
    // 计算摄像机的新位置，保持一定距离
    const direction = new THREE.Vector3().subVectors(camera.position, targetPosition).normalize();
    const newCameraPosition = targetPosition.clone().add(direction.multiplyScalar(distance));
    
    // 更新相机的位置和朝向
    camera.position.copy(newCameraPosition);
    camera.lookAt(targetPosition);
}