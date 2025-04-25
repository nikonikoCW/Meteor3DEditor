import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
export const border = (Object3D) => {

    const composer = new EffectComposer(renderer);
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
    outlinePass.pulsePeriod = 2;

    outlinePass.selectedObjects = [Object3D];
    composer.addPass(outlinePass);
}