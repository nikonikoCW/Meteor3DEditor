/**
 * 场景管理 API 服务
 */

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * 获取场景列表
 * @returns {Promise<Array>}
 */
export async function getScenes() {
    try {
        const response = await fetch(`${API_BASE_URL}/scene/list`);
        const data = await response.json();

        if (data.success) {
            return data.scenes;
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
