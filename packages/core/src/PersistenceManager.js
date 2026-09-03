import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { TilesRenderer } from '3d-tiles-renderer';
import { message } from './utils/message.js';
import { generateBid } from './BidRegistry.js';
import { createGaussianSplatCollider } from './GaussianSplatCollider.js';

/**
 * 持久化管理器
 * 负责场景对象的序列化、反序列化以及场景数据恢复
 * 支持 GLTF 模型的增量保存（只保存修改过的属性）
 */
export class PersistenceManager {
    // 默认 Draco 解码器路径（可通过 setDracoPath 修改）
    static dracoPath = '/draco/';

    /**
     * 设置全局 Draco 解码器路径
     * @param {string} path - Draco 解码器路径（应以 / 结尾）
     */
    static setDracoPath(path) {
        PersistenceManager.dracoPath = path.endsWith('/') ? path : path + '/';
    }

    /**
     * 构造函数
     * @param {SceneManager} sceneManager - 场景管理器实例
     * @param {EditorStore} editorStore - 编辑器状态存储实例
     * @param {Object} dbManager - 数据库管理器实例 (依赖注入)
     * @param {Object} [options] - 可选配置
     * @param {string} [options.dracoPath] - 自定义 Draco 解码器路径
     */
    constructor(sceneManager, editorStore, dbManager, options = {}) {
        this.sceneManager = sceneManager;
        this.editorStore = editorStore;
        this.dbManager = dbManager;
        this.objectMap = new Map();
        this.disposed = false;
        this.pendingSplatMeshes = new Set();

        // 设置 DRACO 解码器（优先使用实例配置，其次全局配置）
        this.dracoLoader = new DRACOLoader();
        const dracoPath = options.dracoPath || PersistenceManager.dracoPath;
        this.dracoLoader.setDecoderPath(dracoPath);

        // 设置 GLTF 加载器并启用 DRACO 支持
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);

        this.modelCache = new Map();
        this.currentSceneId = 'default';
        this.pendingNodeGraph = [];
        this.pendingDeletedSourceNodes = [];
    }

    /**
     * 初始化管理器
     * 连接数据库并加载场景
     * @param {string} sceneId - 场景 ID
     * @param {Object} [options] - 场景恢复选项
     */
    async init(sceneId = 'default', options = {}) {
        if (this.disposed) throw new Error('PersistenceManager has been disposed');
        if (!this.dbManager) throw new Error('PersistenceManager.init requires a dbManager');
        this.currentSceneId = sceneId;
        await this.dbManager.init();
        if (this.disposed) return null;
        return this.loadScene(sceneId, options);
    }

    /**
     * ECEF 坐标转经纬度
     * @param {number} x - ECEF X 坐标（米）
     * @param {number} y - ECEF Y 坐标（米）
     * @param {number} z - ECEF Z 坐标（米）
     * @returns {{lng: number, lat: number, height: number}|null}
     */
    ecefToLngLat(x, y, z) {
        // WGS84 椭球参数
        const a = 6378137.0; // 长半轴（米）
        const f = 1 / 298.257223563;
        const b = a * (1 - f);
        const e2 = 1 - (b * b) / (a * a);
        const ep2 = (a * a - b * b) / (b * b);

        const p = Math.sqrt(x * x + y * y);
        const theta = Math.atan2(a * z, b * p);

        // 经度（弧度 -> 度）
        const lng = Math.atan2(y, x) * 180 / Math.PI;

        // 纬度（迭代计算）
        const lat = Math.atan2(
            z + ep2 * b * Math.pow(Math.sin(theta), 3),
            p - e2 * a * Math.pow(Math.cos(theta), 3)
        ) * 180 / Math.PI;

        // 高度（简化计算）
        const sinLat = Math.sin(lat * Math.PI / 180);
        const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
        const height = p / Math.cos(lat * Math.PI / 180) - N;

        return { lng, lat, height };
    }

    /**
     * 获取 3D Tiles 根节点 transform 的列主序数组
     * @param {TilesRenderer} tilesRenderer
     * @returns {number[]|null}
     */
    getTilesetTransformElements(tilesRenderer) {
        const transform = tilesRenderer.root?.transform || tilesRenderer.root?.cached?.transform;
        if (!transform) return null;
        if (Array.isArray(transform)) return transform;
        if (transform.elements) return transform.elements;
        return null;
    }

    /**
     * 将带地理参考的 3D Tiles 从 ECEF 转到当前 GIS 本地坐标系
     * @param {TilesRenderer} tilesRenderer
     * @param {THREE.Group} wrapper
     * @param {number[]} transform
     * @returns {boolean} 是否成功放置
     */
    placeGeoreferencedTileset(tilesRenderer, wrapper, transform) {
        if (!this.sceneManager.geoSystem || !transform || transform.length < 16) {
            return false;
        }

        const position = new THREE.Vector3(transform[12], transform[13], transform[14]);
        const east = new THREE.Vector3(transform[0], transform[1], transform[2]).normalize();
        const north = new THREE.Vector3(transform[4], transform[5], transform[6]).normalize();
        const up = new THREE.Vector3(transform[8], transform[9], transform[10]).normalize();
        const lngLat = this.ecefToLngLat(position.x, position.y, position.z);
        if (!lngLat) return false;

        const anchor = this.sceneManager.lngLatToWorld(lngLat.lng, lngLat.lat, 0);
        if (!anchor) return false;

        wrapper.position.copy(anchor);
        wrapper.userData.gisCenter = { lng: lngLat.lng, lat: lngLat.lat };

        const ecefToEnu = new THREE.Matrix4().set(
            east.x, east.y, east.z, -east.dot(position),
            north.x, north.y, north.z, -north.dot(position),
            up.x, up.y, up.z, -up.dot(position),
            0, 0, 0, 1
        );

        // 将 ENU 坐标投影到 Meteor3D 本地 GIS 坐标轴：东为 +X，上为 +Y，北为 -Z。
        const enuToThree = new THREE.Matrix4().set(
            1, 0, 0, 0,
            0, 0, 1, 0,
            0, -1, 0, 0,
            0, 0, 0, 1
        );

        tilesRenderer.group.applyMatrix4(new THREE.Matrix4().multiplyMatrices(enuToThree, ecefToEnu));
        tilesRenderer.group.updateMatrixWorld(true);
        return true;
    }

    /**
     * 无地理参考时退回到本地居中显示
     * @param {TilesRenderer} tilesRenderer
     * @returns {boolean}
     */
    placeLocalTilesetFallback(tilesRenderer) {
        const box3 = new THREE.Box3();
        if (!tilesRenderer.getBoundingBox(box3) || box3.isEmpty()) {
            return false;
        }
        box3.getCenter(tilesRenderer.group.position);
        tilesRenderer.group.position.multiplyScalar(-1);
        return true;
    }

    /**
     * 暂存场景级节点图，等待所有对象加载完成后统一恢复跨对象层级关系。
     * @param {Array<Object>} nodeGraph - 持久化节点图记录。
     * @returns {void}
     */
    setPendingNodeGraph(nodeGraph) {
        this.pendingNodeGraph = Array.isArray(nodeGraph) ? nodeGraph : [];
    }

    /**
     * 暂存已从源模型中删除的节点记录。
     * @param {Array<Object>} deletedSourceNodes - 已删除源节点记录。
     * @returns {void}
     */
    setPendingDeletedSourceNodes(deletedSourceNodes) {
        this.pendingDeletedSourceNodes = Array.isArray(deletedSourceNodes) ? deletedSourceNodes : [];
    }

    /**
     * 根据持久化删除记录，从新加载的 GLTF 实例中移除对应源节点。
     * @param {THREE.Object3D} root - GLTF 模型根节点。
     * @param {string} originObjectBid - 模型实例根 BID。
     * @returns {void}
     */
    removeDeletedSourceNodes(root, originObjectBid) {
        const deletedIds = new Set(this.pendingDeletedSourceNodes.filter((item) => item.originObjectBid === originObjectBid).map((item) => item.assetNodeId));
        const toRemove = [];
        root.traverse((node) => {
            if (node !== root && deletedIds.has(node.userData.assetNodeId)) toRemove.push(node);
        });
        toRemove.forEach((node) => node.removeFromParent());
    }

    /**
     * 获取对象恢复时应使用的节点绑定，优先使用场景级节点图中的最新记录。
     * @param {Object} data - 已序列化的对象数据。
     * @returns {Array<Object>} 对象所属的节点绑定记录。
     */
    getBindingsForObject(data) {
        const originObjectBid = data.bid || data.id;
        const globalBindings = this.pendingNodeGraph.filter((item) => item.originObjectBid === originObjectBid);
        return globalBindings.length > 0 ? globalBindings : (data.nodeBindings || []);
    }

    /**
     * 序列化当前场景内所有受管理对象的完整节点图。
     * @returns {Array<Object>} 包含节点标识、父子关系、顺序和变换的记录列表。
     */
    serializeSceneGraph() {
        const records = [];
        const visited = new Set();
        for (const trackedRoot of this.sceneManager.objects) {
            trackedRoot.traverse((node) => {
                if (node.userData.isInternalHelper) return;
                if (visited.has(node)) return;
                visited.add(node);
                if (!node.userData.bid) node.userData.bid = generateBid();
                if (!node.userData.originObjectBid) node.userData.originObjectBid = trackedRoot.userData.bid;
                records.push({
                    bid: node.userData.bid,
                    originObjectBid: node.userData.originObjectBid,
                    assetNodeId: node.userData.assetNodeId || null,
                    parentBid: node.parent && node.parent !== this.sceneManager.scene ? node.parent.userData?.bid || null : null,
                    order: node.parent ? node.parent.children.indexOf(node) : 0,
                    name: node.name || '',
                    visible: node.visible,
                    position: { x: node.position.x, y: node.position.y, z: node.position.z },
                    rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z },
                    scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z }
                });
            });
        }
        return records;
    }

    /**
     * 对比缓存中的源模型模板与当前节点图，生成已删除源节点记录。
     * @param {Array<Object>} nodeGraph - 当前场景节点图。
     * @returns {Array<Object>} 已删除源节点记录列表。
     */
    serializeDeletedSourceNodes(nodeGraph) {
        const deleted = [];
        for (const root of this.sceneManager.objects) {
            if (root.userData.modelType !== 'GLTF') continue;
            const template = this.modelCache.get(root.userData.modelUrl);
            if (!template) continue;
            const originObjectBid = root.userData.bid;
            const liveIds = new Set(nodeGraph.filter((item) => item.originObjectBid === originObjectBid).map((item) => item.assetNodeId).filter(Boolean));
            template.traverse((node) => {
                const assetNodeId = node.userData.assetNodeId;
                if (node !== template && assetNodeId && !liveIds.has(assetNodeId)) deleted.push({ originObjectBid, assetNodeId });
            });
        }
        return deleted;
    }

    /**
     * 恢复场景级节点图中的父子关系、节点属性和子节点顺序。
     * 此方法在所有对象加载后调用，以支持跨模型重新挂接节点。
     * @param {Array<Object>} [nodeGraph=this.pendingNodeGraph] - 待应用的节点图。
     * @returns {void}
     */
    applyGlobalNodeGraph(nodeGraph = this.pendingNodeGraph) {
        if (!Array.isArray(nodeGraph) || nodeGraph.length === 0) return;
        for (const record of nodeGraph) {
            const node = this.sceneManager.findObjectByBid(record.bid);
            const parent = this.sceneManager.findObjectByBid(record.parentBid);
            if (node && parent && node !== parent && node.parent !== parent) parent.add(node);
        }
        for (const record of nodeGraph) {
            const node = this.sceneManager.findObjectByBid(record.bid);
            if (!node) continue;
            if (record.name !== undefined) node.name = record.name;
            if (record.visible !== undefined) node.visible = record.visible;
            if (record.position) node.position.set(record.position.x, record.position.y, record.position.z);
            if (record.rotation) node.rotation.set(record.rotation.x, record.rotation.y, record.rotation.z);
            if (record.scale) node.scale.set(record.scale.x, record.scale.y, record.scale.z);
        }
        const parentBids = new Set(nodeGraph.map((item) => item.parentBid).filter(Boolean));
        for (const parentBid of parentBids) {
            const parent = this.sceneManager.findObjectByBid(parentBid);
            if (!parent) continue;
            const orderByBid = new Map(nodeGraph.filter((item) => item.parentBid === parentBid).map((item) => [item.bid, item.order]));
            parent.children.sort((a, b) => (orderByBid.get(a.userData.bid) ?? 0) - (orderByBid.get(b.userData.bid) ?? 0));
        }
    }

    /**
     * 应用由 serializeObject 生成的对象变换数据。
     * @param {THREE.Object3D} object - 待恢复的场景对象。
     * @param {{position?: Object, rotation?: Object, scale?: Object}} transform - 持久化变换数据。
     * @returns {void}
     */
    applySerializedTransform(object, transform) {
        if (!object || !transform) return;

        if (transform.position) {
            object.position.set(transform.position.x, transform.position.y, transform.position.z);
        }
        if (transform.rotation) {
            object.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
        }
        if (transform.scale) {
            object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
        }
    }

    /**
     * 为源模型节点建立稳定且唯一的资源节点 ID。
     * 优先使用模型内嵌 ID，缺失或重复时回退到节点索引路径。
     * @param {THREE.Object3D} root - 源模型根节点。
     * @param {string} [url=''] - 源模型地址。
     * @returns {void}
     */
    normalizeAssetNodeIds(root, url = '') {
        const usedIds = new Set();
        const visit = (node, path) => {
            const embeddedId = node.userData.meteorAssetNodeId || node.userData.assetNodeId;
            const fallbackId = path === 'root' ? '__asset_root__' : `legacy:${path}`;
            node.userData.assetNodeId = embeddedId && !usedIds.has(embeddedId) ? embeddedId : fallbackId;
            usedIds.add(node.userData.assetNodeId);
            node.children.forEach((child, index) => visit(child, `${path}/${index}`));
        };
        visit(root, 'root');
        root.userData.assetSourceUrl = url;
    }

    /**
     * 为新建模型实例的整棵节点树分配新的持久化 BID。
     * @param {THREE.Object3D} root - 模型实例根节点。
     * @param {Object} [asset={}] - 资源标识信息。
     * @returns {string} 新生成的模型实例根 BID。
     */
    assignNewTreeBids(root, asset = {}) {
        const originObjectBid = generateBid();
        root.traverse((node) => {
            node.userData.bid = node === root ? originObjectBid : generateBid();
            node.userData.originObjectBid = originObjectBid;
            if (asset.assetId) node.userData.assetId = asset.assetId;
            if (asset.assetVersionId) node.userData.assetVersionId = asset.assetVersionId;
        });
        return originObjectBid;
    }

    /**
     * 根据稳定资源节点 ID 将已保存的 BID 恢复到新加载的模型节点树。
     * @param {THREE.Object3D} root - 新加载的模型根节点。
     * @param {Object} data - 已序列化对象及节点绑定数据。
     * @returns {void}
     */
    restoreTreeBids(root, data) {
        const bindings = Array.isArray(data.nodeBindings) ? data.nodeBindings : [];
        const byAssetNodeId = new Map(bindings.filter((item) => item.assetNodeId).map((item) => [item.assetNodeId, item]));
        const rootBid = data.bid || data.id || generateBid();
        root.traverse((node) => {
            const binding = byAssetNodeId.get(node.userData.assetNodeId);
            node.userData.bid = binding?.bid || (node === root ? rootBid : generateBid());
            node.userData.originObjectBid = rootBid;
            if (data.assetId) node.userData.assetId = data.assetId;
            if (data.assetVersionId) node.userData.assetVersionId = data.assetVersionId;
        });
    }

    /**
     * 序列化单个模型实例内部的节点标识、层级、顺序和变换。
     * @param {THREE.Object3D} root - 模型实例根节点。
     * @returns {Array<Object>} 节点绑定记录列表。
     */
    serializeNodeBindings(root) {
        const bindings = [];
        root.traverse((node) => {
            if (!node.userData.bid) node.userData.bid = generateBid();
            bindings.push({
                bid: node.userData.bid,
                assetNodeId: node.userData.assetNodeId || null,
                parentBid: node.parent && node.parent !== this.sceneManager.scene ? node.parent.userData?.bid || null : null,
                order: node.parent ? node.parent.children.indexOf(node) : 0,
                name: node.name || '',
                visible: node.visible,
                position: { x: node.position.x, y: node.position.y, z: node.position.z },
                rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z },
                scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z }
            });
        });
        return bindings;
    }

    /**
     * 将节点绑定记录应用到单个模型实例，恢复其内部层级和节点属性。
     * @param {THREE.Object3D} root - 模型实例根节点。
     * @param {Array<Object>} [bindings=[]] - 节点绑定记录。
     * @returns {void}
     */
    applyNodeBindings(root, bindings = []) {
        const byBid = new Map();
        root.traverse((node) => {
            if (node.userData.bid) byBid.set(node.userData.bid, node);
        });

        for (const binding of bindings) {
            const node = byBid.get(binding.bid);
            const parent = byBid.get(binding.parentBid);
            if (node && parent && node !== root && node.parent !== parent) parent.add(node);
        }

        for (const binding of bindings) {
            const node = byBid.get(binding.bid);
            if (!node) continue;
            if (binding.name !== undefined) node.name = binding.name;
            if (binding.visible !== undefined) node.visible = binding.visible;
            if (binding.position) node.position.set(binding.position.x, binding.position.y, binding.position.z);
            if (binding.rotation) node.rotation.set(binding.rotation.x, binding.rotation.y, binding.rotation.z);
            if (binding.scale) node.scale.set(binding.scale.x, binding.scale.y, binding.scale.z);
        }

        const orderedParents = new Set(bindings.map((item) => item.parentBid).filter(Boolean));
        for (const parentBid of orderedParents) {
            const parent = byBid.get(parentBid);
            if (!parent) continue;
            const orders = new Map(bindings.filter((item) => item.parentBid === parentBid).map((item) => [item.bid, item.order]));
            parent.children.sort((a, b) => (orders.get(a.userData.bid) ?? 0) - (orders.get(b.userData.bid) ?? 0));
        }
    }

    /**
     * 序列化对象
     * 将 Three.js 对象转换为可存储的 JSON 数据
     * @param {THREE.Object3D} object - 要序列化的对象
     * @returns {Object} 序列化后的数据
     */
    serializeObject(object) {
        if (object.userData.modelType === 'GLTF') {
            return {
                id: object.userData.bid || object.uuid,
                bid: object.userData.bid || object.uuid,
                type: 'GLTFModel',
                name: object.name || '',
                url: object.userData.modelUrl,
                assetId: object.userData.assetId || null,
                assetVersionId: object.userData.assetVersionId || null,
                nodeBindings: this.serializeNodeBindings(object),
                animation: this.serializeAnimationConfig(object),
                visible: object.visible,
                position: { x: object.position.x, y: object.position.y, z: object.position.z },
                rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z },
                scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
                modifications: this.extractModifications(object)
            };
        } else if (object.userData.modelType === 'Tileset') {
            return {
                id: object.userData.bid || object.uuid,
                bid: object.userData.bid || object.uuid,
                type: 'Tileset',
                name: object.name || 'Tileset',
                url: object.userData.modelUrl,
                visible: object.visible,
                position: { x: object.position.x, y: object.position.y, z: object.position.z },
                rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z },
                scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
                gisCenter: object.userData.gisCenter || null  // 保存提取的 GIS 中心点
            };
        } else if (object.userData.modelType === 'GaussianSplat') {
            return {
                id: object.userData.bid || object.uuid,
                bid: object.userData.bid || object.uuid,
                type: 'GaussianSplat',
                name: object.name || 'Gaussian Splat',
                url: object.userData.modelUrl,
                visible: object.visible,
                position: { x: object.position.x, y: object.position.y, z: object.position.z },
                rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z },
                scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z }
            };
        } else {
            return {
                id: object.userData.bid || object.uuid,
                bid: object.userData.bid || object.uuid,
                type: object.geometry?.type || 'Unknown',
                name: object.name || '',
                visible: object.visible,
                position: { x: object.position.x, y: object.position.y, z: object.position.z },
                rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z },
                scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
                geometry: { type: object.geometry?.type, parameters: object.geometry?.parameters },
                material: {
                    color: object.material?.color?.getHex(),
                    roughness: object.material?.roughness,
                    metalness: object.material?.metalness,
                    emissive: object.material?.emissive?.getHex(),
                    emissiveIntensity: object.material?.emissiveIntensity,
                    opacity: object.material?.opacity,
                    alphaTest: object.material?.alphaTest,
                    blending: object.material?.blending,
                    side: object.material?.side,
                    transparent: object.material?.transparent,
                    depthTest: object.material?.depthTest,
                    depthWrite: object.material?.depthWrite,
                    vertexColors: object.material?.vertexColors,
                    wireframe: object.material?.wireframe,
                    flatShading: object.material?.flatShading
                }
            };
        }
    }

    /**
     * 提取模型当前的动画配置，仅保存可跨会话恢复的纯数据。
     * @param {THREE.Object3D} object - GLTF 模型根节点
     * @returns {Object|null} 动画配置；模型没有动画时返回 null
     */
    serializeAnimationConfig(object) {
        const runtimeState = this.sceneManager?.animationManager?.getAnimationState(object);
        const state = runtimeState || object?.userData?.animationConfig;
        if (!state || !Array.isArray(object?.animations) || object.animations.length === 0) return null;
        const speed = Number(state.speed);

        return {
            enabled: state.enabled === true,
            playing: state.enabled === true && state.playing === true,
            clipIndex: Number.isInteger(state.clipIndex) && state.clipIndex >= 0 ? state.clipIndex : 0,
            clipName: typeof state.clipName === 'string' ? state.clipName : '',
            speed: Number.isFinite(speed) && speed >= 0.1 && speed <= 3 ? speed : 1,
            loop: 'repeat'
        };
    }

    /**
     * 校验并规范化数据库中的动画配置，避免无效旧数据影响场景恢复。
     * @param {Object|null|undefined} config - 数据库动画配置
     * @returns {Object|null} 可交给 AnimationManager 的配置
     */
    normalizeAnimationConfig(config) {
        if (!config || typeof config !== 'object') return null;

        const enabled = config.enabled === true;
        const speed = Number(config.speed);
        return {
            enabled,
            playing: enabled && config.playing === true,
            clipIndex: Number.isInteger(config.clipIndex) && config.clipIndex >= 0 ? config.clipIndex : 0,
            clipName: typeof config.clipName === 'string' ? config.clipName : '',
            speed: Number.isFinite(speed) && speed >= 0.1 && speed <= 3 ? speed : 1,
            loop: 'repeat'
        };
    }

    /**
     * 提取 GLTF 模型的修改
     * 遍历模型树，查找并记录被修改过的子节点属性
     * @param {THREE.Object3D} rootObject - GLTF 模型根节点
     * @returns {Object} 修改记录字典，键为节点路径
     */
    extractModifications(rootObject) {
        const modifications = {};
        rootObject.traverse((child) => {
            if (child.isMesh && child !== rootObject) {
                const hasModifications = child.userData.positionModified ||
                    child.userData.rotationModified ||
                    child.userData.scaleModified ||
                    child.userData.materialModified ||
                    child.userData.visibleModified;

                if (hasModifications) {
                    const path = child.userData.assetNodeId || child.userData.bid || this.getObjectPath(child, rootObject);
                    modifications[path] = {};

                    if (child.userData.visibleModified) {
                        modifications[path].visible = child.visible;
                    }
                    if (child.userData.positionModified) {
                        modifications[path].position = { x: child.position.x, y: child.position.y, z: child.position.z };
                    }
                    if (child.userData.rotationModified) {
                        modifications[path].rotation = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z };
                    }
                    if (child.userData.scaleModified) {
                        modifications[path].scale = { x: child.scale.x, y: child.scale.y, z: child.scale.z };
                    }
                    if (child.userData.materialModified && child.material) {
                        modifications[path].material = {
                            color: child.material.color?.getHex(),
                            roughness: child.material.roughness,
                            metalness: child.material.metalness,
                            emissive: child.material.emissive?.getHex(),
                            emissiveIntensity: child.material.emissiveIntensity,
                            opacity: child.material.opacity,
                            alphaTest: child.material.alphaTest,
                            blending: child.material.blending,
                            side: child.material.side,
                            transparent: child.material.transparent,
                            depthTest: child.material.depthTest,
                            depthWrite: child.material.depthWrite,
                            vertexColors: child.material.vertexColors,
                            wireframe: child.material.wireframe,
                            flatShading: child.material.flatShading
                        };
                    }
                }
            }
        });
        return modifications;
    }

    /**
     * 获取对象相对于根节点的路径
     * @param {THREE.Object3D} object - 目标对象
     * @param {THREE.Object3D} root - 根节点
     * @returns {string} 路径字符串 (e.g., "Body/Door/Handle")
     */
    getObjectPath(object, root) {
        const path = [];
        let current = object;
        while (current && current !== root) {
            if (current.name) {
                path.unshift(current.name);
            } else {
                // 如果没有名称，使用索引作为路径的一部分
                const index = current.parent.children.indexOf(current);
                path.unshift(`child_${index}`);
            }
            current = current.parent;
        }
        return path.join('/');
    }

    /**
     * 反序列化对象
     * 将存储的数据恢复为 Three.js 对象
     * @param {Object} data - 存储的数据
     * @returns {Promise<THREE.Object3D>} 恢复后的对象
     */
    async deserializeObject(data) {
        if (data.type === 'GLTFModel') {
            const model = await this.loadGLTFModel(data.url, {
                assignBids: false,
                assetId: data.assetId,
                assetVersionId: data.assetVersionId
            });
            this.removeDeletedSourceNodes(model, data.bid || data.id);
            const bindings = this.getBindingsForObject(data);
            this.restoreTreeBids(model, { ...data, nodeBindings: bindings });
            this.applyNodeBindings(model, bindings);
            const animationConfig = this.normalizeAnimationConfig(data.animation);
            if (animationConfig) model.userData.animationConfig = animationConfig;
            else delete model.userData.animationConfig;
            model.name = data.name;
            if (data.visible !== undefined) model.visible = data.visible;
            model.position.set(data.position.x, data.position.y, data.position.z);
            model.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
            model.scale.set(data.scale.x, data.scale.y, data.scale.z);
            if (data.modifications) {
                this.applyModifications(model, data.modifications);
            }
            return model;
        } else if (data.type === 'Tileset') {
            const tileset = await this.loadTileset(data.url);
            tileset.userData.bid = data.bid || data.id || generateBid();
            tileset.name = data.name || 'Tileset';
            if (data.visible !== undefined) tileset.visible = data.visible;

            // 根元数据异步加载，自动定位可能在本方法返回后才执行；
            // 暂存持久化变换，以便回调最终恢复用户保存的变换值。
            const persistedTransform = {
                position: data.position,
                rotation: data.rotation,
                scale: data.scale
            };
            tileset.userData.pendingPersistedTransform = persistedTransform;
            this.applySerializedTransform(tileset, persistedTransform);

            if (tileset.userData.tilesetPlacementComplete) {
                delete tileset.userData.pendingPersistedTransform;
            }
            return tileset;
        } else if (data.type === 'GaussianSplat') {
            const splat = await this.loadGaussianSplat(data.url);
            splat.userData.bid = data.bid || data.id || generateBid();
            splat.name = data.name || 'Gaussian Splat';
            if (data.visible !== undefined) splat.visible = data.visible;
            splat.position.set(data.position.x, data.position.y, data.position.z);
            splat.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
            splat.scale.set(data.scale.x, data.scale.y, data.scale.z);
            return splat;
        } else {
            let geometry;
            if (data.geometry.type === 'BoxGeometry') {
                const p = data.geometry.parameters;
                geometry = new THREE.BoxGeometry(p.width, p.height, p.depth);
            } else if (data.geometry.type === 'SphereGeometry') {
                const p = data.geometry.parameters;
                geometry = new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments);
            } else if (data.geometry.type === 'ConeGeometry') {
                const p = data.geometry.parameters;
                geometry = new THREE.ConeGeometry(
                    p.radius,
                    p.height,
                    p.radialSegments,
                    p.heightSegments,
                    p.openEnded,
                    p.thetaStart,
                    p.thetaLength
                );
            } else if (data.geometry.type === 'CylinderGeometry') {
                const p = data.geometry.parameters;
                geometry = new THREE.CylinderGeometry(
                    p.radiusTop,
                    p.radiusBottom,
                    p.height,
                    p.radialSegments,
                    p.heightSegments,
                    p.openEnded,
                    p.thetaStart,
                    p.thetaLength
                );
            } else {
                // 默认几何体
                geometry = new THREE.BoxGeometry(1, 1, 1);
            }
            const material = new THREE.MeshStandardMaterial({
                color: data.material.color || 0xffffff,
                roughness: data.material.roughness ?? 0.5,
                metalness: data.material.metalness ?? 0.5,
                emissive: data.material.emissive ?? 0x000000,
                emissiveIntensity: data.material.emissiveIntensity ?? 1,
                opacity: data.material.opacity ?? 1,
                alphaTest: data.material.alphaTest ?? 0,
                blending: data.material.blending ?? THREE.NormalBlending,
                side: data.material.side ?? THREE.FrontSide,
                transparent: data.material.transparent ?? false,
                depthTest: data.material.depthTest ?? true,
                depthWrite: data.material.depthWrite ?? true,
                vertexColors: data.material.vertexColors ?? false,
                wireframe: data.material.wireframe ?? false,
                flatShading: data.material.flatShading ?? false
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.bid = data.bid || data.id || generateBid();
            mesh.name = data.name;
            if (data.visible !== undefined) mesh.visible = data.visible;
            mesh.position.set(data.position.x, data.position.y, data.position.z);
            mesh.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
            mesh.scale.set(data.scale.x, data.scale.y, data.scale.z);
            return mesh;
        }
    }

    /**
     * 加载 GLTF 模型
     * 支持缓存，避免重复加载
     * @param {string} url - 模型 URL
     * @param {Object} [options] - 模型实例化选项。
     * @param {boolean} [options.assignBids=true] - 是否为节点树分配新的 BID。
     * @param {string} [options.assetId] - 资源 ID。
     * @param {string} [options.assetVersionId] - 资源版本 ID。
     * @returns {Promise<THREE.Group>} 加载后的模型
     */
    async loadGLTFModel(url, options = {}) {
        if (this.modelCache.has(url)) {
            const template = this.modelCache.get(url);
            const instance = SkeletonUtils.clone(template);
            instance.animations = template.animations?.slice() || [];
            // 在 deserializeObject 应用持久化节点变换之前捕获原始姿态，
            // 防止旧场景保存的动画帧污染动画关闭后的恢复目标。
            this.sceneManager?.animationManager?.captureOriginalPose(instance);
            if (options.assignBids !== false) this.assignNewTreeBids(instance, options);
            return instance;
        }
        console.log('正在加载 GLTF 模型:', url);
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                url,
                (gltf) => {
                    console.log('GLTF 模型加载成功:', url);
                    gltf.scene.position.set(0, 0, 0);
                 
                    const model = gltf.scene;
                    // GLTFLoader 将动画片段放在 gltf.animations 上，而不是 gltf.scene 上。
                    // 模型进入缓存前保留动画；SkeletonUtils.clone 后还需显式复制到实例。
                    model.animations = Array.isArray(gltf.animations) ? gltf.animations.slice() : [];
                    model.userData.modelType = 'GLTF';
                    model.userData.modelUrl = url;
                    // 缓存原始模型作为模板
                    this.normalizeAssetNodeIds(model, url);
                    this.modelCache.set(url, model);
                    // 返回克隆的副本，确保每个实例独立且支持骨骼动画
                    const instance = SkeletonUtils.clone(model);
                    instance.animations = model.animations.slice();
                    this.sceneManager?.animationManager?.captureOriginalPose(instance);
                    if (options.assignBids !== false) this.assignNewTreeBids(instance, options);
                    resolve(instance);
                },
                (progress) => {
                    if (progress.total > 0) {
                        // console.log('加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
                    }
                },
                (error) => {
                    const errorMsg = `模型文件不存在或已被删除: ${url}`;
                    console.error('❌', errorMsg, error);
                    reject(new Error(errorMsg));
                }
            );
        });
    }

    /**
     * 加载 3D Tiles (Tileset)
     * @param {string} url - tileset.json 的 URL
     * @returns {Promise<THREE.Group>} 包装 TilesRenderer 的 Group
     */
    async loadTileset(url) {
        // console.log('正在加载 3D Tiles:', url);

        return new Promise((resolve, reject) => {
            try {
                const tilesRenderer = new TilesRenderer(url);
                tilesRenderer.fetchOptions = {
                    ...tilesRenderer.fetchOptions,
                    mode: 'cors'
                };
                tilesRenderer.setCamera(this.sceneManager.camera);
                tilesRenderer.setResolutionFromRenderer(this.sceneManager.camera, this.sceneManager.renderer);

                // 创建包装 Group
                const wrapper = new THREE.Group();
                wrapper.add(tilesRenderer.group);
                wrapper.userData.modelType = 'Tileset';
                wrapper.userData.modelUrl = url;
                wrapper.userData.tilesRenderer = tilesRenderer;
                wrapper.userData.tilesetPlacementComplete = false;
                wrapper.name = 'Tileset';

                let placed = false;
                const placeTileset = () => {
                    if (placed) return;

                    const hasRuntimeTransform = wrapper.userData.positionModified
                        || wrapper.userData.rotationModified
                        || wrapper.userData.scaleModified;
                    const runtimeTransform = hasRuntimeTransform
                        ? {
                            position: {
                                x: wrapper.position.x,
                                y: wrapper.position.y,
                                z: wrapper.position.z
                            },
                            rotation: {
                                x: wrapper.rotation.x,
                                y: wrapper.rotation.y,
                                z: wrapper.rotation.z
                            },
                            scale: {
                                x: wrapper.scale.x,
                                y: wrapper.scale.y,
                                z: wrapper.scale.z
                            }
                        }
                        : null;

                    const transform = this.getTilesetTransformElements(tilesRenderer);
                    if (transform) {
                        placed = this.placeGeoreferencedTileset(tilesRenderer, wrapper, transform);
                    }

                    if (!placed) {
                        placed = this.placeLocalTilesetFallback(tilesRenderer);
                    }

                    if (placed) {
                        // 自动定位不得覆盖已经从场景数据库恢复的对象变换。
                        const finalTransform = runtimeTransform
                            || wrapper.userData.pendingPersistedTransform;
                        if (finalTransform) {
                            this.applySerializedTransform(
                                wrapper,
                                finalTransform
                            );
                            delete wrapper.userData.pendingPersistedTransform;
                        }
                        wrapper.userData.tilesetPlacementComplete = true;
                    }
                };

                // 根元数据与模型内容可能通过不同事件到达，此处尝试完成一次定位。
                tilesRenderer.addEventListener('load-tile-set', placeTileset);
                tilesRenderer.addEventListener('load-model', placeTileset);

                tilesRenderer.addEventListener('load-tile-set-error', (event) => {
                    console.error('3D Tiles 加载失败:', event);
                });

                // 注册到 SceneManager 的动画循环中更新
                if (!this.sceneManager._tilesets) {
                    this.sceneManager._tilesets = [];
                }
                this.sceneManager._tilesets.push(tilesRenderer);

                resolve(wrapper);
            } catch (error) {
                console.error('3D Tiles 初始化失败:', error);
                reject(error);
            }
        });
    }

    /**
     * 确保 SparkRenderer 已加入场景
     * @returns {SparkRenderer}
     */
    async ensureSparkRenderer() {
        if (this.disposed || this.sceneManager?.disposed) {
            throw new Error('Cannot create SparkRenderer after disposal');
        }
        if (!this.sceneManager._sparkRenderer) {
            const { SparkRenderer } = await import('@sparkjsdev/spark');
            if (this.disposed || this.sceneManager?.disposed) {
                throw new Error('Cannot create SparkRenderer after disposal');
            }
            const sparkRenderer = new SparkRenderer({
                renderer: this.sceneManager.renderer
            });
            this.sceneManager.scene.add(sparkRenderer);
            this.sceneManager._sparkRenderer = sparkRenderer;
        }

        return this.sceneManager._sparkRenderer;
    }

    /**
     * 加载高斯泼溅
     * @param {string} url - 高斯泼溅文件 URL
     * @returns {Promise<THREE.Object3D>} 高斯泼溅对象
     */
    async loadGaussianSplat(url) {
        let splat = null;
        try {
            await this.ensureSparkRenderer();

            const { SplatMesh } = await import('@sparkjsdev/spark');
            if (this.disposed || this.sceneManager?.disposed) {
                throw new Error('Gaussian splat load cancelled');
            }

            splat = new SplatMesh({
                url,
                // Spark 原生拾取会逐个扫描全部 splat；点击改由 BVH 代理负责。
                raycastable: false
            });
            this.pendingSplatMeshes.add(splat);
            await splat.initialized;

            this.pendingSplatMeshes.delete(splat);

            if (this.disposed || this.sceneManager?.disposed) {
                splat.dispose();
                splat = null;
                throw new Error('Gaussian splat load cancelled');
            }
            const wrapper = new THREE.Group();
            wrapper.userData.modelType = 'GaussianSplat';
            wrapper.userData.modelUrl = url;
            wrapper.name = 'Gaussian Splat';

            wrapper.userData.splatMesh = splat;
            const box = splat.getBoundingBox(false);
            if (!box.isEmpty()) {
                const collider = createGaussianSplatCollider(splat, box);
                const center = box.getCenter(new THREE.Vector3());
                splat.position.sub(center);
                wrapper.userData.pivotOffset = center.toArray();
                collider.userData.selectionRoot = wrapper;
                splat.add(collider);
                wrapper.userData.splatCollider = collider;
            }

            splat.userData.selectionRoot = wrapper;
            wrapper.add(splat);

            return wrapper;
        } catch (error) {
            if (splat) {
                this.pendingSplatMeshes.delete(splat);
                if (this.disposed || this.sceneManager?.disposed) splat.dispose();
            }
            console.error('高斯泼溅初始化失败:', error);
            throw error;
        }
    }

    /**
     * 应用修改到 GLTF 模型
     * 将保存的修改（位置、旋转、材质等）重新应用到对应的子节点
     * @param {THREE.Object3D} rootObject - 模型根节点
     * @param {Object} modifications - 修改记录
     */
    applyModifications(rootObject, modifications) {
        for (const [path, mods] of Object.entries(modifications)) {
            const child = this.findObjectByPersistentKey(rootObject, path);
            if (child) {
                if (mods.visible !== undefined) {
                    child.visible = mods.visible;
                    child.userData.visibleModified = true;
                }
                if (mods.position) {
                    child.position.set(mods.position.x, mods.position.y, mods.position.z);
                    child.userData.positionModified = true;
                }
                if (mods.rotation) {
                    child.rotation.set(mods.rotation.x, mods.rotation.y, mods.rotation.z);
                    child.userData.rotationModified = true;
                }
                if (mods.scale) {
                    child.scale.set(mods.scale.x, mods.scale.y, mods.scale.z);
                    child.userData.scaleModified = true;
                }
                if (mods.material && child.material) {
                    if (mods.material.color !== undefined) child.material.color.setHex(mods.material.color);
                    if (mods.material.roughness !== undefined) child.material.roughness = mods.material.roughness;
                    if (mods.material.metalness !== undefined) child.material.metalness = mods.material.metalness;
                    if (mods.material.emissive !== undefined && child.material.emissive) child.material.emissive.setHex(mods.material.emissive);
                    if (mods.material.emissiveIntensity !== undefined) child.material.emissiveIntensity = mods.material.emissiveIntensity;
                    if (mods.material.opacity !== undefined) child.material.opacity = mods.material.opacity;
                    if (mods.material.alphaTest !== undefined) child.material.alphaTest = mods.material.alphaTest;

                    if (mods.material.blending !== undefined) child.material.blending = mods.material.blending;
                    if (mods.material.side !== undefined) child.material.side = mods.material.side;
                    if (mods.material.transparent !== undefined) child.material.transparent = mods.material.transparent;
                    if (mods.material.depthTest !== undefined) child.material.depthTest = mods.material.depthTest;
                    if (mods.material.depthWrite !== undefined) child.material.depthWrite = mods.material.depthWrite;
                    if (mods.material.vertexColors !== undefined) child.material.vertexColors = mods.material.vertexColors;
                    if (mods.material.wireframe !== undefined) child.material.wireframe = mods.material.wireframe;
                    if (mods.material.flatShading !== undefined) child.material.flatShading = mods.material.flatShading;

                    child.material.needsUpdate = true;
                    child.userData.materialModified = true;
                }
            }
        }
    }

    /**
     * 根据稳定资源节点 ID、持久化 BID 或旧版节点路径查找模型节点。
     * @param {THREE.Object3D} root - 模型根节点。
     * @param {string} key - 持久化节点键。
     * @returns {THREE.Object3D|null} 匹配节点，未找到时返回 null。
     */
    findObjectByPersistentKey(root, key) {
        let found = null;
        root.traverse((node) => {
            if (!found && (node.userData.assetNodeId === key || node.userData.bid === key)) found = node;
        });
        return found || this.findObjectByPath(root, key);
    }

    /**
     * 根据路径查找子节点
     * @param {THREE.Object3D} root - 根节点
     * @param {string} path - 节点路径
     * @returns {THREE.Object3D|null} 找到的子节点或 null
     */
    findObjectByPath(root, path) {
        const parts = path.split('/');
        let current = root;
        for (const part of parts) {
            if (part.startsWith('child_')) {
                const index = parseInt(part.split('_')[1]);
                current = current.children[index];
            } else {
                current = current.children.find(child => child.name === part);
            }
            if (!current) return null;
        }
        return current;
    }

    /**
     * 保存单个对象到数据库
     * @param {THREE.Object3D} object - 要保存的对象
     */
    async saveObject(object) {
        const data = this.serializeObject(object);
        await this.dbManager.saveObject(data);
        this.objectMap.set(object.userData.bid, data.id);
    }

    /**
     * 删除对象
     * @param {THREE.Object3D} object - 要删除的对象
     */
    async deleteObject(object) {
        await this.dbManager.deleteObject(object.userData.bid);
        this.objectMap.delete(object.userData.bid);
    }

    /**
     * 从数据源加载并恢复场景。
     * 编辑器使用此方法通过 DBManager 获取数据；对外 SDK 直接调用 restoreScene。
     * @param {string} sceneId - 场景 ID
     * @returns {Promise<Object>}
     */
    async loadScene(sceneId, options = {}) {
        if (!this.dbManager) {
            throw new Error('PersistenceManager.loadScene requires a dbManager');
        }

        this.currentSceneId = sceneId || this.currentSceneId;
        const sceneData = await this.dbManager.getSceneData(this.currentSceneId);
        const serverUrl = this.dbManager.apiBaseUrl?.replace(/\/api\/?$/, '');

        return this.restoreScene(sceneData, {
            ...options,
            serverUrl: options.serverUrl || serverUrl,
            syncEditorStore: options.syncEditorStore ?? true,
            notifyFailures: options.notifyFailures ?? true
        });
    }

    /**
     * 将已经取得的场景数据恢复到 SceneManager。
     * 这是编辑器与对外 SDK 共用的唯一场景恢复流程。
     * @param {{objects?: Array, metadata?: Object}} sceneData - 后端场景数据
     * @param {Object} [options] - 恢复选项
     * @param {string} [options.serverUrl] - 用于解析相对资源 URL 的服务端地址
     * @param {boolean} [options.showGrid] - 是否覆盖场景保存的网格显示状态
     * @param {boolean} [options.syncEditorStore] - 是否同步编辑器 Store
     * @param {boolean} [options.notifyFailures] - 是否显示对象加载失败提示
     * @param {Function} [options.onProgress] - 对象级加载进度回调
     * @returns {Promise<Object>}
     */
    async restoreScene(sceneData, options = {}) {
        if (this.disposed) throw new Error('PersistenceManager has been disposed');
        if (!this.sceneManager || this.sceneManager.disposed) {
            throw new Error('Cannot restore a scene without an active SceneManager');
        }

        const metadata = sceneData?.metadata || {};
        const objects = sceneData?.objects || [];
        const serverUrl = (options.serverUrl || '').replace(/\/$/, '');
        const syncEditorStore = options.syncEditorStore ?? Boolean(this.editorStore);
        const notifyFailures = options.notifyFailures ?? Boolean(this.editorStore);
        const failedObjects = [];
        const failedResources = [];
        const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
        let successCount = 0;
        let processedCount = 0;

        const emitProgress = (progress) => {
            if (!onProgress) return;
            try {
                onProgress({
                    totalCount: objects.length,
                    processedCount,
                    successCount,
                    failedCount: failedObjects.length,
                    percent: objects.length === 0
                        ? 100
                        : Math.round((processedCount / objects.length) * 100),
                    ...progress
                });
            } catch (error) {
                console.warn('场景加载进度回调执行失败:', error);
            }
        };

        this.sceneManager.setReady(false);
        this.sceneManager.clearScene();
        this.editorStore?.clearSelection?.();
        this.editorStore?.resetObjects?.();
        this.objectMap.clear();

        if (syncEditorStore) {
            this.editorStore?.setSceneMetadata?.({
                name: metadata.name || '未命名场景',
                description: metadata.description || '',
                cameraFar: metadata.cameraFar || 1000000,
                initialView: metadata.initialView || null,
                isFeatured: metadata.isFeatured || false
            });
        }

        if (metadata.cameraFar) {
            this.sceneManager.setCameraFar(metadata.cameraFar);
        }

        const resolveResourceUrl = (url) => {
            if (!url || /^(https?:|data:|blob:)/i.test(url) || !serverUrl) return url;
            return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
        };

        if (metadata.environmentUrl) {
            try {
                await this.sceneManager.loadEnvironment(resolveResourceUrl(metadata.environmentUrl));
            } catch (error) {
                failedResources.push({ type: 'environment', url: metadata.environmentUrl, error: error.message });
                console.warn('加载环境贴图失败:', error);
            }
        }

        if (metadata.gisConfig) {
            const gisConfig = metadata.gisConfig;
            try {
                this.sceneManager.setGisConfig(gisConfig);

                const showGrid = options.showGrid ?? gisConfig.gridVisible;
                if (showGrid && gisConfig.size) {
                    this.sceneManager.setGridHelper(true, gisConfig.size, gisConfig.size);
                }

                if (gisConfig.showBaseMap && gisConfig.baseMapUrl) {
                    this.sceneManager.setBaseMap(
                        resolveResourceUrl(gisConfig.baseMapUrl),
                        gisConfig.bounds,
                        gisConfig.size,
                        true
                    );
                }
            } catch (error) {
                failedResources.push({ type: 'gis', error: error.message });
                console.warn('恢复 GIS 配置失败:', error);
            }
        }
        this.sceneManager.emitGisConfigUpdated();

        this.setPendingNodeGraph(metadata.nodeGraph);
        this.setPendingDeletedSourceNodes(metadata.deletedSourceNodes);
        emitProgress({ phase: 'objects', status: 'ready-to-load' });

        for (const data of objects) {
            if (this.disposed || this.sceneManager.disposed) break;

            const currentObject = {
                id: data.id,
                bid: data.bid,
                name: data.name || '未命名',
                type: data.type
            };
            let status = 'success';
            let failure = null;

            emitProgress({
                phase: 'objects',
                status: 'loading',
                currentIndex: processedCount + 1,
                currentObject
            });

            try {
                const object = await this.deserializeObject(data);
                if (!object || !this.sceneManager.addObject(object)) {
                    throw new Error('场景对象未能加入 SceneManager');
                }

                this.editorStore?.addObject?.(object);
                this.objectMap.set(object.userData.bid, data.id);
                successCount++;
            } catch (error) {
                status = 'failed';
                failure = error;
                failedObjects.push({
                    ...currentObject,
                    error: error.message
                });
                console.warn(`⚠️ 对象加载失败: ${data.name || data.id}`, error);
            } finally {
                processedCount++;
                emitProgress({
                    phase: 'objects',
                    status,
                    currentIndex: processedCount,
                    currentObject,
                    error: failure?.message
                });
            }
        }

        this.applyGlobalNodeGraph();
        this.editorStore?.notifyTreeUpdate?.();

        const result = {
            complete: processedCount === objects.length && failedObjects.length === 0 && failedResources.length === 0,
            totalCount: objects.length,
            successCount,
            failedCount: failedObjects.length,
            failedObjects,
            failedResources
        };

        this.sceneManager.setReady(result.complete);
        console.log(`✅ 场景加载完成: 成功 ${successCount}/${objects.length}`);

        if (!result.complete) {
            console.warn('⚠️ 场景未完整恢复，保存功能应保持禁用:', result);
        }

        emitProgress({
            phase: 'complete',
            status: result.complete ? 'ready' : 'degraded',
            failedCount: failedObjects.length + failedResources.length,
            result
        });

        if (notifyFailures && !result.complete && typeof window !== 'undefined') {
            const failureCount = failedObjects.length + failedResources.length;
            setTimeout(() => {
                message.warning(
                    `场景有 ${failureCount} 项内容加载失败，自动保存已禁用。请刷新重试或检查资源地址。`,
                    7000
                );
            }, 500);
        }

        return result;
    }

    /**
     * 保存整个场景
     * 保存所有对象和场景元数据
     * @param {Object} [options] - 保存选项
     * @param {boolean} [options.allowIncomplete=false] - 是否显式允许保存未完整恢复的当前场景快照
     */
    async saveScene(options = {}) {
        const allowIncomplete = options.allowIncomplete === true;
        if (!this.sceneManager?.isReady && !allowIncomplete) {
            throw new Error('场景尚未完整加载，拒绝保存不完整的场景数据');
        }
        if (!this.dbManager) {
            throw new Error('PersistenceManager.saveScene requires a dbManager');
        }
        if (!this.currentSceneId) {
            console.error('未设置 sceneId，无法保存场景');
            return;
        }

        // 序列化所有对象
        const serializedObjects = this.sceneManager.objects.map(obj => this.serializeObject(obj));

        // 获取当前环境贴图 URL (需要 SceneManager 支持获取)
        const nodeGraph = this.serializeSceneGraph();
        const environmentUrl = this.sceneManager.environmentUrl || null;
        const gisConfig = this.sceneManager.gisConfig
            ? { ...this.sceneManager.gisConfig, gridVisible: this.sceneManager.gridVisible }
            : null;

        // 获取场景元数据从 Store
        const name = this.editorStore?.sceneMetadata?.name || '未命名场景';
        const description = this.editorStore?.sceneMetadata?.description || '';
        const cameraFar = this.editorStore?.sceneMetadata?.cameraFar || 1000000;

        // 批量保存到后端
        await this.dbManager.saveScene({
            objects: serializedObjects,
            id: this.currentSceneId,
            name: name,
            description: description,
            cameraFar: cameraFar,
            lastModified: Date.now(),
            objectCount: this.sceneManager.objects.length,
            environmentUrl: environmentUrl, // 保存环境贴图 URL
            gisConfig,
            nodeGraph,
            deletedSourceNodes: this.serializeDeletedSourceNodes(nodeGraph)
        });

        // 更新 objectMap
        serializedObjects.forEach(data => {
            const obj = this.sceneManager.objects.find(o => o.userData.bid === data.id);
            if (obj) {
                this.objectMap.set(obj.userData.bid, data.id);
            }
        });
    }

    /**
     * 清空场景
     * 删除数据库中的所有对象
     */
    async clearScene() {
        if (!this.currentSceneId) return;
        await this.dbManager.clearAllObjects(this.currentSceneId);
        this.objectMap.clear();
    }

    /**
     * 停止待处理任务，并释放管理器持有的加载器、缓存模型和高斯泼溅资源。
     * @returns {void}
     */
    dispose() {
        if (this.disposed) return;
        this.disposed = true;

        for (const splat of this.pendingSplatMeshes) splat.dispose?.();
        this.pendingSplatMeshes.clear();

        for (const model of this.modelCache.values()) {
            this.sceneManager?.disposeObjectResources?.(model);
        }
        this.modelCache.clear();
        this.objectMap.clear();
        this.pendingNodeGraph = [];
        this.pendingDeletedSourceNodes = [];

        this.dracoLoader?.dispose();
    }
}
