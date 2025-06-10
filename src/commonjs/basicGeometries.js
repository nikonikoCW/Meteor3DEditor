/*
 * @Author: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @Date: 2025-04-10 16:07:56
 * @LastEditors: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @LastEditTime: 2025-05-29 09:24:34
 * @FilePath: \nico\src\commonjs\basicGeometries.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

export const addPoint = (position) => {
    // 创建一个球体并应用材质
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 1 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name='球体'
    scene.add(sphere);
    sphere.position.copy(position)
    return sphere.uuid
}

export const addCone = (position) => {
    // 创建一个球体并应用材质
    let geometry = new THREE.ConeGeometry(0.5, 2, 16, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 1 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name='圆锥'
    scene.add(sphere);
    sphere.position.copy(position)
    return sphere.uuid
}

export const addLand = (position) => {
    // 创建蓝色网格
    const geometry = new THREE.PlaneGeometry(4000, 4000);
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, color: 0x0000ff, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);
    plane.name='平面'
    scene.add(plane);
    plane.position.copy(position)
    plane.rotation.x = Math.PI / 2
    return plane.uuid
}
export function addModels(path,position,scale=1) {
    return new Promise((resolve, reject) => {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('draco/gltf/');
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load(path, res => {
            const gltfScene = res.scene;
            gltfScene.scale.set(scale,scale,scale)
            const box = new THREE.Box3().setFromObject(gltfScene);
            //盒子中心
            const center = box.getCenter(new THREE.Vector3());
            //盒子底部中心
            center.y = box.min.y;
            
            gltfScene.position.sub(center).add(position);
            scene.add(gltfScene)
            resolve(gltfScene.uuid); // 使用 Promise resolve

        },
        undefined,
        error => {
            reject(error); // 处理加载错误
        }
        )
    })
}

