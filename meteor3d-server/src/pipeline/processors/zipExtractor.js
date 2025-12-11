/**
 * ZIP 解压处理器
 * 处理上传的压缩包，提取模型文件
 */
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const SUPPORTED_EXTENSIONS = ['.gltf', '.glb', '.obj', '.fbx', '.stl'];

/**
 * 解压 ZIP 并查找模型文件
 * @param {Object} context - 处理上下文
 * @returns {string} 解压后的主模型文件路径
 */
async function extractZip(context) {
    const { inputPath, assetId } = context;
    const ext = path.extname(inputPath).toLowerCase();

    if (ext !== '.zip') {
        return inputPath;
    }

    console.log(`[ZipExtractor] 开始解压: ${inputPath}`);

    const outputDir = path.join('uploads/temp', assetId);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        const zip = new AdmZip(inputPath);
        zip.extractAllTo(outputDir, true);

        // 查找模型文件
        const files = getAllFiles(outputDir);
        const modelFile = findMainModel(files);

        if (!modelFile) {
            throw new Error('ZIP 包中未找到支持的模型文件 (.gltf, .glb, .obj, .fbx, .stl)');
        }

        console.log(`[ZipExtractor] 找到主模型: ${modelFile}`);

        // 记录临时目录以便后续清理
        context.tempDir = outputDir;

        return modelFile;

    } catch (error) {
        console.error('[ZipExtractor] 解压失败:', error.message);
        throw error;
    }
}

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

/**
 * 查找主模型文件
 * 优先顺序: gltf > glb > fbx > obj > stl
 */
function findMainModel(files) {
    // 过滤出支持的文件
    const candidates = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return SUPPORTED_EXTENSIONS.includes(ext) && !file.includes('__MACOSX');
    });

    if (candidates.length === 0) return null;

    // 按优先级排序
    candidates.sort((a, b) => {
        const extA = path.extname(a).toLowerCase();
        const extB = path.extname(b).toLowerCase();
        return SUPPORTED_EXTENSIONS.indexOf(extA) - SUPPORTED_EXTENSIONS.indexOf(extB);
    });

    return candidates[0];
}

module.exports = { extractZip };
