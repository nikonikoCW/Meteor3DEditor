import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

// TODO: 用户请在此处填入 beeNoise.png 的 Base64 字符串

export class ScanEffect extends BaseEffect {
    constructor(manager, config) {
        super(manager, config);
        this.type = 'scan';
        this.init();
    }

    init() {
        const {
            position = { x: 0, y: 0, z: 0 },
            scale = 1,
            color = '#ff3300',
            repeat = 3.0
        } = this.config;

        // 纹理加载
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('http://localhost:3003/assets/beeNoise.png');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);

        // 几何体
        const geometry = new THREE.CircleGeometry(10, 32);

        // 顶点着色器
        const vertexShader = `
            #include <common>
            #include <logdepthbuf_pars_vertex>

            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                #include <logdepthbuf_vertex>
            }
        `;

        // 片元着色器
        const fragmentShader = `
            #include <logdepthbuf_pars_fragment>

            uniform sampler2D uTexture;
            uniform float uRepeat;
            uniform float uTime;
            uniform vec3 uColor;
            varying vec2 vUv;

            void main() {
                #include <logdepthbuf_fragment>

                vec2 center = vec2(0.5, 0.5);
                float dist = distance(vUv, center);
                
                // 动画半径
                float radius = fract(uTime * 0.5) * 0.6;
                
                float ringWidth = 0.08;
                
                // 圆环计算
                float outer = 1.0 - smoothstep(radius - 0.01, radius, dist);
                float inner = 1.0 - smoothstep(radius - ringWidth - 0.01, radius - ringWidth, dist);
                float ringShape = outer - inner;
                
                // 渐变
                float gradient = (dist - (radius - ringWidth)) / ringWidth;
                gradient = clamp(gradient, 0.0, 1.0);
                
                vec3 finalColor = uColor * ringShape;
                
                vec2 repeatedUv = vUv * uRepeat;
                vec4 noise = texture2D(uTexture, repeatedUv);
                
                // 最终颜色混合
                gl_FragColor = vec4(finalColor, gradient * ringShape * noise.r);
            }
        `;


        // 材质
        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            uniforms: {
                uTexture: { value: texture },
                uRepeat: { value: repeat },
                uTime: { value: 0.0 },
                uColor: { value: new THREE.Color(color) }
            },
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Mesh(geometry, material);

        // 初始变换
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(position.x, position.y, position.z);
        this.mesh.scale.setScalar(scale);
    }

    update(dt, time) {
        if (this.mesh && this.mesh.material.uniforms) {
            this.mesh.material.uniforms.uTime.value = time;
        }
    }

    setParams(params) {
        if (!this.mesh) return;
        const uniforms = this.mesh.material.uniforms;

        if (params.color) uniforms.uColor.value.set(params.color);
        if (params.repeat !== undefined) uniforms.uRepeat.value = params.repeat;

        if (params.position) {
            this.mesh.position.set(params.position.x, params.position.y, params.position.z);
        }
        if (params.scale !== undefined) {
            this.mesh.scale.setScalar(params.scale);
        }
    }
}
