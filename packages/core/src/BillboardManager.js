import * as THREE from 'three';
import { generateBid } from './BidRegistry.js';

/** World-space image/video planes. Runtime resources, outside persisted scene objects. */
export class BillboardManager {
    constructor(scene) {
        this.scene = scene;
        this.items = new Map();
        this.disposed = false;
    }

    /**
     * Load an image or MP4 and create a fixed-orientation, double-sided plane.
     * @param {Object} options - Plain configuration; never mutated.
     * @param {string} options.url - HTTP(S), blob or relative media URL (server must allow CORS).
     * @param {'image'|'video'} [options.type] - Inferred from .mp4 pathname if omitted.
     * @param {number} [options.width=4] - Width in world units (meters in GIS scenes).
     * @param {number} [options.height=2] - Height in world units; media stretches to fit.
     * @param {{x:number,y:number,z:number}} [options.position] - Center, defaults to origin.
     * @param {{x:number,y:number,z:number}} [options.rotation] - XYZ Euler degrees, matching editor properties; defaults to zero; front is +Z.
     * @param {'degrees'|'radians'} [options.rotationUnit='degrees'] - Explicit rotation unit.
     * @param {0|90|180|270} [options.mediaRotation=0] - Clockwise media rotation in degrees viewed from the +Z front; stretches to the same plane bounds.
     * @returns {Promise<string>} Runtime ID after media is ready (30 second timeout).
     * @throws {TypeError|RangeError|Error} Invalid config, load failure or disposed instance.
     * @example await manager.create({ url: '/poster.png', width: 6, height: 3 });
     */
    async create(options = {}) {
        if (this.disposed) throw new Error('BillboardManager has been disposed');
        if (!options || typeof options !== 'object') throw new TypeError('Billboard options must be an object');
        if (typeof options.url !== 'string' || !options.url.trim()) throw new TypeError('Billboard url is required');
        const url = new URL(options.url, globalThis.document?.baseURI || 'http://localhost/');
        if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new TypeError('Unsupported billboard URL protocol');
        const type = options.type ?? (/\.mp4$/i.test(url.pathname) ? 'video' : 'image');
        if (!['image', 'video'].includes(type)) throw new TypeError('Billboard type must be image or video');
        const width = options.width ?? 4;
        const height = options.height ?? 2;
        for (const value of [width, height]) {
            if (!Number.isFinite(value)) throw new TypeError('Billboard size must be finite numbers');
            if (value <= 0) throw new RangeError('Billboard size must be positive');
        }
        const vector = (value = { x: 0, y: 0, z: 0 }) => {
            if (!value || !['x', 'y', 'z'].every(axis => Number.isFinite(value[axis]))) {
                throw new TypeError('Billboard pose must contain finite x, y and z');
            }
            return [value.x, value.y, value.z];
        };
        const position = vector(options.position);
        const rotationUnit = options.rotationUnit ?? 'degrees';
        if (!['degrees', 'radians'].includes(rotationUnit)) throw new TypeError('Billboard rotationUnit must be degrees or radians');
        const rotation = vector(options.rotation).map(value => rotationUnit === 'degrees' ? THREE.MathUtils.degToRad(value) : value);
        const mediaRotation = options.mediaRotation ?? 0;
        if (typeof mediaRotation !== 'number') throw new TypeError('Billboard mediaRotation must be a number');
        if (![0, 90, 180, 270].includes(mediaRotation)) throw new RangeError('Billboard mediaRotation must be 0, 90, 180 or 270 degrees');
        const id = generateBid();
        const media = document.createElement(type === 'video' ? 'video' : 'img');
        media.crossOrigin = 'anonymous';
        if (type === 'video') {
            media.muted = true;
            media.loop = true;
            media.playsInline = true;
            media.preload = 'auto';
        }
        const item = { media, mesh: null, texture: null, cancel: null };
        this.items.set(id, item);
        try {
            await new Promise((resolve, reject) => {
                const event = type === 'video' ? 'loadeddata' : 'load';
                const cleanup = () => {
                    clearTimeout(timer);
                    media.removeEventListener(event, ready);
                    media.removeEventListener('error', failed);
                    item.cancel = null;
                };
                const ready = () => { cleanup(); resolve(); };
                const failed = () => { cleanup(); reject(new Error('Failed to load billboard media (check URL, format and CORS)')); };
                const timer = setTimeout(failed, 30000);
                item.cancel = () => { cleanup(); reject(new Error('Billboard loading cancelled')); };
                media.addEventListener(event, ready);
                media.addEventListener('error', failed);
                media.src = url.href;
                if (type === 'video') media.load();
            });
            if (this.disposed || !this.items.has(id)) throw new Error('Billboard loading cancelled');
            item.texture = type === 'video' ? new THREE.VideoTexture(media) : new THREE.Texture(media);
            item.texture.colorSpace = THREE.SRGBColorSpace;
            item.texture.needsUpdate = true;
            item.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
                map: item.texture, side: THREE.DoubleSide, transparent: true, toneMapped: false
            }));
            // Rotate sampling coordinates only: geometry and world-space alignment stay unchanged.
            // Quarter turns preserve the full media rectangle even for non-square billboards.
            const uv = item.mesh.geometry.attributes.uv;
            for (let i = 0; i < uv.count; i++) {
                const u = uv.getX(i);
                const v = uv.getY(i);
                if (mediaRotation === 90) uv.setXY(i, 1 - v, u);
                else if (mediaRotation === 180) uv.setXY(i, 1 - u, 1 - v);
                else if (mediaRotation === 270) uv.setXY(i, v, 1 - u);
            }
            uv.needsUpdate = true;
            item.mesh.position.set(...position);
            item.mesh.rotation.set(...rotation);
            item.mesh.name = 'Billboard';
            this.scene.add(item.mesh);
            if (type === 'video') {
                await media.play();
                if (this.disposed || !this.items.has(id)) throw new Error('Billboard loading cancelled');
            }
            return id;
        } catch (error) {
            this.remove(id);
            throw error;
        }
    }

    /** Remove an active or loading billboard and release its media/GPU resources. */
    remove(id) {
        const item = this.items.get(id);
        if (!item) return false;
        this.items.delete(id);
        item.cancel?.();
        item.mesh?.removeFromParent();
        item.mesh?.geometry.dispose();
        item.mesh?.material.dispose();
        item.texture?.dispose();
        if (item.media.tagName === 'VIDEO') item.media.pause();
        item.media.removeAttribute('src');
        if (item.media.tagName === 'VIDEO') item.media.load();
        return true;
    }

    clear() { for (const id of this.items.keys()) this.remove(id); }
    dispose() { this.disposed = true; this.clear(); }
}
