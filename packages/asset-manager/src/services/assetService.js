/**
 * 资产管理 API 服务
 */

import { API_BASE_URL, ASSET_BASE_URL } from '../config';


/**
 * 上传资产
 * @param {File} file - 要上传的文件
 * @param {Blob} thumbnail - 缩略图文件 (可选)
 * @param {Function} onProgress - 上传进度回调
 * @returns {Promise<Object>}
 */
export async function uploadAsset(file, thumbnail = null, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    if (thumbnail) {
        formData.append('thumbnail', thumbnail, 'thumbnail.jpg');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/assets/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('上传资产失败:', error);
        throw error;
    }
}

/**
 * 获取资产列表
 * @param {string} type - 资产类型过滤 (可选)
 * @returns {Promise<Array>}
 */
export async function getAssets(type = null) {
    try {
        const url = type
            ? `${API_BASE_URL}/assets?type=${type}`
            : `${API_BASE_URL}/assets`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            return data.assets;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('获取资产列表失败:', error);
        throw error;
    }
}

/**
 * 获取单个资产
 * @param {string} id - 资产 ID
 * @returns {Promise<Object>}
 */
export async function getAsset(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/${id}`);
        const data = await response.json();

        if (data.success) {
            return data.asset;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('获取资产失败:', error);
        throw error;
    }
}

/**
 * 删除资产
 * @param {string} id - 资产 ID
 * @returns {Promise<void>}
 */
export async function deleteAsset(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('删除资产失败:', error);
        throw error;
    }
}

/**
 * 下载资产
 * @param {string} id - 资产 ID
 * @param {string} filename - 文件名
 */
export function downloadAsset(id, filename) {
    const url = `${API_BASE_URL}/assets/${id}/download`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 获取资产 URL
 * @param {Object} asset - 资产对象
 * @returns {string}
 */
export function getAssetUrl(asset) {
    return `${ASSET_BASE_URL}${asset.url}`;
}
