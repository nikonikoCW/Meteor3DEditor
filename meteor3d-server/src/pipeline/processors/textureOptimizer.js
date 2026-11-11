const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { KHRTextureBasisu } = require('@gltf-transform/extensions');
const { listTextureSlots } = require('@gltf-transform/functions');
const { createNodeIO } = require('../utils/ioUtils');

const execFileAsync = promisify(execFile);
const COLOR_SLOTS = new Set(['baseColorTexture', 'emissiveTexture', 'specularColorTexture', 'sheenColorTexture']);

/** Encode textures into the GLB itself, preserving material bindings. */
async function optimizeTextures(context) {
    const io = await createNodeIO();
    const document = await io.read(context.gltfPath);
    // A single source image may be used in both sRGB and linear slots. KTX2 stores
    // its transfer function, so those uses need separate encoded textures.
    for (const texture of document.getRoot().listTextures()) {
        if (texture.getMimeType() === 'image/ktx2') continue;
        const edges = texture.getGraph().listParentEdges(texture)
            .filter(edge => edge.getParent() !== document.getRoot());
        if (edges.some(edge => COLOR_SLOTS.has(edge.getName())) &&
            edges.some(edge => !COLOR_SLOTS.has(edge.getName()))) {
            const linearTexture = texture.clone();
            for (const edge of edges.filter(edge => !COLOR_SLOTS.has(edge.getName()))) {
                edge.getParent().setRef(edge.getName(), linearTexture, edge.getAttributes());
            }
        }
    }
    const pending = document.getRoot().listTextures()
        .filter(texture => texture.getMimeType() !== 'image/ktx2' && texture.getImage());
    if (pending.length === 0) return context.gltfPath;

    const localTool = path.resolve(__dirname, '../../../bin/ktx', process.platform === 'win32' ? 'toktx.exe' : 'toktx');
    const command = process.env.TOKTX_PATH || (fs.existsSync(localTool) ? localTool : 'toktx');
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'meteor-ktx2-'));
    try {
        const sharp = require('sharp');
        for (const [index, texture] of pending.entries()) {
            const slots = listTextureSlots(texture);
            const hasColor = slots.some(slot => COLOR_SLOTS.has(slot));
            const input = path.join(tempDir, `${index}.png`);
            const output = path.join(tempDir, `${index}.ktx2`);
            const image = sharp(Buffer.from(texture.getImage()));
            const { width, height } = await image.metadata();
            // KHR_texture_basisu requires base dimensions to be multiples of four.
            if (width % 4 || height % 4) {
                image.resize(Math.ceil(width / 4) * 4, Math.ceil(height / 4) * 4, { fit: 'fill' });
            }
            await image.png().toFile(input);
            await execFileAsync(command, [
                '--t2', '--encode', 'uastc', '--uastc_quality', '2', '--zcmp', '18',
                '--genmipmap', '--assign_oetf', hasColor ? 'srgb' : 'linear',
                '--assign_primaries', 'bt709', output, input
            ], { windowsHide: true, timeout: 5 * 60 * 1000, maxBuffer: 1024 * 1024 });
            texture.setImage(await fs.promises.readFile(output)).setMimeType('image/ktx2').setURI('');
        }
        document.createExtension(KHRTextureBasisu).setRequired(true);
        const outputPath = path.join(tempDir, 'textures.glb');
        await io.write(outputPath, document);
        context.textureTempDir = tempDir;
        return outputPath;
    } catch (error) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        if (error.code === 'ENOENT') {
            throw new Error('KTX2 编码工具不可用：请安装 KTX-Software，并通过 TOKTX_PATH 指定 toktx 可执行文件', { cause: error });
        }
        throw error;
    }
}

module.exports = { optimizeTextures };
