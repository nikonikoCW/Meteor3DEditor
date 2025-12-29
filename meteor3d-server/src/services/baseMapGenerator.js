/**
 * 底图生成服务
 * 根据 GIS 边界从天地图下载瓦片，拼接生成卫星影像底图
 */

const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { uploadFile } = require('./upyunService');
const Scene = require('../models/Scene');

// 天地图配置
const TIANDITU_TOKEN = 'd3940c4f1d55fdfb8b053ad7f1e0c80d';
const ZOOM_LEVEL = 17;
const TILE_SIZE = 256;

// 底图输出目录
const BASEMAP_DIR = path.join(__dirname, '../../uploads/basemaps');

/**
 * 经纬度转瓦片坐标
 * @param {number} lon 经度
 * @param {number} lat 纬度
 * @param {number} zoom 缩放级别
 * @returns {{x: number, y: number}} 瓦片坐标
 */
function lonLatToTile(lon, lat, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lon + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
}

/**
 * 瓦片坐标转经纬度（瓦片左上角）
 * @param {number} x 瓦片X坐标
 * @param {number} y 瓦片Y坐标
 * @param {number} zoom 缩放级别
 * @returns {{lon: number, lat: number}} 经纬度
 */
function tileToLonLat(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const lon = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;
    return { lon, lat };
}

/**
 * 下载单个瓦片
 * @param {number} x 瓦片X坐标
 * @param {number} y 瓦片Y坐标
 * @param {number} zoom 缩放级别
 * @returns {Promise<Buffer>} 瓦片图像数据
 */
async function downloadTile(x, y, zoom) {
    // 使用随机子域名 t0-t7
    const subdomain = Math.floor(Math.random() * 8);
    const url = `https://t${subdomain}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX=${zoom}&TILEROW=${y}&TILECOL=${x}&tk=${TIANDITU_TOKEN}`;

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'Referer': 'https://www.tianditu.gov.cn/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error(`下载瓦片失败 (${x}, ${y}): ${error.message}`);
        throw error;
    }
}

/**
 * 生成底图
 * @param {Object} bounds 边界 {minLng, minLat, maxLng, maxLat}
 * @param {string} sceneId 场景ID
 * @returns {Promise<{url: string, width: number, height: number}>} 底图URL和尺寸
 */
async function generateBaseMap(bounds, sceneId) {
    const { minLng, minLat, maxLng, maxLat } = bounds;
    const zoom = ZOOM_LEVEL;

    console.log('='.repeat(50));
    console.log('开始生成底图');
    console.log(`场景ID: ${sceneId}`);
    console.log(`范围: [${minLng}, ${minLat}] - [${maxLng}, ${maxLat}]`);
    console.log(`缩放级别: ${zoom}`);
    console.log('='.repeat(50));

    // 1. 计算瓦片范围
    const topLeft = lonLatToTile(minLng, maxLat, zoom);  // 左上角
    const bottomRight = lonLatToTile(maxLng, minLat, zoom);  // 右下角

    const minTileX = topLeft.x;
    const maxTileX = bottomRight.x;
    const minTileY = topLeft.y;
    const maxTileY = bottomRight.y;

    const tileCountX = maxTileX - minTileX + 1;
    const tileCountY = maxTileY - minTileY + 1;
    const totalTiles = tileCountX * tileCountY;

    console.log(`瓦片范围: X[${minTileX}-${maxTileX}], Y[${minTileY}-${maxTileY}]`);
    console.log(`需要下载: ${tileCountX} x ${tileCountY} = ${totalTiles} 张瓦片`);

    // 2. 确保输出目录存在
    if (!fs.existsSync(BASEMAP_DIR)) {
        fs.mkdirSync(BASEMAP_DIR, { recursive: true });
    }

    // 3. 下载所有瓦片
    console.log('\n开始下载瓦片...');
    const tileBuffers = [];
    let downloaded = 0;

    for (let y = minTileY; y <= maxTileY; y++) {
        const row = [];
        for (let x = minTileX; x <= maxTileX; x++) {
            const buffer = await downloadTile(x, y, zoom);
            row.push(buffer);
            downloaded++;
            console.log(`下载进度: ${downloaded}/${totalTiles}`);
        }
        tileBuffers.push(row);
    }
    console.log('瓦片下载完成!');

    // 4. 拼接瓦片
    console.log('\n开始拼接瓦片...');
    const fullWidth = tileCountX * TILE_SIZE;
    const fullHeight = tileCountY * TILE_SIZE;

    // 创建拼接所需的 composite 输入
    const compositeInputs = [];
    for (let row = 0; row < tileCountY; row++) {
        for (let col = 0; col < tileCountX; col++) {
            compositeInputs.push({
                input: tileBuffers[row][col],
                left: col * TILE_SIZE,
                top: row * TILE_SIZE
            });
        }
    }

    // 创建空白画布并拼接
    const fullImage = await sharp({
        create: {
            width: fullWidth,
            height: fullHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
    })
        .composite(compositeInputs)
        .png()
        .toBuffer();

    console.log(`拼接完成! 完整尺寸: ${fullWidth} x ${fullHeight}`);

    // 5. 计算精确裁剪区域
    console.log('\n开始精确裁剪...');

    // 计算瓦片覆盖的实际经纬度范围
    const actualTopLeft = tileToLonLat(minTileX, minTileY, zoom);
    const actualBottomRight = tileToLonLat(maxTileX + 1, maxTileY + 1, zoom);

    // 计算像素偏移
    const lonPerPixel = (actualBottomRight.lon - actualTopLeft.lon) / fullWidth;
    const latPerPixel = (actualTopLeft.lat - actualBottomRight.lat) / fullHeight;

    const cropLeft = Math.floor((minLng - actualTopLeft.lon) / lonPerPixel);
    const cropTop = Math.floor((actualTopLeft.lat - maxLat) / latPerPixel);
    const cropRight = Math.floor((maxLng - actualTopLeft.lon) / lonPerPixel);
    const cropBottom = Math.floor((actualTopLeft.lat - minLat) / latPerPixel);

    const cropWidth = cropRight - cropLeft;
    const cropHeight = cropBottom - cropTop;

    console.log(`裁剪区域: left=${cropLeft}, top=${cropTop}, width=${cropWidth}, height=${cropHeight}`);

    // 6. 执行裁剪并保存
    const outputPath = path.join(BASEMAP_DIR, `${sceneId}.png`);

    await sharp(fullImage)
        .extract({
            left: Math.max(0, cropLeft),
            top: Math.max(0, cropTop),
            width: Math.min(cropWidth, fullWidth - cropLeft),
            height: Math.min(cropHeight, fullHeight - cropTop)
        })
        .toFile(outputPath);

    const finalWidth = Math.min(cropWidth, fullWidth - cropLeft);
    const finalHeight = Math.min(cropHeight, fullHeight - cropTop);

    console.log('\n' + '='.repeat(50));
    console.log(`✅ 底图生成成功!`);
    console.log(`📁 输出文件: ${outputPath}`);
    console.log(`📐 最终尺寸: ${finalWidth} x ${finalHeight} 像素`);
    console.log('='.repeat(50));

    // 上传到又拍云
    const remotePath = `/scenes/${sceneId}/basemap.png`;
    const baseMapCloudUrl = await uploadFile(outputPath, remotePath);

    // 更新 Scene 的云端 URL
    if (baseMapCloudUrl) {
        await Scene.findOneAndUpdate(
            { sceneId },
            { 'cloudUrls.baseMap': baseMapCloudUrl }
        );
        console.log(`☁️ 底图已上传到云端: ${baseMapCloudUrl}`);
    }

    return {
        url: `/uploads/basemaps/${sceneId}.png`,
        cloudUrl: baseMapCloudUrl,
        width: finalWidth,
        height: finalHeight
    };
}

module.exports = {
    generateBaseMap
};
