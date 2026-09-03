import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const DEFAULT_GAUSSIAN_COLLIDER_OPTIONS = Object.freeze({
    resolution: 36,
    minOpacity: 0.12,
    radiusMultiplier: 0.6
});

/**
 * 为 Gaussian Splat 生成低复杂度体素代理网格。
 *
 * Spark 的原生 raycast 会遍历全部 splat；该代理把可见 splat 栅格化成若干
 * 沿 X 轴合并的盒子，之后可交给 RaycastManager 构建 BVH。
 *
 * @param {Object} splatMesh - 已初始化且支持 forEachSplat 的 Spark SplatMesh
 * @param {THREE.Box3} boundingBox - splat 的局部包围盒
 * @param {Partial<typeof DEFAULT_GAUSSIAN_COLLIDER_OPTIONS>} options
 * @returns {THREE.Mesh}
 */
export function createGaussianSplatCollider(splatMesh, boundingBox, options = {}) {
    if (!splatMesh?.forEachSplat) {
        throw new TypeError('Gaussian splat collider requires an initialized SplatMesh');
    }
    if (!boundingBox || boundingBox.isEmpty()) {
        throw new Error('Gaussian splat collider requires a non-empty bounding box');
    }

    const resolution = Math.max(1, Math.floor(
        Number.isFinite(options.resolution)
            ? options.resolution
            : DEFAULT_GAUSSIAN_COLLIDER_OPTIONS.resolution
    ));
    const minOpacity = Number.isFinite(options.minOpacity)
        ? options.minOpacity
        : DEFAULT_GAUSSIAN_COLLIDER_OPTIONS.minOpacity;
    const radiusMultiplier = Number.isFinite(options.radiusMultiplier)
        ? options.radiusMultiplier
        : DEFAULT_GAUSSIAN_COLLIDER_OPTIONS.radiusMultiplier;

    const size = boundingBox.getSize(new THREE.Vector3());
    const longestSide = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(longestSide) || longestSide <= 0) {
        throw new Error('Gaussian splat collider bounding box has no volume');
    }

    const voxelSize = longestSide / resolution;
    const gridSize = {
        x: Math.max(1, Math.ceil(size.x / voxelSize)),
        y: Math.max(1, Math.ceil(size.y / voxelSize)),
        z: Math.max(1, Math.ceil(size.z / voxelSize))
    };
    const occupied = new Set();

    splatMesh.forEachSplat((_index, center, scales, _quaternion, opacity) => {
        if (opacity < minOpacity) return;

        const radius = Math.max(scales.x, scales.y, scales.z, 0) * radiusMultiplier;
        const minX = clampGridIndex(center.x - radius, boundingBox.min.x, voxelSize, gridSize.x);
        const minY = clampGridIndex(center.y - radius, boundingBox.min.y, voxelSize, gridSize.y);
        const minZ = clampGridIndex(center.z - radius, boundingBox.min.z, voxelSize, gridSize.z);
        const maxX = clampGridIndex(center.x + radius, boundingBox.min.x, voxelSize, gridSize.x);
        const maxY = clampGridIndex(center.y + radius, boundingBox.min.y, voxelSize, gridSize.y);
        const maxZ = clampGridIndex(center.z + radius, boundingBox.min.z, voxelSize, gridSize.z);

        for (let x = minX; x <= maxX; x += 1) {
            for (let y = minY; y <= maxY; y += 1) {
                for (let z = minZ; z <= maxZ; z += 1) {
                    occupied.add(`${x},${y},${z}`);
                }
            }
        }
    });

    const { geometry, colliderPartCount } = createMergedVoxelRunGeometry(
        occupied,
        boundingBox,
        voxelSize,
        gridSize
    );

    // material.visible=false 只禁止绘制，不会禁止 Mesh.raycast。
    // collider.visible 必须保持 true，才能通过编辑器的“忽略隐藏对象”筛选。
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    material.visible = false;

    const collider = new THREE.Mesh(geometry, material);
    collider.name = 'GaussianSplatBVHCollider';
    collider.userData.isGaussianSplatCollider = true;
    collider.userData.isInternalHelper = true;
    collider.userData.excludeFromTriangleStats = true;
    collider.userData.excludeFromCameraFit = true;
    collider.userData.voxelCount = occupied.size;
    collider.userData.colliderPartCount = colliderPartCount;
    collider.userData.voxelSize = voxelSize;
    collider.userData.resolution = resolution;
    return collider;
}

function clampGridIndex(value, gridMin, voxelSize, gridLength) {
    return Math.min(gridLength - 1, Math.max(0, Math.floor((value - gridMin) / voxelSize)));
}

function createMergedVoxelRunGeometry(occupied, boundingBox, voxelSize, gridSize) {
    const runGeometries = [];

    for (let y = 0; y < gridSize.y; y += 1) {
        for (let z = 0; z < gridSize.z; z += 1) {
            let runStart = -1;

            for (let x = 0; x <= gridSize.x; x += 1) {
                const isOccupied = x < gridSize.x && occupied.has(`${x},${y},${z}`);
                if (isOccupied && runStart === -1) runStart = x;

                if (!isOccupied && runStart !== -1) {
                    const runLength = x - runStart;
                    const geometry = new THREE.BoxGeometry(
                        voxelSize * runLength,
                        voxelSize,
                        voxelSize
                    );
                    geometry.translate(
                        boundingBox.min.x + (runStart + runLength * 0.5) * voxelSize,
                        boundingBox.min.y + (y + 0.5) * voxelSize,
                        boundingBox.min.z + (z + 0.5) * voxelSize
                    );
                    runGeometries.push(geometry);
                    runStart = -1;
                }
            }
        }
    }

    // 极低透明度或异常数据也保留可选择能力，退化为一个包围盒代理。
    if (runGeometries.length === 0) {
        const fallback = new THREE.BoxGeometry(
            voxelSize * gridSize.x,
            voxelSize * gridSize.y,
            voxelSize * gridSize.z
        );
        fallback.translate(
            boundingBox.min.x + voxelSize * gridSize.x * 0.5,
            boundingBox.min.y + voxelSize * gridSize.y * 0.5,
            boundingBox.min.z + voxelSize * gridSize.z * 0.5
        );
        return { geometry: fallback, colliderPartCount: 1 };
    }

    const geometry = mergeGeometries(runGeometries, false);
    runGeometries.forEach((item) => item.dispose());
    if (!geometry) {
        throw new Error('Failed to merge Gaussian splat collider geometry');
    }
    return { geometry, colliderPartCount: runGeometries.length };
}
