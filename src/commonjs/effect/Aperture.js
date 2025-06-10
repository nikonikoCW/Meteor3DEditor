
import * as THREE from 'three';

class Aperture {
    constructor(config) {
        this.position = config.position
        this.scale = config.scale
        // 创建平面几何体
        this.geometry = new THREE.PlaneGeometry(2*this.scale, 2*this.scale);

        this.texture = new THREE.TextureLoader().load('/assets/images/effect/wave.png') 
        this.texture.wrapS = THREE.RepeatWrapping
        this.texture.wrapT = THREE.RepeatWrapping

        //改变扩散范围需要修改 uScale   vuv大小
        this.material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,            // 不写入深度缓冲
            depthTest: true,  
            blending: THREE.AdditiveBlending, // 添加混合模式让效果更亮
            uniforms: {
                uTime: { value: 0.0 },
                uScanTex: { value:this.texture },
                uScanColor: { value: new THREE.Color(0x00ffff) },    // 主要扫描颜色
                uScanColorDark: { value: new THREE.Color(0x0088ff) } ,// 暗部扫描颜色
                uScale: { value: this.scale} 
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                #define uScanOrigin vec3(0.0, 0.0, 0.0)
                #define uScanWaveRatio1 3.2
                #define uScanWaveRatio2 2.8
        
                uniform float uTime;
                uniform float uScale;
                uniform sampler2D uScanTex;
                uniform vec3 uScanColor;
                uniform vec3 uScanColorDark;
                
                varying vec2 vUv;
                varying vec3 vPosition;
        
                float circleWave(vec3 p, vec3 origin, float distRatio) {
                    float t = uTime;
                    float dist = distance(p, origin) * distRatio;
                    float radialMove = fract((dist - t));
                    float fadeOutMask = 1.0 - smoothstep(1.0, 3.0 * uScale, dist);
                    radialMove *= fadeOutMask;
                    float cutInitialMask = 1.0 - step(t, dist);
                    return radialMove * cutInitialMask;
                }
        
                vec3 getScanColor(vec3 worldPos, vec2 uv, vec3 col) {
                    // 纹理采样
                    float scanMask = texture2D(uScanTex, uv).r;
                    
                    // 波浪效果
                    float cw = circleWave(worldPos, uScanOrigin, uScanWaveRatio1);
                    float cw2 = circleWave(worldPos, uScanOrigin, uScanWaveRatio2);
                    
                    // 扫描遮罩
                    float mask1 = smoothstep(0.3, 0.0, 1.0 - cw);
                    mask1 *= (1.0 + scanMask * 0.7);
                    
                    float mask2 = smoothstep(0.07, 0.0, 1.0 - cw2) * 0.8;
                    mask1 += mask2;
                    
                    float mask3 = smoothstep(0.09, 0.0, 1.0 - cw) * 1.5;
                    mask1 += mask3;
        
                    // 颜色混合
                    vec3 scanCol = mix(uScanColorDark, uScanColor, mask1);
                    return scanCol * mask1; // 只返回扫描区域的颜色
                }
        
                void main() {
                    vec3 col = vec3(0.0);
                    col = getScanColor(vPosition, vUv * 10.0 * uScale, col);
                    
                    // 计算alpha通道
                    float alpha = length(col);  // 根据颜色强度计算透明度
                    
                    gl_FragColor = vec4(col, alpha);
                }
            `
        });
        this.addGeo()
    }
    addGeo() {
        const mesh = new THREE.Mesh(this.geometry, this.material);
        mesh.renderOrder = 999;
        mesh.rotation.x = Math.PI / 2
        mesh.position.copy(this.position)
        mesh.name = '蓝色光圈'
        scene.add(mesh);

    }
    updateAnimate() {
        let that = this
        return ()=>{
            that.material.uniforms.uTime.value += 0.01;
        }
    }
    
}

export default Aperture