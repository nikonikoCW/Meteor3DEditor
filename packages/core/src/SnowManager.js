/**
 * SnowManager - 体积雪效果管理器
 * 基于 InstancedMesh 实现的高性能下雪效果
 * 
 * @description 使用 GPU Instancing + 自定义 Shader 实现无限雪花效果
 * 支持参数：雪量、大小、速度、透明度、颜色
 */

import * as THREE from 'three';

export class SnowManager {
    /**
     * @param {THREE.Scene} scene - Three.js 场景
     * @param {THREE.Camera} camera - Three.js 相机
     */
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.enabled = false;
        this.instancedMesh = null;
        this.snowMaterial = null;

        // 配置参数
        this.config = {
            count: 10000,       // 雪量 (粒子数量)
            size: 1.0,          // 雪花大小缩放
            speed: 1.0,         // 下落速度缩放
            opacity: 0.8,       // 透明度
            color: '#ffffff'    // 颜色
        };

        // 常量配置
        this.MAX_INSTANCE_COUNT = 30000;  // 最大雪花数量
        this.HEIGHT = 50.0;               // 垂直高度范围
        this.RANGE = 100.0;               // 水平范围 (XZ)

        this._init();
    }

    /**
     * 初始化雪花系统
     * @private
     */
    _init() {
        // 创建雪花几何体 (平面)
        const snowGeometry = new THREE.PlaneGeometry(0.2, 0.2);

        // 创建自定义 Shader 材质
        this.snowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uHeight: { value: this.HEIGHT },
                uRange: { value: this.RANGE },
                uColor: { value: new THREE.Color(0xffffff) },
                uCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
                uSizeScale: { value: this.config.size },
                uSpeedScale: { value: this.config.speed },
                uOpacity: { value: this.config.opacity }
            },
            vertexShader: `
        uniform float uTime;
        uniform float uHeight;
        uniform float uRange;
        uniform vec3 uCameraPosition;
        uniform float uSizeScale;
        uniform float uSpeedScale;
        
        attribute float aSpeed;
        attribute float aSwayFreq;
        attribute float aSwayAmp;
        attribute vec3 aOffset;
        attribute float aScale;

        varying vec2 vUv;
        varying float vAlpha;

        void main() {
          vUv = uv;
          
          // 1. 计算基础位置 (相对于原点)
          vec3 pos = aOffset;
          
          // 2. 动态下落 (Y轴)
          float timeOffsetY = uTime * aSpeed * uSpeedScale;
          
          // 3. 环绕相机逻辑 (Infinite Snow)
          pos.x = mod(aOffset.x - uCameraPosition.x, uRange) - uRange * 0.5 + uCameraPosition.x;
          pos.z = mod(aOffset.z - uCameraPosition.z, uRange) - uRange * 0.5 + uCameraPosition.z;
          pos.y = mod(aOffset.y - timeOffsetY - uCameraPosition.y, uHeight) - uHeight * 0.5 + uCameraPosition.y;

          // 4. 计算水平摇摆
          pos.x += sin(uTime * aSwayFreq + aOffset.y) * aSwayAmp;
          pos.z += cos(uTime * aSwayFreq + aOffset.x) * aSwayAmp;

          // 5. 广告牌效果 (Billboarding)
          vec4 mvPosition = viewMatrix * modelMatrix * vec4(pos, 1.0);
          
          // 应用尺寸缩放
          mvPosition.xyz += position * aScale * uSizeScale;

          gl_Position = projectionMatrix * mvPosition;

          // 6. 边缘渐隐
          float fadeLimit = uRange * 0.45; 
          vAlpha = smoothstep(fadeLimit, fadeLimit * 0.8, abs(pos.x - uCameraPosition.x));
          vAlpha *= smoothstep(fadeLimit, fadeLimit * 0.8, abs(pos.z - uCameraPosition.z));
          
          float fadeHeight = uHeight * 0.45;
          vAlpha *= smoothstep(fadeHeight, fadeHeight * 0.8, abs(pos.y - uCameraPosition.y));
        }
      `,
            fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying float vAlpha;

        void main() {
          float dist = distance(vUv, vec2(0.5));
          float alpha = smoothstep(0.5, 0.3, dist);

          if (alpha < 0.01) discard;

          // 应用全局透明度 uOpacity
          gl_FragColor = vec4(uColor, alpha * vAlpha * uOpacity);
        }
      `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // 创建 InstancedMesh
        this.instancedMesh = new THREE.InstancedMesh(snowGeometry, this.snowMaterial, this.MAX_INSTANCE_COUNT);
        this.instancedMesh.count = this.config.count;
        this.instancedMesh.frustumCulled = false;
        this.instancedMesh.visible = false; // 默认隐藏
        this.instancedMesh.name = '__snow_effect__';

        // 填充实例属性数据
        this._setupInstanceAttributes(snowGeometry);

        // 添加到场景
        this.scene.add(this.instancedMesh);
    }

    /**
     * 设置实例属性数据
     * @private
     * @param {THREE.BufferGeometry} geometry - 雪花几何体
     */
    _setupInstanceAttributes(geometry) {
        const dummy = new THREE.Object3D();
        const aSpeed = new Float32Array(this.MAX_INSTANCE_COUNT);
        const aSwayFreq = new Float32Array(this.MAX_INSTANCE_COUNT);
        const aSwayAmp = new Float32Array(this.MAX_INSTANCE_COUNT);
        const aOffset = new Float32Array(this.MAX_INSTANCE_COUNT * 3);
        const aScale = new Float32Array(this.MAX_INSTANCE_COUNT);

        for (let i = 0; i < this.MAX_INSTANCE_COUNT; i++) {
            // 随机初始位置
            const x = (Math.random() - 0.5) * this.RANGE;
            const y = (Math.random() - 0.5) * this.HEIGHT;
            const z = (Math.random() - 0.5) * this.RANGE;

            aOffset[i * 3] = x;
            aOffset[i * 3 + 1] = y;
            aOffset[i * 3 + 2] = z;

            // 随机属性
            aSpeed[i] = 2.0 + Math.random() * 3.0;       // 下落速度
            aSwayFreq[i] = 1.0 + Math.random() * 2.0;   // 摇摆频率
            aSwayAmp[i] = 0.5 + Math.random() * 1.0;    // 摇摆幅度
            aScale[i] = 0.5 + Math.random() * 1.0;      // 大小

            // 设置实例矩阵
            dummy.position.set(0, 0, 0);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
        }

        // 添加实例属性
        geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(aSpeed, 1));
        geometry.setAttribute('aSwayFreq', new THREE.InstancedBufferAttribute(aSwayFreq, 1));
        geometry.setAttribute('aSwayAmp', new THREE.InstancedBufferAttribute(aSwayAmp, 1));
        geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(aOffset, 3));
        geometry.setAttribute('aScale', new THREE.InstancedBufferAttribute(aScale, 1));
    }

    /**
     * 设置雪效开关
     * @param {boolean} enabled - 是否启用
     * @param {Object} [config] - 可选的初始配置
     */
    setEnabled(enabled, config) {
        this.enabled = enabled;
        this.instancedMesh.visible = enabled;

        if (config) {
            this.updateConfig(config);
        }

        console.log(`[SnowManager] Snow effect ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * 更新雪效配置
     * @param {Object} config - 配置对象
     * @param {number} [config.count] - 雪量 (100-30000)
     * @param {number} [config.size] - 大小 (0.1-5.0)
     * @param {number} [config.speed] - 速度 (0.0-5.0)
     * @param {number} [config.opacity] - 透明度 (0.0-1.0)
     * @param {string} [config.color] - 颜色 (hex string)
     */
    updateConfig(config) {
        if (config.count !== undefined) {
            this.config.count = Math.min(Math.floor(config.count), this.MAX_INSTANCE_COUNT);
            this.instancedMesh.count = this.config.count;
        }

        if (config.size !== undefined) {
            this.config.size = config.size;
            this.snowMaterial.uniforms.uSizeScale.value = config.size;
        }

        if (config.speed !== undefined) {
            this.config.speed = config.speed;
            this.snowMaterial.uniforms.uSpeedScale.value = config.speed;
        }

        if (config.opacity !== undefined) {
            this.config.opacity = config.opacity;
            this.snowMaterial.uniforms.uOpacity.value = config.opacity;
        }

        if (config.color !== undefined) {
            this.config.color = config.color;
            this.snowMaterial.uniforms.uColor.value.set(config.color);
        }

        console.log('[SnowManager] Config updated:', this.config);
    }

    /**
     * 获取当前配置
     * @returns {Object} 当前配置
     */
    getConfig() {
        return {
            enabled: this.enabled,
            ...this.config
        };
    }

    /**
     * 更新函数 - 需要在动画循环中调用
     * @param {number} time - 时间 (毫秒)
     */
    update(time) {
        if (!this.enabled || !this.instancedMesh.visible) return;

        // 更新时间和相机位置
        this.snowMaterial.uniforms.uTime.value = time * 0.001;
        this.snowMaterial.uniforms.uCameraPosition.value.copy(this.camera.position);
    }

    /**
     * 销毁资源
     */
    dispose() {
        if (this.instancedMesh) {
            this.scene.remove(this.instancedMesh);
            this.instancedMesh.geometry.dispose();
            this.snowMaterial.dispose();
            this.instancedMesh = null;
            this.snowMaterial = null;
        }
        console.log('[SnowManager] Disposed');
    }
}
