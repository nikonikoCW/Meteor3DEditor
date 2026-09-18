/**
 * 场景管理 API 服务
 */

import { API_BASE_URL } from '../config';


/**
 * 获取场景列表（支持分页）
 * @param {number} page - 页码，默认 1
 * @param {number} pageSize - 每页数量，默认 12
 * @returns {Promise<{scenes: Array, pagination: Object}>}
 */
export async function getScenes(page = 1, pageSize = 12, category = 'normal') {
    try {
        const params = new URLSearchParams({ page, pageSize, category });
        const response = await fetch(`${API_BASE_URL}/scene/list?${params}`);
        const data = await response.json();

        if (data.success) {
            return {
                scenes: data.scenes,
                pagination: data.pagination
            };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('获取场景列表失败:', error);
        throw error;
    }
}

/**
 * 更新场景的精品案例状态
 * @param {string} sceneId - 场景 ID
 * @param {boolean} isFeatured - 是否为精品案例
 * @returns {Promise<Object>}
 */
export async function updateSceneFeaturedStatus(sceneId, isFeatured) {
    try {
        const response = await fetch(`${API_BASE_URL}/scene/${sceneId}/featured`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFeatured })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || '更新精品案例状态失败');
        }

        return data.scene;
    } catch (error) {
        console.error(`更新精品案例状态失败 [${sceneId}]:`, error);
        throw error;
    }
}
/**
 * 创建新场景
 * @param {string} name - 场景名称
 * @param {string} description - 场景描述
 * @returns {Promise<Object>}
 */
export async function createScene(name, description) {
    try {
        const response = await fetch(`${API_BASE_URL}/scene/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description })
        });

        const data = await response.json();

        if (data.success) {
            return data.scene;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('创建场景失败:', error);
        throw error;
    }
}

/**
 * 删除场景
 * @param {string} sceneId - 场景 ID
 * @returns {Promise<void>}
 */
export async function deleteScene(sceneId) {
    try {
        const response = await fetch(`${API_BASE_URL}/scene/${sceneId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('删除场景失败:', error);
        throw error;
    }
}

/**
 * 获取单个场景详细信息
 * @param {string} sceneId - 场景 ID
 * @returns {Promise<Object>}
 */
export async function getSceneData(sceneId) {
    try {
        const response = await fetch(`${API_BASE_URL}/scene/load?sceneId=${sceneId}`);
        const data = await response.json();

        if (data.success) {
            // 返回包含 metadata 的基础信息供展示使用
            return data.metadata || { name: '未命名场景' };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error(`获取场景信息失败 [${sceneId}]:`, error);
        throw error;
    }
}
/**
 * 保存场景初始视角
 * @param {string} sceneId - 场景 ID
 * @param {{position: Object, target: Object}} view - 当前相机视角
 * @returns {Promise<Object>}
 */
export async function saveInitialView(sceneId, view) {
    try {
        const response = await fetch(`${API_BASE_URL}/scene/${sceneId}/initial-view`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(view)
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || '初始视角保存失败');
        }

        return data.initialView;
    } catch (error) {
        console.error(`保存初始视角失败 [${sceneId}]:`, error);
        throw error;
    }
}

/**
 * 上传场景封面图
 * @param {string} sceneId - 场景 ID
 * @param {Blob} thumbnail - PNG 封面图
 * @returns {Promise<string>} 封面图 URL
 */
export async function uploadSceneThumbnail(sceneId, thumbnail) {
    try {
        const formData = new FormData();
        formData.append('thumbnail', thumbnail, 'scene-cover.png');

        const response = await fetch(`${API_BASE_URL}/scene/${sceneId}/thumbnail`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || '场景封面保存失败');
        }

        return data.thumbnail;
    } catch (error) {
        console.error(`保存场景封面失败 [${sceneId}]:`, error);
        throw error;
    }
}
