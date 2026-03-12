/**
 * 场景管理 API 服务 (AI Scene 专用)
 */

import { API_BASE_URL } from '../config';

/**
 * 获取场景列表（支持分页）
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
 * 获取单个场景详细信息
 */
export async function getSceneData(sceneId) {
    try {
        const response = await fetch(`${API_BASE_URL}/scene/load?sceneId=${sceneId}`);
        const data = await response.json();

        if (data.success) {
            return data.metadata || { name: '未命名场景' };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error(`获取场景信息失败 [${sceneId}]:`, error);
        throw error;
    }
}
