import * as THREE from 'three';
import { GisUtils } from './utils/GisUtils.js';

export class TileMapManager {
    constructor(scene, geoSystem) {
        this.scene = scene;
        this.geoSystem = geoSystem; // Layer 1 dependency
        this.mapGroup = new THREE.Group();
        this.scene.add(this.mapGroup);

        this.tiles = new Map(); // key: "z_x_y", value: Mesh or { loading: true }
        this.zoom = 18; // Default high resolution
        this.clippingEnabled = true;

        // Tianditu Token
        this.token = 'd3940c4f1d55fdfb8b053ad7f1e0c80d';
    }

    /**
     * Initialize or update the map configuration
     * @param {number} sizeMeters Size of the viewing box
     * @param {boolean} clippingEnabled Whether to clip the map to the box
     */
    updateMap(sizeMeters, clippingEnabled = true) {
        this.clippingEnabled = clippingEnabled;

        // 1. Get Center from GeoSystem (Source of Truth)
        // We no longer pass lon/lat here, we trust the GeoSystem's center
        const centerMercator = this.geoSystem.centerMercator;

        // 2. Determine Tile Range and Optimal Zoom
        const halfSize = sizeMeters / 2;
        const minX = centerMercator.x - halfSize;
        const maxX = centerMercator.x + halfSize;
        const minY = centerMercator.y - halfSize;
        const maxY = centerMercator.y + halfSize;

        // Auto-calculate Zoom to keep tile count reasonable (LOD)
        this.zoom = this.calculateOptimalZoom(minX, maxX, minY, maxY);
        console.log(`[TileMapManager] Auto-Zoom set to: ${this.zoom}`);

        this.minTile = GisUtils.webMercatorToTile(minX, maxY, this.zoom); // Top-Left
        this.maxTile = GisUtils.webMercatorToTile(maxX, minY, this.zoom); // Bottom-Right

        // 3. Setup Clipping Planes
        const clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(1, 0, 0), halfSize),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfSize),
            new THREE.Plane(new THREE.Vector3(0, 0, 1), halfSize),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), halfSize)
        ];

        this.clippingPlanes = clippingPlanes;

        // Clear old tiles when configuration changes
        this.clearMap();
    }

    setClipping(enabled) {
        this.clippingEnabled = enabled;
        this.tiles.forEach(tile => {
            if (tile.isMesh) {
                tile.material.clippingPlanes = enabled ? this.clippingPlanes : [];
                tile.material.needsUpdate = true;
            }
        });
    }

    /**
     * Update visible tiles based on camera frustum
     * @param {THREE.Camera} camera 
     */
    update(camera) {
        if (!this.minTile || !this.maxTile) return;

        // Update Frustum
        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);

        // Check all potential tiles
        for (let x = this.minTile.x; x <= this.maxTile.x; x++) {
            for (let y = this.minTile.y; y <= this.maxTile.y; y++) {
                const key = `${this.zoom}_${x}_${y}`;

                if (this.tiles.has(key)) continue; // Already loaded

                // Check Visibility
                const bounds = GisUtils.tileToWebMercator(x, y, this.zoom);
                const tileMinX = bounds.minX - this.geoSystem.centerMercator.x;
                const tileMaxX = bounds.maxX - this.geoSystem.centerMercator.x;
                const tileMinZ = -(bounds.maxY - this.geoSystem.centerMercator.y); // Top (larger Y) -> Smaller Z (negative)
                const tileMaxZ = -(bounds.minY - this.geoSystem.centerMercator.y); // Bottom (smaller Y) -> Larger Z (negative)

                // Create AABB for the tile (flat box)
                const box = new THREE.Box3(
                    new THREE.Vector3(tileMinX, -1, tileMinZ), // min
                    new THREE.Vector3(tileMaxX, 1, tileMaxZ)   // max
                );

                if (frustum.intersectsBox(box)) {
                    this.loadTile(x, y, key, tileMinX, tileMaxX, tileMinZ, tileMaxZ);
                }
            }
        }
    }

    loadTile(x, y, key, minX, maxX, minZ, maxZ) {
        // Mark as loading to prevent duplicate requests
        this.tiles.set(key, { loading: true });

        // Use GisUtils to calculate scene positions directly if needed, 
        // but here we already have the relative coordinates (minX, etc.) passed in from update()
        // which were calculated using GisUtils.tileToWebMercator and the center offset.
        // This aligns with the "Layer 2" philosophy where the loader relies on the math layer.

        const width = maxX - minX;
        const depth = maxZ - minZ; // Z size

        const geometry = new THREE.PlaneGeometry(width, depth);
        geometry.rotateX(-Math.PI / 2);

        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;

        // Tianditu WMTS URL
        const url = `https://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX=${this.zoom}&TILEROW=${y}&TILECOL=${x}&tk=${this.token}`;

        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'anonymous';

        loader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                clippingPlanes: this.clippingEnabled ? this.clippingPlanes : [],
                clipIntersection: false
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(centerX, 0, centerZ);

            // Add annotation layer (cia_w) similar to the demo
            this.loadAnnotation(x, y, width, depth, centerX, centerZ, mesh);

            this.mapGroup.add(mesh);
            this.tiles.set(key, mesh);
        }, undefined, () => {
            this.tiles.delete(key); // Retry on fail
        });
    }

    loadAnnotation(x, y, width, depth, centerX, centerZ, parentMesh) {
        const url = `https://t0.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX=${this.zoom}&TILEROW=${y}&TILECOL=${x}&tk=${this.token}`;

        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'anonymous';

        loader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false, // Don't write to depth buffer for overlays
                polygonOffset: true,
                polygonOffsetFactor: -1, // Pull towards camera
                polygonOffsetUnits: -1,
                clippingPlanes: this.clippingEnabled ? this.clippingPlanes : [],
                clipIntersection: false
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2), material);
            // No physical offset needed when using polygonOffset, but keeping a tiny one doesn't hurt
            mesh.position.y = 0.001;
            parentMesh.add(mesh);
        });
    }

    calculateOptimalZoom(minX, maxX, minY, maxY) {
        const MAX_TILES = 100; // Target max visible tiles
        let zoom = 18;

        while (zoom > 10) {
            const minTile = GisUtils.webMercatorToTile(minX, maxY, zoom);
            const maxTile = GisUtils.webMercatorToTile(maxX, minY, zoom);
            const cols = maxTile.x - minTile.x + 1;
            const rows = maxTile.y - minTile.y + 1;

            if (cols * rows <= MAX_TILES) {
                break;
            }
            zoom--;
        }
        return zoom;
    }

    clearMap() {
        this.mapGroup.clear();
        this.tiles.clear();
    }

    dispose() {
        this.clearMap();
        this.scene.remove(this.mapGroup);
    }
}
