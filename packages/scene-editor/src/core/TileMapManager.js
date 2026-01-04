import * as THREE from 'three';
import { GisUtils } from './GisUtils';

export class TileMapManager {
    constructor(scene) {
        this.scene = scene;
        this.mapGroup = new THREE.Group();
        this.scene.add(this.mapGroup);

        this.tiles = new Map(); // key: "z_x_y", value: Mesh or { loading: true }
        this.center = { lon: 0, lat: 0 };
        this.zoom = 18; // Default high resolution

        // Tianditu Token
        this.token = 'd3940c4f1d55fdfb8b053ad7f1e0c80d';
    }

    /**
     * Initialize or update the map configuration
     * @param {number} centerLon 
     * @param {number} centerLat 
     * @param {number} sizeMeters Size of the viewing box
     */
    updateMap(centerLon, centerLat, sizeMeters) {
        this.center = { lon: centerLon, lat: centerLat };

        // 1. Calculate Center in Web Mercator
        this.centerMercator = GisUtils.lonLatToWebMercator(centerLon, centerLat);

        // 2. Determine Tile Range
        const halfSize = sizeMeters / 2;
        const minX = this.centerMercator.x - halfSize;
        const maxX = this.centerMercator.x + halfSize;
        const minY = this.centerMercator.y - halfSize;
        const maxY = this.centerMercator.y + halfSize;

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
        // Optimization: For very large ranges, we should calculate the camera footprint on ground
        // instead of iterating all tiles. But for typical scene sizes (<10km), iteration is fine.
        for (let x = this.minTile.x; x <= this.maxTile.x; x++) {
            for (let y = this.minTile.y; y <= this.maxTile.y; y++) {
                const key = `${this.zoom}_${x}_${y}`;

                if (this.tiles.has(key)) continue; // Already loaded

                // Check Visibility
                const bounds = GisUtils.tileToWebMercator(x, y, this.zoom);
                const tileMinX = bounds.minX - this.centerMercator.x;
                const tileMaxX = bounds.maxX - this.centerMercator.x;
                const tileMinZ = -(bounds.maxY - this.centerMercator.y); // Top (larger Y) -> Smaller Z (negative)
                const tileMaxZ = -(bounds.minY - this.centerMercator.y); // Bottom (smaller Y) -> Larger Z (negative)

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

        const width = maxX - minX;
        const depth = maxZ - minZ; // Z size

        const geometry = new THREE.PlaneGeometry(width, depth);
        geometry.rotateX(-Math.PI / 2);

        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;

        const url = `https://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX=${this.zoom}&TILEROW=${y}&TILECOL=${x}&tk=${this.token}`;

        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'anonymous';

        loader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                clippingPlanes: this.clippingPlanes,
                clipIntersection: false
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(centerX, 0, centerZ);

            this.mapGroup.add(mesh);
            this.tiles.set(key, mesh);
        }, undefined, () => {
            this.tiles.delete(key); // Retry on fail
        });
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
