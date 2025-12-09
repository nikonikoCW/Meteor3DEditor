import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { message } from './utils/message.js';

/**
 * 持久化管理器
 * 负责场景对象的序列化、反序列化以及与 IndexedDB 的交互
 * 支持 GLTF 模型的增量保存（只保存修改过的属性）
 */
export class PersistenceManager {
    /**
     * 构造函数
     * @param {SceneManager} sceneManager - 场景管理器实例
     * @param {EditorStore} editorStore - 编辑器状态存储实例
     * @param {Object} dbManager - 数据库管理器实例 (依赖注入)
     */
    constructor(sceneManager, editorStore, dbManager) {
        this.sceneManager = sceneManager;
        this.editorStore = editorStore;
        this.dbManager = dbManager;
        this.objectMap = new Map();

        // 设置 DRACO 解码器
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');

        // 设置 GLTF 加载器并启用 DRACO 支持
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(dracoLoader);

        this.modelCache = new Map();
        this.currentSceneId = 'default';
    }

    /**
     * 初始化管理器
     * 连接数据库并加载场景
     * @param {string} sceneId - 场景 ID
     */
    async init(sceneId = 'default') {
        this.currentSceneId = sceneId;
        await this.dbManager.init();
        await this.loadScene(sceneId);
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
                id: object.uuid,
                type: 'GLTFModel',
                name: object.name || '',
                url: object.userData.modelUrl,
                visible: object.visible,
                position: { x: object.position.x, y: object.position.y, z: object.position.z },
                rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z },
                scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
                modifications: this.extractModifications(object)
            };
        } else {
            return {
                id: object.uuid,
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
                    blending: object.material?.blending,
                    side: object.material?.side,
                    transparent: object.material?.transparent,
                    depthTest: object.material?.depthTest,
                    depthWrite: object.material?.depthWrite,
                    vertexColors: object.material?.vertexColors
                }
            };
        }
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
                    const path = this.getObjectPath(child, rootObject);
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
                            blending: child.material.blending,
                            side: child.material.side,
                            transparent: child.material.transparent,
                            depthTest: child.material.depthTest,
                            depthWrite: child.material.depthWrite,
                            vertexColors: child.material.vertexColors
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
            const model = await this.loadGLTFModel(data.url);
            model.uuid = data.id;
            model.name = data.name;
            if (data.visible !== undefined) model.visible = data.visible;
            model.position.set(data.position.x, data.position.y, data.position.z);
            model.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
            model.scale.set(data.scale.x, data.scale.y, data.scale.z);
            if (data.modifications) {
                this.applyModifications(model, data.modifications);
            }
            return model;
        } else {
            let geometry;
            if (data.geometry.type === 'BoxGeometry') {
                const p = data.geometry.parameters;
                geometry = new THREE.BoxGeometry(p.width, p.height, p.depth);
            } else if (data.geometry.type === 'SphereGeometry') {
                const p = data.geometry.parameters;
                geometry = new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments);
            } else {
                // 默认几何体
                geometry = new THREE.BoxGeometry(1, 1, 1);
            }
            const material = new THREE.MeshStandardMaterial({
                color: data.material.color || 0xffffff,
                roughness: data.material.roughness ?? 0.5,
                metalness: data.material.metalness ?? 0.5,
                blending: data.material.blending ?? THREE.NormalBlending,
                side: data.material.side ?? THREE.FrontSide,
                transparent: data.material.transparent ?? false,
                depthTest: data.material.depthTest ?? true,
                depthWrite: data.material.depthWrite ?? true,
                vertexColors: data.material.vertexColors ?? false
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.uuid = data.id;
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
     * @returns {Promise<THREE.Group>} 加载后的模型
     */
    async loadGLTFModel(url) {
        if (this.modelCache.has(url)) {
            return SkeletonUtils.clone(this.modelCache.get(url));
        }
        console.log('正在加载 GLTF 模型:', url);
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                url,
                (gltf) => {
                    console.log('GLTF 模型加载成功:', url);
                    gltf.scene.position.set(0, 0, 0);
                    // 确保模型根节点的位置也归零，以避免加载时偏移
                    if (gltf.scene.children.length > 0) {
                        gltf.scene.children[0].position.set(0, 0, 0);
                    }
                    const model = gltf.scene;
                    model.userData.modelType = 'GLTF';
                    model.userData.modelUrl = url;
                    // 缓存原始模型作为模板
                    this.modelCache.set(url, model);
                    // 返回克隆的副本，确保每个实例独立且支持骨骼动画
                    resolve(SkeletonUtils.clone(model));
                },
                (progress) => {
                    if (progress.total > 0) {
                        console.log('加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
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
     * 应用修改到 GLTF 模型
     * 将保存的修改（位置、旋转、材质等）重新应用到对应的子节点
     * @param {THREE.Object3D} rootObject - 模型根节点
     * @param {Object} modifications - 修改记录
     */
    applyModifications(rootObject, modifications) {
        for (const [path, mods] of Object.entries(modifications)) {
            const child = this.findObjectByPath(rootObject, path);
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

                    if (mods.material.blending !== undefined) child.material.blending = mods.material.blending;
                    if (mods.material.side !== undefined) child.material.side = mods.material.side;
                    if (mods.material.transparent !== undefined) child.material.transparent = mods.material.transparent;
                    if (mods.material.depthTest !== undefined) child.material.depthTest = mods.material.depthTest;
                    if (mods.material.depthWrite !== undefined) child.material.depthWrite = mods.material.depthWrite;
                    if (mods.material.vertexColors !== undefined) child.material.vertexColors = mods.material.vertexColors;

                    child.userData.materialModified = true;
                }
            }
        }
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
        this.objectMap.set(object.uuid, data.id);
    }

    /**
     * 删除对象
     * @param {THREE.Object3D} object - 要删除的对象
     */
    async deleteObject(object) {
        await this.dbManager.deleteObject(object.uuid);
        this.objectMap.delete(object.uuid);
    }

    /**
     * 加载整个场景
     * 从数据库读取所有对象并添加到场景中
     * @param {string} sceneId - 场景 ID
     */
    async loadScene(sceneId) {
        this.currentSceneId = sceneId || this.currentSceneId;

        // 获取场景元数据和对象列表
        const sceneData = await this.dbManager.getSceneData(this.currentSceneId);

        // 清空当前场景
        this.sceneManager.clearScene();
        this.editorStore.clearSelection();
        if (typeof this.editorStore.resetObjects === 'function') {
            this.editorStore.resetObjects();
        }

        // 恢复环境贴图
        if (sceneData.metadata && sceneData.metadata.environmentUrl) {
            try {
                await this.sceneManager.loadEnvironment(sceneData.metadata.environmentUrl);
            } catch (error) {
                console.warn('加载环境贴图失败:', error);
            }
        }

        // 恢复 GIS 配置
        if (sceneData.metadata && sceneData.metadata.gisConfig) {
            this.sceneManager.setGisConfig(sceneData.metadata.gisConfig);
        }
        this.sceneManager.emitGisConfigUpdated();

        const objects = sceneData.objects || [];
        let successCount = 0;
        let failedCount = 0;
        const failedObjects = [];

        // 🛡️ 容错加载：即使部分对象加载失败，也继续加载其他对象
        for (const data of objects) {
            try {
                const object = await this.deserializeObject(data);
                this.sceneManager.addObject(object);
                this.editorStore.addObject(object);
                this.objectMap.set(object.uuid, data.id);
                successCount++;
            } catch (error) {
                failedCount++;
                failedObjects.push({
                    name: data.name || '未命名',
                    type: data.type,
                    error: error.message
                });
                console.warn(`⚠️ 对象加载失败: ${data.name || data.id}`, error);
            }
        }

        // 📊 加载结果汇总
        console.log(`✅ 场景加载完成: 成功 ${successCount}/${objects.length}`);
        if (failedCount > 0) {
            console.warn(`⚠️ ${failedCount} 个对象加载失败（可能是引用的资产已被删除）:`, failedObjects);
            // 通知用户有对象加载失败
            if (typeof window !== 'undefined' && failedCount > 0) {
                setTimeout(() => {
                    message.warning(
                        `场景加载完成，但有 ${failedCount} 个对象加载失败（可能引用的文件已被删除）。\n\n建议重新保存场景以清理无效引用。`,
                        5000 // 显示 5 秒，因为这是重要警告
                    );
                }, 500);
            }
        }
    }

    /**
     * 保存整个场景
     * 保存所有对象和场景元数据
     */
    async saveScene() {
        if (!this.currentSceneId) {
            console.error('未设置 sceneId，无法保存场景');
            return;
        }

        // 序列化所有对象
        const serializedObjects = this.sceneManager.objects.map(obj => this.serializeObject(obj));

        // 获取当前环境贴图 URL (需要 SceneManager 支持获取)
        const environmentUrl = this.sceneManager.environmentUrl || null;
        const gisConfig = this.sceneManager.gisConfig
            ? { ...this.sceneManager.gisConfig, gridVisible: this.sceneManager.gridVisible }
            : null;

        // 批量保存到后端
        await this.dbManager.saveScene({
            objects: serializedObjects,
            id: this.currentSceneId,
            lastModified: Date.now(),
            objectCount: this.sceneManager.objects.length,
            environmentUrl: environmentUrl, // 保存环境贴图 URL
            gisConfig
        });

        // 更新 objectMap
        serializedObjects.forEach(data => {
            const obj = this.sceneManager.objects.find(o => o.uuid === data.id);
            if (obj) {
                this.objectMap.set(obj.uuid, data.id);
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
}
