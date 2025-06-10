import TWEEN from '@tweenjs/tween.js';
import * as THREE from 'three';

export function flyto(val) {
    // 创建平滑过渡动画
    new TWEEN.Tween(camera.position)
        .to({
            x: val.position.x,
            y: val.position.y,
            z: val.position.z
        }, 500) // 过渡时间 1000 毫秒
        .easing(TWEEN.Easing.Quadratic.Out) // 
        .start();

    new TWEEN.Tween(controls.target)
        .to({
            x: val.target.x,
            y: val.target.y,
            z: val.target.z
        }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)

        .start();

    console.log('相机状态已恢复:');

    controls.update()
    camera.updateProjectionMatrix()

}

export function getView() {
    let camera = {
        position: window.camera.position.clone(),
        target: window.controls.target.clone()
    };
    console.log(camera);

}




export function focusOnObject(camera, model, ratio = 0.5,animation=1000) {
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // 计算最大的维度
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);

    // 计算距离，使得最大维度占屏幕高度的ratio比例
    const distance = (maxDim * 0.5) / Math.tan(fov * 0.5) / ratio;
    // 默认看向Z轴负方向
    const direction = new THREE.Vector3(0, 0, 1).normalize();
    let position = new THREE.Vector3().copy(center).addScaledVector(direction, distance);
    new TWEEN.Tween(window.camera.position)
        .to({
            x: position.x,
            y: position.y,
            z: position.z
        }, animation) // 过渡时间 1000 毫秒
        .easing(TWEEN.Easing.Quadratic.Out) // 
        .start();

    new TWEEN.Tween(window.controls.target)
        .to({
            x: center.x,
            y: center.y,
            z: center.z
        }, animation)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();


}