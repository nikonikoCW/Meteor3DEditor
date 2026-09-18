/**
 * 格式转换处理器
 * 将 OBJ/FBX/STL 转换为 GLB
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

/**
 * 转换模型格式为 GLB
 * @param {Object} context - 处理上下文
 * @returns {string} 输出文件路径
 */
async function convertFormat(context) {
    const ext = path.extname(context.inputPath).toLowerCase();

    // glTF/GLB 无需转换
    if (['.gltf', '.glb'].includes(ext)) {
        console.log('[FormatConverter] 已是 glTF 格式，跳过转换');
        return context.inputPath;
    }

    const baseName = path.basename(context.inputPath, ext);
    const outputDir = 'uploads/processed/models';
    // 相对路径用于数据库存储
    const relativeOutputPath = path.join(outputDir, `${context.assetId}_${baseName}.glb`);

    // 绝对路径用于命令执行
    const absoluteInputPath = path.resolve(context.inputPath);
    const absoluteOutputPath = path.resolve(relativeOutputPath);
    const absoluteOutputDir = path.dirname(absoluteOutputPath);

    // 确保输出目录存在
    if (!fs.existsSync(absoluteOutputDir)) {
        fs.mkdirSync(absoluteOutputDir, { recursive: true });
    }

    try {
        if (ext === '.fbx') {
            // 检查本地 bin 目录是否有 FBX2glTF
            const localBin = path.join(process.cwd(), 'bin', 'FBX2glTF.exe');
            const fbxCommand = fs.existsSync(localBin) ? `"${localBin}"` : 'FBX2glTF';

            // FBX2glTF 会自动添加 .glb 后缀，所以 -o 参数不应包含 .glb
            // 注意：如果 FBX2glTF 发现输出文件已存在，可能会报错或覆盖，最好确保清理
            const outputBase = absoluteOutputPath.replace('.glb', '');

            console.log(`[FormatConverter] 使用 FBX2glTF 转换 FBX`);
            console.log(`  命令: ${fbxCommand}`);
            console.log(`  输入: ${absoluteInputPath}`);
            console.log(`  输出: ${outputBase}`);

            // 执行命令 (添加 --binary 强制输出 glb)
            const { stdout, stderr } = await execAsync(`${fbxCommand} --binary -i "${absoluteInputPath}" -o "${outputBase}"`);

            if (stdout) console.log('[FormatConverter] stdout:', stdout);
            if (stderr) console.log('[FormatConverter] stderr:', stderr);

        } else if (ext === '.obj') {
            // OBJ 转换 - 需要 obj2gltf
            console.log('[FormatConverter] 使用 obj2gltf 转换 OBJ');
            await execAsync(`npx obj2gltf -i "${absoluteInputPath}" -o "${absoluteOutputPath}"`);
        } else if (ext === '.stl') {
            // STL 转换 - 使用 gltf-transform 或其他工具
            console.log('[FormatConverter] STL 转换暂不支持，请使用 GLB 格式');
            throw new Error('STL 格式转换暂不支持');
        } else {
            throw new Error(`不支持的格式: ${ext}`);
        }

        // 验证输出文件存在
        if (!fs.existsSync(absoluteOutputPath)) {
            // 尝试查找可能生成的其他文件名 (FBX2glTF 有时会根据 mesh 命名?)
            // 但通常它会遵循 -o 参数。
            // 检查目录下是否有类似文件
            const files = fs.readdirSync(absoluteOutputDir);
            console.log(`[FormatConverter] 输出目录文件列表: ${files.join(', ')}`);

            throw new Error(`转换失败，输出文件不存在: ${absoluteOutputPath}`);
        }

        console.log(`[FormatConverter] 转换完成: ${absoluteOutputPath}`);
        return relativeOutputPath;

    } catch (error) {
        console.error('[FormatConverter] 转换失败:', error.message);
        if (error.stdout) console.log('stdout:', error.stdout);
        if (error.stderr) console.log('stderr:', error.stderr);
        throw error;
    }
}

module.exports = { convertFormat };
