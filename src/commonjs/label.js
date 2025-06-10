
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject, CSS3DSprite } from 'three/addons/renderers/CSS3DRenderer.js';

// CSS3渲染的标签会跟着场景相机同步缩放，
// CSS2渲染的标签默认保持自身像素值。


//精灵模型渲染Sprite的标签，默认可以被其他网格模型遮挡，但是CSS3渲染器渲染的HTML元素标签是叠加在canvas画布上，不会被其它网格模型遮挡。
class Label {
    constructor(config) {
        this.css2Renderer = new CSS3DRenderer();
        this.position = config.position;
        this.name = config.name
    }
    addLabel() {
        const div = Object.assign(document.createElement('div'), {
            id: 'tag',
            style: 'background-color: red; pointer-events: none; font-size: 1px;',
            textContent: '标签内容'
        });
        // HTML元素转化为threejs的CSS2模型对象
        const tag = new CSS3DObject(div);
        tag.position.copy(this.position);

        tag.rotateY(90 / 180 * Math.PI);
        scene.add(tag);

        this.css2Renderer.render(scene, camera);
        this.css2Renderer.setSize(window.innerWidth, window.innerHeight);
        this.css2Renderer.domElement.style.position = 'absolute'; // 设置渲染器样式
        this.css2Renderer.domElement.style.top = '0px';
        this.css2Renderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(this.css2Renderer.domElement);

        meteor3D.addAnimationCallback(() => {
            this.css2Renderer.render(scene, camera)
        })
    }
    createSprite() {
        const texLoader = new THREE.TextureLoader();
        let texture = null;
        texture = texLoader.load("assets/images/警告.png");
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,            // 不写入深度缓冲
            depthTest: true,              // 可根据情况关闭
            blending: THREE.NormalBlending
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.renderOrder = 999;
        // 控制精灵大小
        sprite.position.copy(this.position);
        sprite.name = this.name
        // sprite.position.y = 5 / 2; //标签底部箭头和空对象标注点重合  
        scene.add(sprite);
    }

}

export default Label