const fs = require('fs');
const path = require('path');
const { EXTMeshoptCompression } = require('@gltf-transform/extensions');
const { createNodeIO } = require('../utils/ioUtils');

/** Compress buffers without quantizing transforms or changing persistent node structure. */
async function compressMeshopt(context) {
    const io = await createNodeIO();
    const document = await io.read(context.texturePath || context.gltfPath);
    document.getRoot().listExtensionsUsed()
        .filter(extension => extension.extensionName === 'KHR_draco_mesh_compression')
        .forEach(extension => extension.dispose());
    document.createExtension(EXTMeshoptCompression)
        .setRequired(true)
        .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    const outputDir = path.join('uploads', 'processed', 'models');
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${context.assetId}_compressed.glb`);
    await io.write(outputPath, document);
    return outputPath;
}

module.exports = { compressMeshopt };
