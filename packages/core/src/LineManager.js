import * as THREE from 'three';

// Match the reference demo's initial appearance; spacing and speed stay fixed.
const DEFAULT_LINE_WIDTH = 0.65;
const ARROW_SPACING = 2.6;
const FLOW_SPEED = 2.5;

export class LineManager {
    constructor(scene) {
        this.scene = scene;
        this.lines = new Map();
        this.textureLoader = new THREE.TextureLoader();
        this.elapsed = 0;
    }

    /**
     * Create a road ribbon and flowing arrows, matching the drawing demo.
     * @param {Object} options
     * @param {Array<{x:number,y:number,z:number}>} options.points - World-space points.
     * @param {string} options.textureUrl - Arrow image URL.
     * @param {number} [options.width=0.65] - Road width in scene units, finite and positive.
     * @returns {string|null} Generated ID; null if fewer than two distinct points.
     */
    createLine({ points, textureUrl, width = DEFAULT_LINE_WIDTH } = {}) {
        if (!Array.isArray(points)) throw new TypeError('[LineManager] points must be an array.');
        if (typeof textureUrl !== 'string' || !textureUrl.trim()) throw new TypeError('[LineManager] textureUrl is required.');
        if (!Number.isFinite(width)) throw new TypeError('[LineManager] width must be a finite number.');
        if (width <= 0) throw new RangeError('[LineManager] width must be greater than zero.');
        const path = [];
        for (const p of points) {
            if (!p || ![p.x, p.y, p.z].every(Number.isFinite)) throw new TypeError('[LineManager] Invalid point coordinates.');
            const point = new THREE.Vector3(p.x, p.y, p.z);
            if (!path.length || path.at(-1).distanceToSquared(point) > 1e-12) path.push(point);
        }
        if (path.length < 2) return null;

        // Ground picking uses the demo's exact rectangle+disc / local Bezier
        // algorithms. Elevated routes retain their input heights and node sections.
        const planar = path.every(p => Math.abs(p.y - path[0].y) < 1e-4);
        const roadGeometry = planar ? routeGeometry(path, width) : elevationRibbon(path, width);
        const arrowGeometry = planar ? arrowRibbon(path, width) : elevationRibbon(path, width * 0.7);
        // Draw both route layers after opaque scenery, without writing depth.
        // Elevated ribbons are coplanar; polygonOffset alone is not a reliable
        // separation with the renderer's logarithmic fragment depth. Keep depth
        // testing enabled so buildings/terrain can still occlude the route.
        const roadMaterial = new THREE.MeshBasicMaterial({
            color: 0x24516d, side: THREE.DoubleSide,
            transparent: true, opacity: 1, depthWrite: false, forceSinglePass: true
        });
        const texture = this.textureLoader.load(textureUrl);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        // Three.js clamps this to the GPU's supported maximum. Preserve detail
        // on oblique views instead of shimmering between undersampled texels.
        texture.anisotropy = 16;
        texture.offset.x = -(this.elapsed * FLOW_SPEED / ARROW_SPACING) % 1;
        const material = new THREE.MeshBasicMaterial({
            map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false,
            forceSinglePass: true,
            polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
        });
        const mesh = new THREE.Group();
        const id = THREE.MathUtils.generateUUID();
        const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
        const arrowMesh = new THREE.Mesh(arrowGeometry, material);
        // Stable order within the transparent pass, independent of camera distance.
        roadMesh.renderOrder = 1;
        arrowMesh.renderOrder = 2;
        mesh.add(roadMesh, arrowMesh);
        mesh.traverse(object => {
            object.userData.isFlowLine = true;
            object.userData.lineId = id;
        });
        this.scene.add(mesh);
        this.lines.set(id, { mesh, material, texture });
        return id;
    }

    removeLine(id) {
        const line = this.lines.get(id);
        if (!line) return;
        this.scene.remove(line.mesh);
        line.mesh.traverse(object => {
            object.geometry?.dispose();
            object.material?.dispose();
        });
        line.texture.dispose();
        this.lines.delete(id);
    }

    clear() {
        for (const id of this.lines.keys()) this.removeLine(id);
    }

    update(delta = 0) {
        if (!Number.isFinite(delta) || delta <= 0) return;
        // Same suspended-frame clamp and texture scrolling as the demo.
        this.elapsed += Math.min(delta, 0.05);
        for (const { texture } of this.lines.values()) {
            texture.offset.x = -(this.elapsed * FLOW_SPEED / ARROW_SPACING) % 1;
        }
    }
}

function routeGeometry(points, width) {
  const positions = [];
  const halfWidth = width / 2;
  const vertex = p => positions.push(p.x, p.y + 0.02, p.z);
  const triangle = (a, b, c) => { vertex(a); vertex(b); vertex(c); };
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1], end = points[i];
    const direction = end.clone().sub(start).normalize();
    const side = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(halfWidth);
    const a = start.clone().sub(side), b = start.clone().add(side);
    const c = end.clone().sub(side), d = end.clone().add(side);
    triangle(a, b, c); triangle(b, d, c);
  }
  for (const point of points) {
    for (let j = 0; j < 48; j++) {
      const a = j * Math.PI * 2 / 48, b = (j + 1) * Math.PI * 2 / 48;
      triangle(point,
        point.clone().add(new THREE.Vector3(Math.cos(a) * halfWidth, 0, Math.sin(a) * halfWidth)),
        point.clone().add(new THREE.Vector3(Math.cos(b) * halfWidth, 0, Math.sin(b) * halfWidth)));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function arrowRibbon(points, width) {
  const samples = [];
  const halfRoad = width / 2;
  const halfArrow = halfRoad * 0.55;
  const append = (point, tangent) => {
    if (samples.length && samples.at(-1).point.distanceToSquared(point) < 1e-12) return;
    samples.push({ point, tangent });
  };
  append(points[0].clone(), points[1].clone().sub(points[0]).normalize());
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i];
    const incoming = point.clone().sub(points[i - 1]).normalize();
    const outgoing = points[i + 1].clone().sub(point).normalize();
    const trim = Math.min(halfRoad * 0.4, point.distanceTo(points[i - 1]) * .25, point.distanceTo(points[i + 1]) * .25);
    const entry = point.clone().addScaledVector(incoming, -trim);
    const exit = point.clone().addScaledVector(outgoing, trim);
    const curve = new THREE.QuadraticBezierCurve3(entry, point.clone(), exit);
    for (let j = 0; j <= 24; j++) {
      const t = j / 24;
      const tangent = incoming.clone().multiplyScalar(1 - t).addScaledVector(outgoing, t);
      // 完全折返在中心收拢纹理，避免产生无效方向或越界。
      if (tangent.lengthSq() > 1e-12) tangent.normalize();
      append(curve.getPoint(t), tangent);
    }
  }
  append(points.at(-1).clone(), points.at(-1).clone().sub(points.at(-2)).normalize());
  const positions = [], uvs = [], indices = [];
  let distance = 0;
  samples.forEach(({ point, tangent }, i) => {
    if (i) distance += point.distanceTo(samples[i - 1].point);
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
    for (const sign of [-1, 1]) {
      const p = point.clone().addScaledVector(side, halfArrow * sign);
      positions.push(p.x, p.y + 0.045, p.z);
      uvs.push(distance / ARROW_SPACING, sign === -1 ? 0 : 1);
    }
    if (i < samples.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

// Generalize the demo's elevationRibbon: derive horizontal cross-sections from
// the route instead of depending on the demo's stairs/helix dropdown state.
function elevationRibbon(points, width) {
    const directions = points.slice(1).map((p, i) => p.clone().sub(points[i]).normalize());
    const sides = directions.map(d => Math.hypot(d.x, d.z) > 1e-8
        ? new THREE.Vector3(-d.z, 0, d.x).normalize() : null);
    let previous = sides.find(Boolean) || new THREE.Vector3(1, 0, 0);
    for (let i = 0; i < sides.length; i++) {
        if (!sides[i]) sides[i] = previous.clone();
        previous = sides[i];
    }
    const positions = [], uvs = [], indices = [];
    let distance = 0;
    points.forEach((point, i) => {
        if (i) distance += point.distanceTo(points[i - 1]);
        const before = sides[Math.max(0, i - 1)];
        const after = sides[Math.min(i, sides.length - 1)];
        const side = before.clone().add(after);
        if (side.lengthSq() < 1e-12) side.set(0, 0, 0);
        else side.normalize();
        for (const sign of [-1, 1]) {
            const p = point.clone().addScaledVector(side, sign * width / 2);
            positions.push(p.x, p.y, p.z);
            uvs.push(distance / ARROW_SPACING, sign === -1 ? 0 : 1);
        }
        if (i < points.length - 1) {
            const a = i * 2;
            indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
}
