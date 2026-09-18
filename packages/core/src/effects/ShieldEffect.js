import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';
import defaultNoiseTextureUrl from '../assets/noise.jpg';

export class ShieldEffect extends BaseEffect {
    constructor(config) {
        super(config);
        this.init();
    }

    init() {
        const {
            position = { x: 0, y: 0, z: 0 },
            scale = 1,
            color = '#00aa00',
            rimColor = '#00ff00',
            textureUrl = defaultNoiseTextureUrl
        } = this.config;

        const textureLoader = new THREE.TextureLoader();
        const noiseTexture = textureLoader.load(textureUrl);

        noiseTexture.wrapS = THREE.RepeatWrapping;
        noiseTexture.wrapT = THREE.RepeatWrapping;

        // 2. Shader 定义
        const vertexShader = `
            #include <common>
            #include <logdepthbuf_pars_vertex>

            uniform float uTime;
            uniform sampler2D uTexture;
            uniform float uDisplacementStrength;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);

                // 顶点置换计算
                vec2 displacementUv = uv;
                displacementUv.x += uTime * 0.1;
                displacementUv.y += uTime * 0.1;
                vec4 noise = texture2D(uTexture, displacementUv);
                
                // 沿着法线方向偏移顶点
                vec3 displacedPosition = position + normal * noise.r * uDisplacementStrength;

                vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;

                #include <logdepthbuf_vertex>
            }
        `;

        const fragmentShader = `
            #include <logdepthbuf_pars_fragment>

            uniform float uTime;
            uniform sampler2D uTexture;
            
            uniform vec3 uShieldColor;
            uniform vec3 uRimColor;
            uniform float uFresnelPower;

            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            void main() {
                #include <logdepthbuf_fragment>

                // 1. 基础噪波动画
                vec2 uv = vUv;
                uv.x += uTime * 0.1;
                uv.y += uTime * 0.1; 
                vec4 noise = texture2D(uTexture, uv);

                // 2. 菲涅尔效果计算 (Fresnel)
                vec3 viewDir = normalize(vViewPosition);
                vec3 normal = normalize(vNormal);
                // dot(viewDir, normal) 计算视线和法线的夹角余弦值
                // 1.0 - dot(...) 使得边缘值接近 1，中心接近 0
                float fresnelTerm = dot(viewDir, normal);
                fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, 1.0);
                float fresnel = pow(fresnelTerm, uFresnelPower);

                // 3. 混合颜色
                // 基础颜色 + 边缘发光
                vec3 finalColor = mix(uShieldColor, uRimColor, fresnel);
                
                // 4. 透明度控制
                // 边缘更不透明，中心更透明，并叠加噪波纹理
                float alpha = fresnel * 1.5 + noise.r * 0.3; 

                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        // 3. 创建材质
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uTexture: { value: noiseTexture },
                uShieldColor: { value: new THREE.Color(color) },
                uRimColor: { value: new THREE.Color(rimColor) },
                uFresnelPower: { value: 2.0 },
                uDisplacementStrength: { value: 0.0 } // 默认关闭置换，可通过参数开启
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            depthTest: true,
            depthWrite: false,
            transparent: true,
            blending: THREE.AdditiveBlending,
        });

        // 4. 创建网格
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        this.mesh = new THREE.Mesh(geometry, material);

        // 5. 应用初始变换
        this.mesh.position.set(position.x, position.y, position.z);
        this.mesh.scale.set(scale, scale, scale);
    }

    update(dt, time) {
        if (this.mesh && this.mesh.material.uniforms) {
            this.mesh.material.uniforms.uTime.value = time;
        }
    }

    setParams(params) {
        if (!this.mesh) return;
        const uniforms = this.mesh.material.uniforms;

        if (params.color) uniforms.uShieldColor.value.set(params.color);
        if (params.rimColor) uniforms.uRimColor.value.set(params.rimColor);
        if (params.fresnelPower !== undefined) uniforms.uFresnelPower.value = params.fresnelPower;
        if (params.displacementStrength !== undefined) uniforms.uDisplacementStrength.value = params.displacementStrength;

        if (params.position) {
            this.mesh.position.set(params.position.x, params.position.y, params.position.z);
        }
        if (params.scale) {
            this.mesh.scale.set(params.scale, params.scale, params.scale);
        }
    }
}
