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
 * 获取资产处理状态
 * @param {string} id - 资产 ID
 * @returns {Promise<Object>}
 */
export async function getProcessingStatus(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/${id}/status`);
        const data = await response.json();

        if (data.success) {
            return {
                status: data.processingStatus,
                error: data.processingError,
                processedFiles: data.processedFiles,
                bounds: data.bounds,
                stats: data.stats
            };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('获取处理状态失败:', error);
        throw error;
    }
}

/**
 * 轮询等待资产处理完成
 * @param {string} id - 资产 ID
 * @param {number} interval - 轮询间隔（毫秒）
 * @param {number} maxAttempts - 最大尝试次数
 * @returns {Promise<Object>}
 */
export async function waitForProcessing(id, interval = 2000, maxAttempts = 60) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const check = async () => {
            attempts++;
            try {
                const result = await getProcessingStatus(id);
                if (result.status === 'ready') {
                    resolve(result);
                } else if (result.status === 'failed') {
                    reject(new Error(result.error || '资产处理失败'));
                } else if (attempts >= maxAttempts) {
                    reject(new Error('资产处理超时'));
                } else {
                    setTimeout(check, interval);
                }
            } catch (error) {
                reject(error);
            }
        };

        check();
    });
}

function toBackendUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${ASSET_BASE_URL}${normalizedPath}`;
}

export function getCloudAssetUrl(asset, { preferCompressed = false } = {}) {
    if (!asset) return '';

    const urls = preferCompressed
        ? [asset.cloudUrls?.compressed, asset.cloudUrls?.file, asset.cloudUrls?.original, asset.cloudOriginalUrl]
        : [asset.cloudUrls?.file, asset.cloudUrls?.original, asset.cloudOriginalUrl, asset.cloudUrls?.compressed];

    return urls.find(Boolean) || '';
}

/**
 * 获取资产 URL（原始版本）
 * 优先使用云端 URL，降级到本地路径
 * @param {Object} asset - 资产对象
 * @returns {string}
 */
export function getAssetUrl(asset) {
    const cloudUrl = getCloudAssetUrl(asset);
    if (cloudUrl) return cloudUrl;

    return toBackendUrl(asset?.url);
}

/**
 * 获取压缩后的资产 URL。
 * 模型处理完成后优先使用云端 compressed 版本，其次云端原始文件，再降级到本地 compressed/original。
 * @param {Object} asset - 资产对象
 * @returns {string}
 */
export function getCompressedAssetUrl(asset) {
    const cloudUrl = getCloudAssetUrl(asset, { preferCompressed: true });
    if (cloudUrl) return cloudUrl;

    if (asset.processingStatus === 'ready' && asset.processedFiles?.compressed) {
        return toBackendUrl(asset.processedFiles.compressed);
    }

    return getAssetUrl(asset);
}

/**
 * 获取模型的最佳加载 URL
 * 对于模型类型，优先使用云端或本地 compressed 版本
 * @param {Object} asset - 资产对象
 * @returns {string}
 */
export function getModelUrl(asset) {
    if (asset.type === 'model') {
        return getCompressedAssetUrl(asset);
    }
    return getAssetUrl(asset);
}

/**
 * 获取指定 LOD 级别的模型 URL
 * @param {Object} asset - 资产对象
 * @param {number} level - LOD 级别 (0, 1, 2)
 * @returns {string|null}
 */
export function getLodUrl(asset, level = 0) {
    if (asset.processingStatus !== 'ready' || !asset.processedFiles) {
        return null;
    }

    const lodKey = `lod${level}`;
    const lodPath = asset.processedFiles[lodKey];

    if (lodPath) {
        return toBackendUrl(lodPath);
    }

    return null;
}
