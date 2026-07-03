const fs = require('fs');
const path = require('path');
const upyun = require('upyun');

const SERVER_ROOT = path.resolve(__dirname, '../..');

function requireConfig() {
    const config = {
        serviceName: process.env.UPYUN_SERVICE_NAME,
        operatorName: process.env.UPYUN_OPERATOR_NAME,
        password: process.env.UPYUN_PASSWORD,
        passwordType: (process.env.UPYUN_PASSWORD_TYPE || 'plain').toLowerCase(),
        publicDomain: process.env.UPYUN_DOMAIN,
        apiDomain: process.env.UPYUN_API_DOMAIN || 'v0.api.upyun.com',
        pathPrefix: process.env.UPYUN_PATH_PREFIX || '/meteor3d/assets'
    };

    const missing = Object.entries(config)
        .filter(([key, value]) => ['serviceName', 'operatorName', 'password', 'publicDomain'].includes(key) && !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        throw new Error(`又拍云配置不完整，缺少: ${missing.join(', ')}`);
    }

    config.publicDomain = config.publicDomain.replace(/\/+$/, '');
    config.pathPrefix = normalizeRemoteDir(config.pathPrefix);

    return config;
}

function normalizeRemoteDir(dir) {
    const normalized = `/${String(dir || '')}`
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/\/+$/, '');

    return normalized === '' ? '/' : normalized;
}

function isFilesystemAbsolutePath(filePath) {
    return /^[a-zA-Z]:[\\/]/.test(filePath) || /^\\\\/.test(filePath);
}

function resolveLocalPath(filePath) {
    if (!filePath) return null;

    if (isFilesystemAbsolutePath(filePath)) {
        return filePath;
    }

    const normalized = filePath.replace(/^\/+/, '').replace(/\\/g, '/');
    return path.join(SERVER_ROOT, normalized);
}

function getExtension(sourcePath, fallbackName) {
    return path.extname(fallbackName || '') || path.extname(sourcePath || '') || '';
}

function buildAssetRemoteDir(config, asset) {
    return path.posix.join(config.pathPrefix, asset._id.toString());
}

function buildRemotePath(config, asset, kind, sourcePath, fallbackName) {
    const extension = getExtension(sourcePath, fallbackName);
    return path.posix.join(buildAssetRemoteDir(config, asset), `${kind}${extension}`);
}

function buildPublicUrl(publicDomain, remotePath) {
    return `${publicDomain}${encodeURI(remotePath)}`;
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getContentType(localPath) {
    const ext = path.extname(localPath || '').toLowerCase();
    const contentTypes = {
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.zip': 'application/zip',
        '.hdr': 'application/octet-stream',
        '.exr': 'application/octet-stream'
    };

    return contentTypes[ext] || 'application/octet-stream';
}

function createClient(config) {
    const service = new upyun.Service(config.serviceName, config.operatorName, config.password);

    if (config.passwordType === 'md5') {
        service.password = config.password.toLowerCase();
    }

    return new upyun.Client(service, {
        domain: config.apiDomain,
        protocol: 'https'
    });
}

function remotePathFromUrl(publicDomain, url) {
    if (!url || typeof url !== 'string') return null;

    if (url.startsWith('/')) {
        return decodeURI(url);
    }

    const normalizedDomain = publicDomain.replace(/\/+$/, '');
    if (url.startsWith(normalizedDomain)) {
        const pathname = url.slice(normalizedDomain.length) || '/';
        return decodeURI(pathname);
    }

    try {
        return decodeURI(new URL(url).pathname);
    } catch (error) {
        return null;
    }
}

function collectCloudRemotePaths(asset, config) {
    const candidates = [
        asset.cloudOriginalUrl,
        asset.cloudThumbnailUrl,
        asset.cloudUrls?.file,
        asset.cloudUrls?.original,
        asset.cloudUrls?.thumbnail,
        asset.cloudUrls?.compressed
    ];

    return [...new Set(candidates
        .map(url => remotePathFromUrl(config.publicDomain, url))
        .filter(Boolean))];
}

function collectCloudRemoteDirs(asset, config, remotePaths) {
    const dirs = remotePaths
        .map(remotePath => path.posix.dirname(remotePath))
        .filter(dir => dir && dir !== '.' && dir !== '/');

    dirs.push(buildAssetRemoteDir(config, asset));

    return [...new Set(dirs)]
        .sort((a, b) => b.split('/').length - a.split('/').length);
}

async function deleteCloudDir(client, remoteDir) {
    const startTime = Date.now();
    console.log(`[Upyun] 开始删除云端目录: ${remoteDir}`);

    try {
        const result = await client.deleteDir(remoteDir);
        if (result) {
            console.log(`[Upyun] 云端目录删除完成: ${remoteDir}, 耗时 ${Date.now() - startTime}ms`);
            return true;
        }

        console.warn(`[Upyun] 云端目录删除返回 false，可能目录不存在或非空: ${remoteDir}`);
        return false;
    } catch (error) {
        const status = error.response?.status;
        if (status === 404 || /status code 404/.test(error.message || '')) {
            console.warn(`[Upyun] 云端目录不存在，跳过: ${remoteDir}`);
            return false;
        }

        console.warn(`[Upyun] 云端目录删除失败，继续删除本地资产: ${remoteDir}`, error.message);
        return false;
    }
}
async function deleteCloudFile(client, remotePath) {
    const startTime = Date.now();
    console.log(`[Upyun] 开始删除云端文件: ${remotePath}`);

    try {
        const result = await client.deleteFile(remotePath);
        if (result) {
            console.log(`[Upyun] 云端文件删除完成: ${remotePath}, 耗时 ${Date.now() - startTime}ms`);
            return true;
        }

        console.warn(`[Upyun] 云端文件删除返回 false，可能文件不存在: ${remotePath}`);
        return false;
    } catch (error) {
        const status = error.response?.status;
        if (status === 404 || /status code 404/.test(error.message || '')) {
            console.warn(`[Upyun] 云端文件不存在，跳过: ${remotePath}`);
            return false;
        }

        console.warn(`[Upyun] 云端文件删除失败，继续删除本地资产: ${remotePath}`, error.message);
        return false;
    }
}
async function uploadFile(client, localPath, remotePath, label) {
    if (!localPath || !fs.existsSync(localPath)) {
        console.error(`[Upyun] ${label} 本地文件不存在: ${localPath || '空路径'}`);
        throw new Error(`本地文件不存在: ${localPath || '空路径'}`);
    }

    const stat = fs.statSync(localPath);
    const contentType = getContentType(localPath);
    const startTime = Date.now();

    console.log(`[Upyun] ${label} 开始上传`);
    console.log(`[Upyun] ${label} 本地路径: ${localPath}`);
    console.log(`[Upyun] ${label} 远端路径: ${remotePath}`);
    console.log(`[Upyun] ${label} 文件大小: ${formatBytes(stat.size)}, Content-Type: ${contentType}`);

    const result = await client.putFile(remotePath, fs.createReadStream(localPath), {
        'Content-Length': stat.size,
        'Content-Type': contentType
    });

    if (!result) {
        console.error(`[Upyun] ${label} 上传失败: ${remotePath}`);
        throw new Error(`又拍云上传失败: ${remotePath}`);
    }

    console.log(`[Upyun] ${label} 上传完成，耗时 ${Date.now() - startTime}ms`);
    return result;
}

async function uploadAssetFiles(asset) {
    const config = requireConfig();
    console.log(`[Upyun] 准备上云 assetId=${asset._id}, name=${asset.originalName || asset.name}`);
    console.log(`[Upyun] 服务=${config.serviceName}, 操作员=${config.operatorName}, API=${config.apiDomain}, 目录前缀=${config.pathPrefix}`);

    const client = createClient(config);
    const originalLocalPath = resolveLocalPath(asset.filePath);
    const originalRemotePath = buildRemotePath(config, asset, 'original', asset.filePath, asset.originalName);

    console.log(`[Upyun] 原始文件路径解析: ${asset.filePath} -> ${originalLocalPath}`);
    await uploadFile(client, originalLocalPath, originalRemotePath, '原始文件');

    const result = {
        originalPath: originalRemotePath,
        originalUrl: buildPublicUrl(config.publicDomain, originalRemotePath),
        thumbnailPath: null,
        thumbnailUrl: null
    };

    if (asset.thumbnail) {
        const thumbnailLocalPath = resolveLocalPath(asset.thumbnail);
        const thumbnailRemotePath = buildRemotePath(config, asset, 'thumbnail', asset.thumbnail, 'thumbnail.jpg');

        console.log(`[Upyun] 缩略图路径解析: ${asset.thumbnail} -> ${thumbnailLocalPath}`);
        await uploadFile(client, thumbnailLocalPath, thumbnailRemotePath, '缩略图');

        result.thumbnailPath = thumbnailRemotePath;
        result.thumbnailUrl = buildPublicUrl(config.publicDomain, thumbnailRemotePath);
    } else {
        console.log('[Upyun] 当前资产没有缩略图，跳过缩略图上传');
    }

    console.log(`[Upyun] 上云文件处理完成 assetId=${asset._id}`);
    return result;
}

async function deleteAssetCloudFiles(asset) {
    const config = requireConfig();
    const remotePaths = collectCloudRemotePaths(asset, config);
    const remoteDirs = collectCloudRemoteDirs(asset, config, remotePaths);

    if (remotePaths.length === 0 && remoteDirs.length === 0) {
        console.log(`[Upyun] 资产没有云端文件记录，跳过云端删除 assetId=${asset._id}`);
        return { deleted: [], skipped: [], deletedDirs: [], skippedDirs: [] };
    }

    console.log(`[Upyun] 准备删除云端文件 assetId=${asset._id}, fileCount=${remotePaths.length}, dirCount=${remoteDirs.length}`);
    const client = createClient(config);
    const deleted = [];
    const skipped = [];
    const deletedDirs = [];
    const skippedDirs = [];

    for (const remotePath of remotePaths) {
        const ok = await deleteCloudFile(client, remotePath);
        if (ok) {
            deleted.push(remotePath);
        } else {
            skipped.push(remotePath);
        }
    }

    for (const remoteDir of remoteDirs) {
        const ok = await deleteCloudDir(client, remoteDir);
        if (ok) {
            deletedDirs.push(remoteDir);
        } else {
            skippedDirs.push(remoteDir);
        }
    }

    console.log(`[Upyun] 云端删除结束 assetId=${asset._id}, deletedFiles=${deleted.length}, skippedFiles=${skipped.length}, deletedDirs=${deletedDirs.length}, skippedDirs=${skippedDirs.length}`);
    return { deleted, skipped, deletedDirs, skippedDirs };
}
module.exports = {
    uploadAssetFiles,
    deleteAssetCloudFiles
};