/**
 * 又拍云服务模块
 * 封装文件上传、删除等云存储操作
 */
const upyun = require('upyun');
const fs = require('fs');
const path = require('path');
const config = require('../config/upyun');

// 创建又拍云服务实例
const service = new upyun.Service(
    config.serviceName,
    config.operatorName,
    config.password
);
const client = new upyun.Client(service);

/**
 * 上传文件到又拍云
 * @param {string} localPath - 本地文件绝对路径
 * @param {string} remotePath - 云端路径 (如 /assets/compressed/xxx.glb)
 * @returns {Promise<string|null>} 成功返回完整 URL，失败返回 null
 */
async function uploadFile(localPath, remotePath) {
    try {
        // 检查本地文件是否存在
        if (!fs.existsSync(localPath)) {
            console.error(`[Upyun] 本地文件不存在: ${localPath}`);
            return null;
        }

        const fileBuffer = fs.readFileSync(localPath);
        const result = await client.putFile(remotePath, fileBuffer);

        if (result) {
            const fullUrl = `${config.domain}${remotePath}`;
            console.log(`[Upyun] 上传成功: ${fullUrl}`);
            return fullUrl;
        }
        console.error(`[Upyun] 上传返回失败: ${remotePath}`);
        return null;
    } catch (error) {
        console.error(`[Upyun] 上传失败: ${localPath}`, error.message);
        return null;
    }
}

/**
 * 删除云端文件
 * @param {string} remotePath - 云端路径
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteFile(remotePath) {
    try {
        if (!remotePath) return false;

        await client.deleteFile(remotePath);
        console.log(`[Upyun] 删除成功: ${remotePath}`);
        return true;
    } catch (error) {
        console.error(`[Upyun] 删除失败: ${remotePath}`, error.message);
        return false;
    }
}

/**
 * 从完整 URL 提取云端路径
 * @param {string} fullUrl - 完整 URL (如 https://youpaiyun.meteor3d.cn/assets/xxx.glb)
 * @returns {string|null} 云端路径 (如 /assets/xxx.glb)
 */
function extractRemotePath(fullUrl) {
    if (!fullUrl || !config.domain) return null;
    if (!fullUrl.startsWith(config.domain)) return null;
    return fullUrl.replace(config.domain, '');
}

/**
 * 批量上传文件
 * @param {Array<{localPath: string, remotePath: string}>} files - 文件列表
 * @returns {Promise<Object>} 包含成功和失败文件的结果
 */
async function uploadFiles(files) {
    const results = {
        success: [],
        failed: []
    };

    for (const file of files) {
        const url = await uploadFile(file.localPath, file.remotePath);
        if (url) {
            results.success.push({ ...file, url });
        } else {
            results.failed.push(file);
        }
    }

    return results;
}

module.exports = {
    uploadFile,
    deleteFile,
    extractRemotePath,
    uploadFiles
};
