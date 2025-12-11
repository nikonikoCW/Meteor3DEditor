const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDirs = [
    'uploads/models',           // 兼容旧数据
    'uploads/thumbnails',       // 缩略图
    'uploads/raw',              // 原始上传文件
    'uploads/processed/models', // 压缩后模型
    'uploads/processed/lods',   // LOD 版本
    'uploads/processed/textures', // 优化后纹理
    'uploads/temp'              // 临时处理目录
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

/**
 * 配置文件存储
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'thumbnail') {
            cb(null, 'uploads/thumbnails');
        } else {
            cb(null, 'uploads/models');
        }
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

/**
 * 文件过滤器
 * 只允许特定格式的文件
 */
const fileFilter = (req, file, cb) => {
    const allowedFormats = [
        '.gltf', '.glb',           // glTF 格式
        '.obj', '.fbx', '.stl',    // 需转换的 3D 格式
        '.zip',                    // 压缩包
        '.jpg', '.jpeg', '.png',   // 纹理
        '.hdr', '.exr'             // HDRI
    ];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedFormats.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件格式'), false);
    }
};

/**
 * Multer 配置
 */
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB 限制
    }
});

module.exports = upload;
