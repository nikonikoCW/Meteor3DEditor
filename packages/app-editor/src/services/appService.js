import { API_BASE_URL } from '../config';

/**
 * App API 服务
 * 用于与后端 App CRUD API 通信
 */

/**
 * 获取应用列表（支持分页）
 * @param {number} page - 页码，默认 1
 * @param {number} pageSize - 每页数量，默认 10
 */
export async function getAppList(page = 1, pageSize = 10, category = 'normal') {
    const params = new URLSearchParams({ page, pageSize, category });
    const response = await fetch(`${API_BASE_URL}/app/list?${params}`);
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || '获取应用列表失败');
    }
    return {
        apps: data.apps,
        pagination: data.pagination
    };
}

/**
 * 设置或取消应用的精品案例状态
 * @param {string} appId
 * @param {boolean} isFeatured
 */
export async function updateAppFeaturedStatus(appId, isFeatured) {
    const response = await fetch(`${API_BASE_URL}/app/${appId}/featured`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isFeatured })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.error || '更新精品案例状态失败');
    }
    return data.app;
}

/**
 * 获取应用详情
 * @param {string} appId 
 */
export async function getApp(appId) {
    const response = await fetch(`${API_BASE_URL}/app/${appId}`);
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || '获取应用详情失败');
    }
    return data.app;
}

/**
 * 创建应用
 * @param {Object} appData - { name, description, canvas, widgets }
 */
export async function createApp(appData) {
    const response = await fetch(`${API_BASE_URL}/app`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(appData)
    });
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || '创建应用失败');
    }
    return data;
}

/**
 * 更新应用 (全量保存)
 * @param {string} appId 
 * @param {Object} appData - { name, description, canvas, widgets }
 */
export async function updateApp(appId, appData) {
    const response = await fetch(`${API_BASE_URL}/app/${appId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(appData)
    });
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || '更新应用失败');
    }
    return data.app;
}

/**
 * 删除应用
 * @param {string} appId 
 */
export async function deleteApp(appId) {
    const response = await fetch(`${API_BASE_URL}/app/${appId}`, {
        method: 'DELETE'
    });
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || '删除应用失败');
    }
    return true;
}
