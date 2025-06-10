import * as THREE from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const border = (composer) => {

    
        // 创建立方体 A (红色)
        const geometryA = new THREE.BoxGeometry(50, 50, 50);
        const materialA = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cubeA = new THREE.Mesh(geometryA, materialA);
        cubeA.position.set(-2, 0, 0);
        scene.add(cubeA);

        // const composer = new EffectComposer(renderer);

        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        // OutlinePass第一个参数v2的尺寸和canvas画布保持一致
        const v2 = new THREE.Vector2(window.innerWidth, window.innerHeight);
        // const v2 = new THREE.Vector2(800, 600);
        const outlinePass = new OutlinePass(v2, scene, camera);

        //模型描边颜色，默认白色         
        outlinePass.visibleEdgeColor.set(0xffff00);
        //高亮发光描边厚度
        outlinePass.edgeThickness = 4;
        //高亮描边发光强度
        outlinePass.edgeStrength = 6;
        //模型闪烁频率控制，默认0不闪烁
        outlinePass.pulsePeriod = 0;

        let a = new THREE.Group()
        a.add(cubeA)
        // window.scene.add(a)
        outlinePass.selectedObjects = [a];
        composer.addPass(outlinePass);

        const outputPass = new OutputPass();
        composer.addPass(outputPass);
}