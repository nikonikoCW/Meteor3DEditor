import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class FireEffect extends BaseEffect {
    constructor(config = {}) {
        super(config);
        this.type = 'fire';
        this.particles = [];
        this.elapsedTime = 0;
        const requestedMaxParticles = Number(config.maxParticles ?? 256);
        this.maxParticles = Number.isFinite(requestedMaxParticles)
            ? Math.max(1, Math.floor(requestedMaxParticles))
            : 256;
        const wind = config.wind || { x: 0.002, y: 0, z: 0 };
        this.wind = new THREE.Vector3(wind.x ?? 0.002, wind.y ?? 0, wind.z ?? 0);
        this._cameraPosition = new THREE.Vector3();
        this._particleWorldPosition = new THREE.Vector3();

        // 原 Demo 的火焰发射参数，只把 position 改到世界原点。
        this.emitter = {
            position: { x: 0, y: 0, z: 0 },
            radius_1: 0.02,
            radius_2: 1,
            radius_height: 5,
            add_time: 0.1,
            elapsed: 0,
            live_time_from: 7,
            live_time_to: 7.5,
            opacity_decrease: 0.008,
            rotation_from: 0.5,
            rotation_to: 1,
            speed_from: 0.005,
            speed_to: 0.01,
            scale_from: 0.2,
            scale_increase: 0.004,
            color_from: [2, 2, 2],
            color_to: [0, 0, 0],
            color_speed_from: 0.4,
            color_speed_to: 0.4,
            brightness_from: 1,
            brightness_to: 1,
            opacity: 1,
            blend: 0.8,
            ...config.emitter
        };
        this.init();
    }

    init() {
        const {
            position = { x: 0, y: 0, z: 0 }
        } = this.config;
        // 原 Demo 使用的火焰 PNG，内嵌后页面不依赖额外资源。
        const fireTexture = new THREE.TextureLoader().load("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIyLTAxLTI2VDEyOjMzOjQyKzAzOjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMi0wMi0wNlQxNjoxMjoyOCswMzowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMi0wMi0wNlQxNjoxMjoyOCswMzowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ZjliNDEzZTUtOTUyNy0yMjQxLTgwZjktMDBkYjM5Y2NjOGYyIiB4bXBNTTpEb2N1bWVudElE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");

        fireTexture.colorSpace = THREE.SRGBColorSpace;

        const vertexShader = `
            #include <common>
            #include <logdepthbuf_pars_vertex>

            attribute vec3 offset;
            attribute vec2 scale;
            attribute float rotation;
            attribute vec4 color;
            attribute float blend;

            uniform float time;

            varying vec2 vUv;
            varying vec4 vColor;
            varying float vBlend;

            void main() {
                float angle = time * rotation;
                vec3 vRotated = vec3(
                    position.x * scale.x * cos(angle) - position.y * scale.y * sin(angle),
                    position.y * scale.y * cos(angle) + position.x * scale.x * sin(angle),
                    position.z
                );

                vUv = uv;
                vColor = color;
                vBlend = blend;

                // 在世界空间构造圆柱公告板。offset 是网格局部坐标，必须先
                // 经过 modelMatrix；否则特效移动后会错误地朝向相机。
                vec3 worldCenter = (modelMatrix * vec4(offset, 1.0)).xyz;
                vec3 worldUp = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
                vec3 worldRight = cross(worldCenter - cameraPosition, worldUp);
                float rightLength = length(worldRight);
                if (rightLength < 0.0001) {
                    worldRight = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
                } else {
                    worldRight /= rightLength;
                }

                float modelScaleX = length(modelMatrix[0].xyz);
                float modelScaleY = length(modelMatrix[1].xyz);
                vec3 worldPosition = worldCenter
                    + worldRight * vRotated.x * modelScaleX
                    + worldUp * vRotated.y * modelScaleY;
                vec4 mvPosition = viewMatrix * vec4(worldPosition, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                #include <logdepthbuf_vertex>
            }
        `;

        const fragmentShader = `
            #include <logdepthbuf_pars_fragment>

            uniform sampler2D map;
            uniform vec3 uColor;

            varying vec2 vUv;
            varying vec4 vColor;
            varying float vBlend;

            void main() {
                #include <logdepthbuf_fragment>

                vec4 texel = texture2D(map, vUv);
                float alpha = texel.a * vColor.a * vBlend;
                if (alpha < 0.001) discard;

                // CustomBlending 使用预乘 alpha，颜色和透明度必须乘同一个 alpha。
                gl_FragColor = vec4(texel.rgb * vColor.rgb * uColor * alpha, alpha);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `;

        const geometry = new THREE.InstancedBufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute([
                -0.5, 0.5, 0,
                -0.5, -0.5, 0,
                0.5, 0.5, 0,
                0.5, -0.5, 0,
                0.5, 0.5, 0,
                -0.5, -0.5, 0
            ], 3)
        );
        geometry.setAttribute(
            "uv",
            new THREE.Float32BufferAttribute([
                0, 1,
                0, 0,
                1, 1,
                1, 0,
                1, 1,
                0, 0
            ], 2)
        );

        this.instanceArrays = {
            offsets: new Float32Array(this.maxParticles * 3),
            scales: new Float32Array(this.maxParticles * 2),
            rotations: new Float32Array(this.maxParticles),
            colors: new Float32Array(this.maxParticles * 4),
            blends: new Float32Array(this.maxParticles)
        };
        geometry.setAttribute("offset", new THREE.InstancedBufferAttribute(this.instanceArrays.offsets, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute("scale", new THREE.InstancedBufferAttribute(this.instanceArrays.scales, 2).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute("rotation", new THREE.InstancedBufferAttribute(this.instanceArrays.rotations, 1).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute("color", new THREE.InstancedBufferAttribute(this.instanceArrays.colors, 4).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute("blend", new THREE.InstancedBufferAttribute(this.instanceArrays.blends, 1).setUsage(THREE.DynamicDrawUsage));
        geometry.instanceCount = 0;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: fireTexture },
                time: { value: 0 },
                uColor: { value: new THREE.Color(this.config.color ?? '#ffffff') }
            },
            vertexShader,
            fragmentShader,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, position.y, position.z);
        this.mesh.scale.setScalar(this.config.scale ?? 1);
        this.mesh.frustumCulled = false;
        this.texture = fireTexture;
        this.geometry = geometry;
    }
    randomBetween(from, to) {
        return Math.random() * (to - from) + from;
    }

    /**
         * 根据 this.emitter 配置创建一个火焰粒子并加入 this.particles 数组。
         * 粒子的出生点位于发射器底部的小圆面内，运动方向指向上方
         * 的随机目标圆面，从而形成向上升腾并向四周轻微扩散的效果。
         */
    emitParticle() {
        if (this.particles.length >= this.maxParticles) return;
        const radius1 = this.emitter.radius_1 * Math.sqrt(Math.random());
        const theta1 = Math.PI * 2 * Math.random();
        const x1 = this.emitter.position.x + radius1 * Math.cos(theta1);
        const z1 = this.emitter.position.z + radius1 * Math.sin(theta1);

        const radius2 = this.emitter.radius_2 * Math.sqrt(Math.random());
        const theta2 = Math.PI * 2 * Math.random();
        const x2 = x1 + radius2 * Math.cos(theta2);
        const z2 = z1 + radius2 * Math.sin(theta2);

        const velocity = new THREE.Vector3(
            x2 - x1,
            this.emitter.radius_height,
            z2 - z1
        );
        velocity.normalize().multiplyScalar(
            this.randomBetween(this.emitter.speed_from, this.emitter.speed_to)
        );

        const brightness = this.randomBetween(
            this.emitter.brightness_from,
            this.emitter.brightness_to
        );

        this.particles.push({
            offset: [x1, this.emitter.position.y, z1],
            scale: [this.emitter.scale_from, this.emitter.scale_from],
            velocity: [velocity.x, velocity.y, velocity.z],
            rotation: this.randomBetween(this.emitter.rotation_from, this.emitter.rotation_to),
            color: [1, 1, 1, this.emitter.opacity],
            blend: this.emitter.blend,
            live: this.randomBetween(this.emitter.live_time_from, this.emitter.live_time_to),
            scale_increase: this.emitter.scale_increase,
            opacity_decrease: this.emitter.opacity_decrease,
            color_from: this.emitter.color_from.map(value => value * brightness),
            color_to: this.emitter.color_to.map(value => value * brightness),
            color_speed: this.randomBetween(
                this.emitter.color_speed_from,
                this.emitter.color_speed_to
            ),
            color_progress: 0
        });
    }

    /**
     * 根据帧间隔累计发射时间，并按固定频率产生新粒子。
     * @param {number} delta 当前帧与上一帧之间的秒数。
     */
    updateEmitter(delta) {
        const emissionInterval = Math.max(Number(this.emitter.add_time) || 0.1, 1 / 240);
        this.emitter.elapsed += delta;
        let addCount = Math.floor(this.emitter.elapsed / emissionInterval);
        this.emitter.elapsed -= addCount * emissionInterval;

        // 切回页面时不一次性补发过多粒子。
        if (addCount > 10) {
            this.emitter.elapsed = 0;
            addCount = 0;
        }

        while (addCount-- > 0) {
            this.emitParticle();
        }
    }

    /**
     * 更新全部存活粒子的颜色、位置、尺寸、寿命和透明度。
     * 粒子先由亮色渐变为黑色，形成“下方火焰、上方黑烟”；
     * 寿命结束后逐帧淡出，并从 this.particles 数组中删除。
     * @param {number} delta 当前帧与上一帧之间的秒数。
     */
    updateParticles(delta) {
        this.updateEmitter(delta);

        // 原代码的移动、放大和淡出值是“每帧量”；frameScale 保持
        // 60 FPS 时的原效果，同时避免刷新率改变动画速度。
        const frameScale = Math.min(delta * 60, 3);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            if (particle.color_progress < 1) {
                const progress = particle.color_progress;
                particle.color[0] = THREE.MathUtils.lerp(
                    particle.color_from[0],
                    particle.color_to[0],
                    progress
                );
                particle.color[1] = THREE.MathUtils.lerp(
                    particle.color_from[1],
                    particle.color_to[1],
                    progress
                );
                particle.color[2] = THREE.MathUtils.lerp(
                    particle.color_from[2],
                    particle.color_to[2],
                    progress
                );
                particle.color_progress += delta * particle.color_speed;
            } else {
                particle.color[0] = particle.color_to[0];
                particle.color[1] = particle.color_to[1];
                particle.color[2] = particle.color_to[2];
            }

            particle.offset[0] += (particle.velocity[0] + this.wind.x) * frameScale;
            particle.offset[1] += (particle.velocity[1] + this.wind.y) * frameScale;
            particle.offset[2] += (particle.velocity[2] + this.wind.z) * frameScale;
            particle.scale[0] += particle.scale_increase * frameScale;
            particle.scale[1] += particle.scale_increase * frameScale;

            if (particle.live > 0) {
                particle.live -= delta;
            } else {
                particle.color[3] -= particle.opacity_decrease * frameScale;
            }

            if (particle.color[3] <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 将粒子按到相机的距离从远到近排序，再把每个粒子的实例属性
     * 写入 GPU 缓冲区。透明粒子需要后画近处、先画远处，以减少
     * 前后叠加顺序错误。
     */
    uploadParticles() {
        const sortedParticles = this.particles;
        if (this.camera && this.mesh) {
            this.camera.getWorldPosition(this._cameraPosition);
            this.mesh.updateWorldMatrix(true, false);
            for (const particle of sortedParticles) {
                this._particleWorldPosition.set(...particle.offset).applyMatrix4(this.mesh.matrixWorld);
                particle.cameraDistance = this._cameraPosition.distanceToSquared(this._particleWorldPosition);
            }
            sortedParticles.sort((a, b) => b.cameraDistance - a.cameraDistance);
        }

        const count = sortedParticles.length;
        const { offsets, scales, rotations, colors, blends } = this.instanceArrays;

        for (let i = 0; i < count; i++) {
            const particle = sortedParticles[i];
            offsets.set(particle.offset, i * 3);
            scales.set(particle.scale, i * 2);
            rotations[i] = particle.rotation;
            colors.set(particle.color, i * 4);
            blends[i] = particle.blend;
        }

        for (const name of ['offset', 'scale', 'rotation', 'color', 'blend']) {
            this.geometry.getAttribute(name).needsUpdate = true;
        }
        this.geometry.instanceCount = count;
    }


    update(dt, time) {
        if (!this.mesh || !Number.isFinite(dt)) return;
        const delta = THREE.MathUtils.clamp(dt, 0, 0.1);
        this.elapsedTime += delta;
        this.updateParticles(delta);
        this.uploadParticles();
        this.mesh.material.uniforms.time.value = this.elapsedTime;
    }

    setParams(params) {
        if (!this.mesh) return;
        const uniforms = this.mesh.material.uniforms;

        if (params.color) uniforms.uColor.value.set(params.color);
        if (params.wind) {
            this.wind.set(params.wind.x ?? this.wind.x, params.wind.y ?? this.wind.y, params.wind.z ?? this.wind.z);
        }
        if (params.emitter) Object.assign(this.emitter, params.emitter);

        if (params.position) {
            this.mesh.position.set(params.position.x, params.position.y, params.position.z);
        }
        if (params.scale !== undefined) {
            this.mesh.scale.setScalar(params.scale);
        }
    }

    dispose() {
        this.particles.length = 0;
        this.texture?.dispose();
        this.texture = null;
        this.instanceArrays = null;
        super.dispose();
    }
}
