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
export async function getScenes(page = 1, pageSize = 12) {
    try {
        const response = await fetch(`${API_BASE_URL}/scene/list?page=${page}&pageSize=${pageSize}`);
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
