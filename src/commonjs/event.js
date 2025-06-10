

import * as THREE from 'three';
// 创建射线投射器
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export const dbClick = (event) => {
        // 将鼠标坐标转换到 NDC（归一化设备坐标）
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // 使用射线投射器
        raycaster.params.Line.threshold = 0.1//调整精度
        raycaster.setFromCamera(mouse, camera);

        // 计算射线与场景中的物体的交点
        const intersects = raycaster.intersectObjects(scene.children);

        // 如果有交点
        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point; // 获取交点坐标
            console.log('Clicked at:', intersectPoint); // 输出交点坐标
        }
        return intersects
}