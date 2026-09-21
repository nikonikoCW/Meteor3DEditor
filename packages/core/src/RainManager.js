/**
 * RainManager - 自然下雨效果管理器
 * 基于 InstancedMesh 实现的高性能下雨效果
 * 
 * @description 使用 GPU Instancing + 自定义 Shader 实现无限雨滴效果
 * 特性：广告牌、折射效果、无限循环
 * 支持参数：雨量、雨速
 */

import * as THREE from 'three';

export class RainManager {
    /**
     * @param {THREE.WebGLRenderer} renderer - Three.js 渲染器
     * @param {THREE.Scene} scene - Three.js 场景
     * @param {THREE.Camera} camera - Three.js 相机
     */
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.enabled = false;
        this.instancedMesh = null;
        this.rainMaterial = null;
        this.bgFBO = null;

        // 配置参数
        this.config = {
            count: 10000,       // 雨量 (粒子数量)
            speed: 2.0          // 雨速
        };

        // 常量配置
        this.MAX_INSTANCE_COUNT = 50000;  // 最大雨滴数量
        this.HEIGHT_RANGE = 20.0;         // 垂直高度范围
        this.BOX_RANGE = new THREE.Vector3(40, 20, 40);  // 包围盒范围

        this._init();
    }

    /**
     * 初始化雨滴系统
     * @private
     */
    _init() {
        // 创建背景 FBO (用于折射效果)
        const canvas = this.renderer.domElement;
        this.bgFBO = new THREE.WebGLRenderTarget(
            canvas.width * 0.1,
            canvas.height * 0.1
        );

        // 创建雨滴几何体 (平面)
        const geometry = new THREE.PlaneGeometry(1, 1);

        // 创建自定义 Shader 材质
        this.rainMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uSpeed: { value: this.config.speed },
                uHeightRange: { value: this.HEIGHT_RANGE },
                uBgRt: { value: null },
                uRefraction: { value: 0.05 },
                uBaseBrightness: { value: 0.8 },
                uCameraPos: { value: new THREE.Vector3() },
                uBoxRange: { value: this.BOX_RANGE }
            },
            vertexShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uHeightRange;
        uniform vec3 uCameraPos;
        uniform vec3 uBoxRange;
        
        attribute float aProgress;
        attribute float aSpeed;
        
        varying vec2 vUv;
        varying vec2 vScreenspace;
        
        vec3 billboard(vec3 v, mat4 view){
          vec3 up = vec3(view[0][1], view[1][1], view[2][1]);
          vec3 right = vec3(view[0][0], view[1][0], view[2][0]);
          vec3 pos = right * v.x + up * v.y;
          return pos;
        }
        
        vec2 screenspace(mat4 projectionmatrix, mat4 modelviewmatrix, vec3 position){
          vec4 temp = projectionmatrix * modelviewmatrix * vec4(position, 1.);
          temp.xyz /= temp.w;
          temp.xy = (.5) + (temp.xy) * .5;
          return temp.xy;
        }

        vec3 distort(vec3 p, vec3 instancePos){
          float x = mod(instancePos.x - uCameraPos.x, uBoxRange.x) - uBoxRange.x * 0.5 + uCameraPos.x;
          float z = mod(instancePos.z - uCameraPos.z, uBoxRange.z) - uBoxRange.z * 0.5 + uCameraPos.z;
          
          float timeOffset = uTime * aSpeed * 0.25 * uSpeed;
          float progress = aProgress + instancePos.y * 0.1; 
          
          float y = mod(progress - timeOffset, 1.0) * uHeightRange - (uHeightRange * 0.5);
          y += uCameraPos.y;
          
          return vec3(x, y, z);
        }
        
        void main() {
          vUv = uv;
          vec4 instanceMatrixPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec3 instancePos = instanceMatrixPos.xyz;
          
          vec3 centerPos = distort(vec3(0.), instancePos);
          
          vec3 scale = vec3(
            length(vec3(instanceMatrix[0][0], instanceMatrix[1][0], instanceMatrix[2][0])),
            length(vec3(instanceMatrix[0][1], instanceMatrix[1][1], instanceMatrix[2][1])),
            length(vec3(instanceMatrix[0][2], instanceMatrix[1][2], instanceMatrix[2][2]))
          );
          
          vec3 transformedPos = position * scale;
          vec3 billboardPos = billboard(transformedPos, viewMatrix);
          vec3 finalPos = centerPos + billboardPos;
          
          vec4 mvPosition = viewMatrix * vec4(finalPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          vScreenspace = screenspace(projectionMatrix, viewMatrix, finalPos);
        }
      `,
            fragmentShader: `
        uniform sampler2D uBgRt;
        uniform float uRefraction;
        uniform float uBaseBrightness;
        
        varying vec2 vUv;
        varying vec2 vScreenspace;
        
        void main() {
          vec2 p = vUv;
          
          float dX = abs(p.x - 0.5) * 2.0;
          float alphaX = smoothstep(1.0, 0.0, dX);
          
          float dY = abs(p.y - 0.5) * 2.0;
          float alphaY = smoothstep(1.0, 0.5, dY);
          
          float alpha = alphaX * alphaY;
          
          if (alpha < 0.05) discard;
          
          vec3 normal = vec3(0.0, 0.0, 1.0);
          normal.x = (p.x - 0.5) * 2.0;
          normal.z = 0.5;
          normal = normalize(normal);
          
          vec2 bgUv = vScreenspace + normal.xy * uRefraction;
          vec4 bgColor = texture2D(uBgRt, bgUv);
          
          float brightness = uBaseBrightness * pow(max(0.0, normal.z), 4.0);
          
          vec3 col = bgColor.rgb + vec3(brightness);
          col += vec3(0.0, 0.05, 0.1) * alpha;
          
          gl_FragColor = vec4(col, alpha);
        }
      `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        // 创建 InstancedMesh
        this.instancedMesh = new THREE.InstancedMesh(geometry, this.rainMaterial, this.MAX_INSTANCE_COUNT);
        this.instancedMesh.count = this.config.count;
        this.instancedMesh.frustumCulled = false;
        this.instancedMesh.visible = false; // 默认隐藏
        this.instancedMesh.name = '__rain_effect__';

        // 填充实例属性数据
        this._setupInstanceAttributes(geometry);

        // 添加到场景
        this.scene.add(this.instancedMesh);
    }

    /**
     * 设置实例属性数据
     * @private
     * @param {THREE.BufferGeometry} geometry - 雨滴几何体
     */
    _setupInstanceAttributes(geometry) {
        const dummy = new THREE.Object3D();
        const progressArr = new Float32Array(this.MAX_INSTANCE_COUNT);
        const speedArr = new Float32Array(this.MAX_INSTANCE_COUNT);

        for (let i = 0; i < this.MAX_INSTANCE_COUNT; i++) {
            // 随机初始位置
            dummy.position.set(
                THREE.MathUtils.randFloat(-20, 20),
                0,
                THREE.MathUtils.randFloat(-20, 20)
            );
            // 雨滴形状：细长
            const scaleY = THREE.MathUtils.randFloat(0.4, 0.8);
            dummy.scale.set(0.02, scaleY, 0.02);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, dummy.matrix);

            progressArr[i] = Math.random();
            speedArr[i] = scaleY * 15; // 速度与长度相关
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;

        // 添加实例属性
        geometry.setAttribute('aProgress', new THREE.InstancedBufferAttribute(progressArr, 1));
        geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speedArr, 1));
    }

    /**
     * 设置雨效开关
     * @param {boolean} enabled - 是否启用
     * @param {Object} [config] - 可选的初始配置
     */
    setEnabled(enabled, config) {
        this.enabled = enabled;
        this.instancedMesh.visible = enabled;

        if (config) {
            this.updateConfig(config);
        }

        console.log(`[RainManager] Rain effect ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * 更新雨效配置
     * @param {Object} config - 配置对象
     * @param {number} [config.count] - 雨量 (100-50000)
     * @param {number} [config.speed] - 速度 (0.0-10.0)
     */
    updateConfig(config) {
        if (config.count !== undefined) {
            this.config.count = Math.min(Math.floor(config.count), this.MAX_INSTANCE_COUNT);
            this.instancedMesh.count = this.config.count;
        }

        if (config.speed !== undefined) {
            this.config.speed = config.speed;
            this.rainMaterial.uniforms.uSpeed.value = config.speed;
        }

        console.log('[RainManager] Config updated:', this.config);
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
     * 渲染前调用 - 捕获背景 FBO
     * 需要在主渲染之前调用
     */
    preRender() {
        if (!this.enabled || !this.instancedMesh.visible) return;

        // 隐藏雨滴，渲染背景到 FBO
        this.instancedMesh.visible = false;

        this.renderer.setRenderTarget(this.bgFBO);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);

        // 恢复雨滴可见性
        this.instancedMesh.visible = true;
        this.rainMaterial.uniforms.uBgRt.value = this.bgFBO.texture;
    }

    /**
     * 更新函数 - 需要在动画循环中调用
     * @param {number} time - 时间 (毫秒)
     */
    update(time) {
        if (!this.enabled || !this.instancedMesh.visible) return;

        // 更新时间和相机位置
        this.rainMaterial.uniforms.uTime.value = time * 0.001;
        this.rainMaterial.uniforms.uCameraPos.value.copy(this.camera.position);
    }

    /**
     * 窗口大小调整
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    onResize(width, height) {
        if (this.bgFBO) {
            this.bgFBO.setSize(width * 0.1, height * 0.1);
        }
    }

    /**
     * 销毁资源
     */
    dispose() {
        if (this.instancedMesh) {
            this.scene.remove(this.instancedMesh);
            this.instancedMesh.geometry.dispose();
            this.rainMaterial.dispose();
            this.instancedMesh = null;
            this.rainMaterial = null;
        }
        if (this.bgFBO) {
            this.bgFBO.dispose();
            this.bgFBO = null;
        }
        console.log('[RainManager] Disposed');
    }
}
