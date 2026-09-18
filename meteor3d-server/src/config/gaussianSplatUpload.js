const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const directory = 'uploads/gaussian-splats';
const allowedExtensions = new Set(['.splat', '.ply', '.spz', '.ksplat', '.sog', '.zip', '.rad']);
const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            fs.mkdir(directory, { recursive: true }, error => cb(error, directory));
        },
        filename(req, file, cb) {
            cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
        }
    }),
    limits: { fileSize: 30 * 1024 * 1024, files: 1 },
    fileFilter(req, file, cb) {
        // Match regular uploads: repair UTF-8 filenames parsed as Latin-1.
        const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
        if (/[\u00C0-\u00FF]/.test(file.originalname) && /[^\u0000-\u00FF]/.test(decoded) && !decoded.includes('\uFFFD')) {
            file.originalname = decoded;
        }
        if (!allowedExtensions.has(path.extname(file.originalname).toLowerCase())) {
            return cb(new Error('支持 .splat、.ply、.spz、.ksplat、.sog、SOG .zip、.rad 文件'));
        }
        cb(null, true);
    }
}).single('file');

module.exports = (req, res, next) => upload(req, res, error => {
    if (!error) return next();
    return res.status(400).json({
        success: false,
        message: error.code === 'LIMIT_FILE_SIZE' ? '文件不能超过 30 MB' : error.message
    });
});
