// Meteor3D 的数据管理器
// 使用后端 API 进行数据持久化
export class DBManager {
    constructor(config = {}) {
        this.apiBaseUrl = config.apiBaseUrl || 'http://localhost:3001/api';
    }

    /**
     * 初始化数据库连接
     * 对于 API 模式，这里只是一个占位符
     * @returns {Promise<void>}
     */
    async init() {
        console.log('DBManager 初始化完成（使用后端 API）');
        return Promise.resolve();
    }

    /**
     * 保存或更新对象
     * @param {Object} objectData - 要保存的对象数据
     * @returns {Promise<any>}
     */
    async saveObject(objectData) {
        // 单个对象保存暂时不实现，使用批量保存
        console.log('单个对象保存已弃用，请使用 saveScene 批量保存');
        return Promise.resolve();
    }

    /**
     * 根据 ID 获取对象
     * @param {string} id - 对象 ID
     * @returns {Promise<Object>} 对象数据
     */
    async getObject(id) {
        // 暂不实现单个对象获取
        console.warn('单个对象获取未实现');
        return Promise.resolve(null);
    }

    /**
     * 获取所有对象
     * @param {string} sceneId - 场景 ID
     * @returns {Promise<Array>} 对象数据数组
     */
    async getAllObjects(sceneId = 'default') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/scene/load?sceneId=${sceneId}`);
            const data = await response.json();

            if (data.success) {
                return data.objects || [];
            } else {
                console.error('加载场景失败:', data.message);
                return [];
            }
        } catch (error) {
            console.error('获取所有对象失败:', error);
            return [];
        }
    }

    /**
     * 删除对象
     * @param {string} id - 要删除的对象 ID
     * @returns {Promise<void>}
     */
    async deleteObject(id) {
        // 暂不实现单个对象删除
        console.warn('单个对象删除未实现');
        return Promise.resolve();
    }

    /**
     * 清空所有对象
     * @param {string} sceneId - 场景 ID
     * @returns {Promise<void>}
     */
    async clearAllObjects(sceneId = 'default') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/scene/clear?sceneId=${sceneId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (!data.success) {
                console.error('清空场景失败:', data.message);
            }
        } catch (error) {
            console.error('清空所有对象失败:', error);
        }
    }

    /**
     * 保存场景（批量保存所有对象）
     * @param {Object} sceneData - 场景数据，包含 objects 数组和 environmentUrl
     * @returns {Promise<any>}
     */
    async saveScene(sceneData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/scene/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    objects: sceneData.objects || [],
                    metadata: {
                        sceneId: sceneData.id || 'default',
                        name: sceneData.name,
                        description: sceneData.description,
                        lastModified: sceneData.lastModified || Date.now(),
                        objectCount: sceneData.objectCount || 0,
                        environmentUrl: sceneData.environmentUrl || null // 保存环境贴图 URL
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('场景保存成功:', data.message);
                return data;
            } else {
                console.error('保存场景失败:', data.message);
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('保存场景失败:', error);
            throw error;
        }
    }

    /**
     * 获取场景数据（包含对象和元数据）
     * @param {string} sceneId - 场景 ID
     * @returns {Promise<Object>} 场景数据 { objects: [], metadata: {} }
     */
    async getSceneData(sceneId = 'default') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/scene/load?sceneId=${sceneId}`);
            const data = await response.json();

            if (data.success) {
                return {
                    objects: data.objects || [],
                    metadata: data.metadata || {}
                };
            } else {
                console.error('加载场景失败:', data.message);
                return { objects: [], metadata: {} };
            }
        } catch (error) {
            console.error('获取场景数据失败:', error);
            return { objects: [], metadata: {} };
        }
    }

    /**
     * 获取场景元数据
     * @param {string} id - 场景 ID
     * @returns {Promise<Object>} 场景数据
     */
    async getScene(id = 'default') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/scene/load?sceneId=${id}`);
            const data = await response.json();

            if (data.success) {
                return data.metadata;
            } else {
                console.error('获取场景元数据失败:', data.message);
                return null;
            }
        } catch (error) {
            console.error('获取场景元数据失败:', error);
            return null;
        }
    }
}

