import * as THREE from "three";

class MagicFormation {
    // 法阵高度
    height = 2;
    // 圆形底
    circle = [];
    circleRadius = 1;
    circleRotateSpeed = 0.02;
    // 两个旋转光环
    ring1 = [];
    ring2 = [];
    ringRadius = 0.5;
    ringScaleOffset = 0.01;
    ringRotateSpeed = 0.01;
    // 粒子
    particles = [];
    particlesMinSize = 0.04;
    particlesMaxSize = 0.15;
    particlesRangeRadius = 0.8;
    particlesFloatSpeed = 0.01;
    constructor(config) {
        this.position = config.position
        this.addAnimationCallback = config.addAnimationCallback
        const _url = `https://file.threehub.cn/` + 'threeExamples/application/magicCircle/';
        const point1Texture = new THREE.TextureLoader().load('/assets/images/effect/point1.png');
        const point2Texture = new THREE.TextureLoader().load('/assets/images/effect/point2.png');
        const point3Texture = new THREE.TextureLoader().load('/assets/images/effect/point3.png');
        const point4Texture = new THREE.TextureLoader().load('/assets/images/effect/point4.png');
        const magicTexture = new THREE.TextureLoader().load('/assets/images/effect/magic.png');
        const guangyunTexture = new THREE.TextureLoader().load('/assets/images/effect/guangyun.png');
        const pointTextures = [
            point1Texture,
            point2Texture,
            point3Texture,
            point4Texture,
        ];
        const { height, circleRadius, ringRadius, ringScaleOffset, particlesMaxSize, particlesMinSize, particlesRangeRadius } = this;
        const group = new THREE.Group();
        const circleGeo = new THREE.CircleGeometry(circleRadius, 64);
        const circleMat = new THREE.MeshBasicMaterial({
            map: magicTexture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const circle = new THREE.Mesh(circleGeo, circleMat);
        circle.rotateX(-Math.PI / 2);
        this.circle.push(circle);
        group.add(circle);
        const ringGeo = this.getCylinderGeo(ringRadius, height);
        const ringMat = new THREE.MeshBasicMaterial({
            map: guangyunTexture,
            transparent: true,
            side: THREE.DoubleSide,
            wireframe: false,
            depthWrite: false
        });
        const ring1 = new THREE.Mesh(ringGeo, ringMat);
        this.ring1.push(ring1);
        group.add(ring1);
        const ring2 = ring1.clone();
        ring2.userData.ringScaleOffset = ringScaleOffset;
        group.add(ring2);
        this.ring2.push(ring2);
        // 有几种粒子材质图片, 每种图片做一次点云
        for (let j = 0; j < 10; j++) {
            for (let i = 0; i < pointTextures.length; i++) {
                const particles = this.getParticles(particlesRangeRadius, height, pointTextures[i], particlesMinSize, particlesMaxSize, this.particlesFloatSpeed);
                this.particles.push(particles);
                group.add(particles);
            }
        }
        group.name='蓝色魔法阵'
        group.position.copy(this.position)
        scene.add(group);
    }
    getParticles(radius, height, texture, pointMinSize, pointMaxSize, pointFloatSpeed) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
        const material = new THREE.PointsMaterial({
            size: Math.random() * (pointMaxSize - pointMinSize) + pointMinSize,
            map: texture,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            opacity: 0.2 + Math.random() * 0.8
        });
        const particles = new THREE.Points(geometry, material);
        particles.userData.floatSpeed = 0.001 + Math.random() * pointFloatSpeed;
        particles.userData.radius = radius;
        particles.position.x = Math.random() * radius * 2 - radius;
        particles.position.y = Math.random() * height;
        particles.position.z = Math.random() * radius * 2 - radius;
        return particles;
    }
    /**
     * 自定义圆柱几何体, 只有圆柱侧面, 没有顶和底
     */
    getCylinderGeo(radius = 1, height = 1, segment = 64) {
        const bottomPos = [];
        const topPos = [];
        const bottomUvs = [];
        const topUvs = [];
        const angleOffset = (Math.PI * 2) / segment;
        const uvOffset = 1 / (segment - 1);
        for (let i = 0; i < segment; i++) {
            const x = Math.cos(angleOffset * i) * radius;
            const z = Math.sin(angleOffset * i) * radius;
            bottomPos.push(x, 0, z);
            topPos.push(x, height, z);
            bottomUvs.push(i * uvOffset, 0);
            topUvs.push(i * uvOffset, 1);
        }
        const positions = bottomPos.concat(topPos);
        const uvs = bottomUvs.concat(topUvs);
        const index = [];
        for (let i = 0; i < segment; i++) {
            if (i != segment - 1) {
                index.push(i + segment + 1, i, i + segment);
                index.push(i, i + segment + 1, i + 1);
            }
            else {
                index.push(segment, i, i + segment);
                index.push(i, segment, 0);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        geo.setIndex(new THREE.BufferAttribute(new Uint16Array(index), 1));
        return geo;
    }
    init() {
    }
    onRenderer() {
    }
    updateCircle =() => {
        let that = this
        for (let i = 0; i < that.circle.length; i++) {
            this.circle[i].rotateZ(that.circleRotateSpeed);
        }
    }
    updateRing=() =>{
        for (let i = 0; i < this.ring1.length; i++) {
            this.ring1[i].rotateY(this.ringRotateSpeed);
        }
        for (let i = 0; i < this.ring2.length; i++) {
            this.ring2[i].rotateY(-this.ringRotateSpeed);
            if (this.ring2[i].scale.x < 0.9 || this.ring2[i].scale.x > 1.4) {
                this.ring2[i].userData.ringScaleOffset *= -1;
            }
            this.ring2[i].scale.x -= this.ring2[i].userData.ringScaleOffset;
            this.ring2[i].scale.z -= this.ring2[i].userData.ringScaleOffset;
        }
    }
    updatePartical = () => {
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].position.y += this.particles[i].userData.floatSpeed;
            if (this.particles[i].position.y >= this.height) {
                this.particles[i].position.y = 0;
                this.particles[i].position.x = Math.random() * this.particles[i].userData.radius * 2 - this.particles[i].userData.radius;
                this.particles[i].position.z = Math.random() * this.particles[i].userData.radius * 2 - this.particles[i].userData.radius;
                this.particles[i].userData.floatSpeed = 0.001 + Math.random() * this.particlesFloatSpeed;
            }
        }
    }
}

export default MagicFormation