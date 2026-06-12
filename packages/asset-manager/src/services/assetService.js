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
 * 获取资产列表（支持分页）
 * @param {string} type - 资产类型过滤 (可选)
 * @param {number} page - 页码，默认 1
 * @param {number} pageSize - 每页数量，默认 10
 * @returns {Promise<{assets: Array, pagination: Object}>}
 */
export async function getAssets(type = null, page = 1, pageSize = 10) {
    try {
        let url = `${API_BASE_URL}/assets?page=${page}&pageSize=${pageSize}`;
        if (type) {
            url += `&type=${type}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            return {
                assets: data.assets,
                pagination: data.pagination
            };
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

/**
 * 获取资产处理状态
 * @param {string} id - 资产 ID
 * @returns {Promise<Object>}
 */
export async function getProcessingStatus(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/${id}/status`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取处理状态失败:', error);
        throw error;
    }
}

/**
 * 重新处理资产
 * @param {string} id - 资产 ID
 * @returns {Promise<void>}
 */
export async function reprocessAsset(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/${id}/reprocess`, {
            method: 'POST'
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('重新处理请求失败:', error);
        throw error;
    }
}

/**
 * 轮询等待处理完成
 * @param {string} assetId - 资产 ID
 * @param {number} interval - 轮询间隔 (ms)
 * @param {number} timeout - 超时时间 (ms)
 * @returns {Promise<Object>}
 */
export async function waitForProcessing(assetId, interval = 2000, timeout = 300000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const check = async () => {
            if (Date.now() - startTime > timeout) {
                reject(new Error('处理超时'));
                return;
            }

            try {
                const result = await getProcessingStatus(assetId);

                if (result.processingStatus === 'ready') {
                    resolve(result);
                } else if (result.processingStatus === 'failed') {
                    reject(new Error(result.processingError || '处理失败'));
                } else {
                    // pending 或 processing 状态，继续轮询
                    setTimeout(check, interval);
                }
            } catch (error) {
                // 网络错误等，稍后重试
                console.warn('轮询状态出错:', error);
                setTimeout(check, interval);
            }
        };
        check();
    });
}

/**
 * 上传缩略图 (延迟生成)
 * @param {string} assetId - 资产 ID
 * @param {Blob} thumbnailBlob - 缩略图 Blob
 * @returns {Promise<Object>}
 */
export async function uploadThumbnail(assetId, thumbnailBlob) {
    const formData = new FormData();
    formData.append('thumbnail', thumbnailBlob, 'thumbnail.jpg');

    try {
        const response = await fetch(`${API_BASE_URL}/assets/${assetId}/thumbnail`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('上传缩略图失败:', error);
        throw error;
    }
}

/**
 * 获取需要生成缩略图的模型资产
 * 条件: type=model, processingStatus=ready, thumbnail=null
 * @returns {Promise<Array>}
 */
export async function getAssetsWithoutThumbnail() {
    try {
        const result = await getAssets('model', 1, 100); // 获取所有模型
        const assets = result.assets || [];
        // 过滤出处理完成但无缩略图的模型
        return assets.filter(asset =>
            asset.processingStatus === 'ready' &&
            !asset.thumbnail &&
            asset.processedFiles?.lod2 // 确保有 LOD2 可用
        );
    } catch (error) {
        console.error('获取待生成缩略图资产失败:', error);
        return [];
    }
}

/**
 * 注册 3D Tiles (Tileset)
 * @param {Object} options - 注册参数
 * @param {string} options.name - 资产名称
 * @param {string} options.tilesetUrl - tileset.json 的 URL
 * @returns {Promise<Object>}
 */
export async function registerTileset({ name, tilesetUrl }) {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/register-tileset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, tilesetUrl })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('注册 3D Tiles 失败:', error);
        throw error;
    }
}

/**
 * 注册高斯泼溅
 * @param {Object} options - 注册参数
 * @param {string} options.name - 资产名称
 * @param {string} options.gaussianSplatUrl - 高斯泼溅资产 URL
 * @returns {Promise<Object>}
 */
export async function registerGaussianSplat({ name, gaussianSplatUrl }) {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/register-gaussian-splat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, gaussianSplatUrl })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('注册高斯泼溅失败:', error);
        throw error;
    }
}
