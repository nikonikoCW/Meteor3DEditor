import * as THREE from 'three';

export const LIGHTING_CONTROLS = [
    { key: 'ambient', label: '环境光', min: 0, max: 5, step: 0.1 },
    { key: 'hemisphere', label: '半球光', min: 0, max: 5, step: 0.1 },
    { key: 'key', label: '主光强度', min: 0, max: 10, step: 0.1 },
    { key: 'fill', label: '背侧补光', min: 0, max: 10, step: 0.1 },
    { key: 'head', label: '视角补光', min: 0, max: 10, step: 0.1 },
    { key: 'azimuth', label: '主光方位角（°）', min: -180, max: 180, step: 1 },
    { key: 'elevation', label: '主光仰角（°）', min: -90, max: 90, step: 1 },
    { key: 'exposure', label: '曝光（ACES）', min: 0.1, max: 3, step: 0.1 }
];

export const DEFAULT_LIGHTING = Object.freeze({
    enabled: false,
    ambient: 0, hemisphere: 0, key: 0, fill: 0, head: 0,
    azimuth: 45, elevation: 50, exposure: 1
});

export const REFERENCE_LIGHTING = Object.freeze({
    enabled: true,
    ambient: 0.8, hemisphere: 1.8, key: 3, fill: 2, head: 1.5,
    azimuth: 45, elevation: 50, exposure: 1.2
});

// 全局灯光不进入可编辑对象列表，随场景元数据单独保存。
export class LightingManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.config = { ...DEFAULT_LIGHTING };
        this.direction = new THREE.Vector3();
        this.group = null;
    }

    getConfig() { return { ...this.config }; }

    setConfig(config = {}, { reset = false } = {}) {
        const next = reset ? { ...DEFAULT_LIGHTING } : this.getConfig();
        for (const { key, min, max } of LIGHTING_CONTROLS) {
            const value = config?.[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                next[key] = THREE.MathUtils.clamp(value, min, max);
            }
        }
        if (typeof config?.enabled === 'boolean') {
            next.enabled = config.enabled;
        } else if (reset) {
            // 兼容增加总开关前保存的光照，维持原有画面。
            next.enabled = ['ambient', 'hemisphere', 'key', 'fill', 'head'].some(key => next[key] > 0)
                || next.exposure !== DEFAULT_LIGHTING.exposure;
        }
        this.config = next;
        this.renderer.toneMappingExposure = next.enabled ? next.exposure : DEFAULT_LIGHTING.exposure;
        if (!this.group && next.enabled && ['ambient', 'hemisphere', 'key', 'fill', 'head'].some(key => next[key] > 0)) {
            this.group = new THREE.Group();
            this.group.name = '场景全局光照';
            this.lights = {
                ambient: new THREE.AmbientLight(0xffffff, 0),
                hemisphere: new THREE.HemisphereLight(0xe5f1ff, 0x8a8075, 0),
                key: new THREE.DirectionalLight(0xfff2df, 0),
                fill: new THREE.DirectionalLight(0xdceaff, 0),
                head: new THREE.DirectionalLight(0xffffff, 0)
            };
            this.group.add(...Object.values(this.lights), this.lights.key.target,
                this.lights.fill.target, this.lights.head.target);
            this.scene.add(this.group);
        }
        if (!this.group) return;
        for (const [key, light] of Object.entries(this.lights)) {
            light.intensity = next[key];
            light.visible = next.enabled && next[key] > 0;
        }
        // 平行光只取方向，不依赖模型的位置或大小。
        const azimuth = THREE.MathUtils.degToRad(next.azimuth);
        const elevation = THREE.MathUtils.degToRad(next.elevation);
        this.lights.key.position.set(Math.cos(elevation) * Math.sin(azimuth),
            Math.sin(elevation), Math.cos(elevation) * Math.cos(azimuth));
        this.lights.fill.position.set(-2, 1, -1);
        this.update();
    }

    update() {
        if (!this.group || !this.lights.head.visible) return;
        this.camera.getWorldPosition(this.lights.head.position);
        this.camera.getWorldDirection(this.direction);
        this.lights.head.target.position.copy(this.lights.head.position).add(this.direction);
    }

    dispose() {
        this.group?.removeFromParent();
        for (const light of Object.values(this.lights || {})) light.dispose();
        this.group = null;
    }
}
