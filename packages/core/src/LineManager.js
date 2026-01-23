import * as THREE from 'three';

/**
 * 流动线管理器
 * 负责创建和管理带有流动纹理效果的 3D 线条
 */
export class LineManager {
    constructor(scene) {
        this.scene = scene;
        this.lines = new Map(); // 存储所有线条对象: id -> { mesh, material }
        this.textureLoader = new THREE.TextureLoader();
    }

    /**
     * 创建流动线
     * @param {Object} options - 配置选项
     * @param {string} [options.id] - 线条唯一标识，不传则自动生成
     * @param {Array} options.points - 路径点数组 [{x,y,z}, ...]
     * @param {string} options.textureUrl - 纹理图片 URL
     * @param {number} [options.width=2.0] - 线条宽度
     * @param {number} [options.radius=2.0] - 转角圆角半径
     * @param {number} [options.speed=1.5] - 流动速度
     * @param {number} [options.repeat=25.0] - 纹理重复次数
     * @returns {string} 线条 ID
     */
    createLine(options) {
        const {
            id = THREE.MathUtils.generateUUID(),
            points,
            textureUrl,
            width = 2.0,
            radius = 2.0,
            speed = 1.5,
            repeat = 25.0
        } = options;

        if (!points || points.length < 2) {
            console.warn('[LineManager] Points array must contain at least 2 points.');
            return null;
        }

        // 转换点数据为 THREE.Vector3
        const vectorPoints = points.map(p => {
            if (p.isVector3) return p;
            return new THREE.Vector3(p.x, p.y, p.z);
        });

        // 1. 生成圆角路径 (直接使用 demo 的算法)
        const roundedPath = this._createRoundedPath(vectorPoints, radius);

        // 2. 生成几何体 (直接使用 demo 的算法)
        const geometry = this._createGeometry(roundedPath, width);

        // 3. 创建材质 (直接使用 demo 的 shader)
        const texture = this.textureLoader.load(textureUrl);
        texture.wrapS = THREE.RepeatWrapping;

        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform sampler2D uTexture;
            uniform float uTime;
            uniform float uRepeat;
            uniform float uSpeed;
            varying vec2 vUv;

            void main() {
                // 核心：在 Shader 内部处理 UV 滚动
                // vUv.x 沿着路径方向，vUv.y 跨越宽度方向
                vec2 scr = vec2(vUv.x*uRepeat - uTime*uSpeed, vUv.y);
                
                vec4 color = texture2D(uTexture, scr);

                float factor = abs(sin(uTime*2.0));
                float breath = mix(0.5,1.0,factor);
                // 增强亮度（发光感）
                gl_FragColor = vec4(color.rgb, color.a);
            }
        `;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: { value: texture },
                uTime: { value: 0 },
                uSpeed: { value: speed },
                uRepeat: { value: repeat }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isFlowLine = true;
        mesh.userData.lineId = id;

        this.scene.add(mesh);
        this.lines.set(id, { mesh, material });

        return id;
    }

    /**
     * 移除线条
     * @param {string} id - 线条 ID
     */
    removeLine(id) {
        const line = this.lines.get(id);
        if (line) {
            this.scene.remove(line.mesh);
            line.mesh.geometry.dispose();
            line.material.dispose();
            if (line.material.uniforms.uTexture.value) {
                line.material.uniforms.uTexture.value.dispose();
            }
            this.lines.delete(id);
        }
    }

    /**
     * 清除所有线条
     */
    clear() {
        const ids = Array.from(this.lines.keys());
        ids.forEach(id => this.removeLine(id));
    }

    /**
     * 更新动画 (每帧调用)
     */
    update() {
        this.lines.forEach(({ material }) => {
            if (material.uniforms.uTime) {
                // 每一帧更新时间 uniform (与 demo 一致: += 0.02)
                material.uniforms.uTime.value += 0.02;
            }
        });
    }

    /**
     * 生成圆角路径 (直接从 demo 复制)
     * @private
     */
    _createRoundedPath(points, radius = 1.0) {
        const path = new THREE.CurvePath();
        const len = points.length;

        // 检查是否闭合（首尾点距离极小视为重合）
        const isClosed = points[0].distanceTo(points[len - 1]) < 0.001;

        // 实际需要处理的点集合
        // 如果闭合，我们在逻辑上需要参考最后一个点之前的点和第二个点
        for (let i = 0; i < (isClosed ? len - 1 : len - 1); i++) {
            const pCurrent = points[i];
            const pNext = points[i + 1];

            // 获取当前段的方向
            const dirCurrent = new THREE.Vector3().subVectors(pNext, pCurrent).normalize();

            // 确定这一段直线的起点
            let startPoint;
            if (isClosed || i > 0) {
                // 如果闭合或不是第一段，起点要为上一个圆角留出空间
                startPoint = pCurrent.clone().addScaledVector(dirCurrent, radius);
            } else {
                startPoint = pCurrent;
            }

            // 确定这一段直线的终点（即圆角的起点）
            let pAfterNext;

            if (i < len - 2) {
                pAfterNext = points[i + 2];
            } else if (isClosed) {
                pAfterNext = points[1]; // 闭合情况下，最后一段的下一个点是第二个点
            }

            if (pAfterNext) {
                const dirNext = new THREE.Vector3().subVectors(pAfterNext, pNext).normalize();
                const curveStart = pNext.clone().addScaledVector(dirCurrent, -radius);
                const curveEnd = pNext.clone().addScaledVector(dirNext, radius);

                // 添加直线段
                path.add(new THREE.LineCurve3(startPoint, curveStart));
                // 添加圆角弧线段
                path.add(new THREE.QuadraticBezierCurve3(curveStart, pNext, curveEnd));
            } else {
                // 非闭合路径的最后一段
                path.add(new THREE.LineCurve3(startPoint, pNext));
            }
        }

        return path;
    }

    /**
     * 生成带状几何体 (直接从 demo 复制)
     * @private
     */
    _createGeometry(roundedPath, width) {
        const segments = Math.max(300, Math.ceil(roundedPath.getLength() * 8)); // 细分数（按长度自适应）
        const points = roundedPath.getSpacedPoints(segments);

        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const uvs = [];
        const indices = [];

        const up = new THREE.Vector3(0, 1, 0);
        let prevSide = null;

        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const u = i / (points.length - 1);
            const tangent = roundedPath.getTangentAt(u).normalize();

            // 约束：带宽方向保持水平，线条只允许"上下坡"或"水平"
            const horizontal = tangent.clone();
            horizontal.y = 0;
            const horizontalLen = horizontal.length();

            let side;
            if (horizontalLen < 1e-3) {
                // 纯竖直段，保持上一帧的 side
                side = prevSide ? prevSide.clone() : new THREE.Vector3(1, 0, 0);
            } else {
                const targetSide = new THREE.Vector3().crossVectors(up, horizontal).normalize();
                if (prevSide) {
                    // 避免180度翻转
                    if (prevSide.dot(targetSide) < 0) targetSide.negate();
                    // 在接近竖直的过渡区做平滑，避免连接点扭曲
                    const blend = Math.min(1, horizontalLen / 0.3);
                    const blended = prevSide.clone().lerp(targetSide, blend).normalize();

                    // 限制每一步旋转角度，抑制连续翻转导致的扭曲
                    const dot = Math.max(-1, Math.min(1, prevSide.dot(blended)));
                    const angle = Math.acos(dot);
                    const maxAngle = Math.PI / 12; // 每步最大旋转角度
                    if (angle > maxAngle) {
                        side = prevSide.clone().applyAxisAngle(up, maxAngle).normalize();
                    } else {
                        side = blended;
                    }
                } else {
                    side = targetSide;
                }
            }
            prevSide = side.clone();

            // 计算左右顶点
            const left = new THREE.Vector3().copy(current).addScaledVector(side, width / 2);
            const right = new THREE.Vector3().copy(current).addScaledVector(side, -width / 2);

            vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);

            uvs.push(u, 0, u, 1);

            if (i < points.length - 1) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        return geometry;
    }
}
