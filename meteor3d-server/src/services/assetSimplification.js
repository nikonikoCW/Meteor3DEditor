const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { Primitive, PropertyType } = require('@gltf-transform/core');
const { EXTMeshoptCompression } = require('@gltf-transform/extensions');
const { weldPrimitive, simplifyPrimitive, prune, quantize } = require('@gltf-transform/functions');
const { createNodeIO } = require('../pipeline/utils/ioUtils');
const { calculateBounds } = require('../pipeline/processors/boundsCalculator');

const SERVER_ROOT = path.resolve(__dirname, '../..');

function validateSimplificationOptions(options = {}) {
    const { ratio = 0.5, error = 0.01, lockBorder = false,
        updatePositions = false, permissive = false, regularize = false, weld = true,
        normalWeight = 1, uvWeight = 1, minimumTriangles = 8, quantize: useQuantization = false } = options;
    if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
        throw new Error('保留面数比例必须大于 0 且小于 100%');
    }
    if (typeof error !== 'number' || !Number.isFinite(error) || error < 0 || error > 1) {
        throw new Error('最大允许误差必须在 0% 到 100% 之间');
    }
    for (const value of [lockBorder, updatePositions, permissive, regularize, weld, useQuantization]) {
        if (typeof value !== 'boolean') throw new Error('减面开关参数必须为布尔值');
    }
    for (const value of [normalWeight, uvWeight]) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) {
            throw new Error('法线和 UV 保护强度必须在 0 到 10 之间');
        }
    }
    if (!Number.isInteger(minimumTriangles) || minimumTriangles < 2 || minimumTriangles > 100000) {
        throw new Error('小零件保护阈值必须为 2 到 100000 的整数');
    }
    return { ratio, error, lockBorder, updatePositions, permissive, regularize,
        weld, normalWeight, uvWeight, minimumTriangles, quantize: useQuantization };
}

// glTF Transform handles attribute compaction and morphs; this adapter exposes the
// installed Meshopt engine's attribute-aware and vertex-update modes.
function createSimplifier(primitive, engine, options, canUpdate) {
    return { simplify(indices, positions, stride, target, error, flags = []) {
        const extraFlags = [...flags];
        if (options.permissive) extraFlags.push('Permissive');
        if (options.regularize) extraFlags.push('Regularize');
        const channels = primitive.listSemantics().filter(name =>
            name === 'NORMAL' || name === 'TANGENT' || name === 'TEXCOORD_0' || name === 'TEXCOORD_1')
            .map(name => ({ name, accessor: primitive.getAttribute(name),
                weight: name.startsWith('TEXCOORD_') ? options.uvWeight : options.normalWeight }));
        const attributeStride = channels.reduce((sum, channel) => sum + channel.accessor.getElementSize(), 0);
        const count = positions.length / stride;
        const attributes = new Float32Array(count * attributeStride);
        const weights = [];
        let offset = 0;
        for (const channel of channels) {
            channel.offset = offset;
            const size = channel.accessor.getElementSize();
            for (let i = 0; i < count; i++) {
                attributes.set(channel.accessor.getElement(i, []), i * attributeStride + offset);
            }
            weights.push(...Array(size).fill(channel.weight));
            offset += size;
        }
        if (canUpdate) {
            const nextPositions = positions.slice();
            const nextIndices = indices.slice();
            const [length, resultError] = engine.simplifyWithUpdate(nextIndices, nextPositions, stride,
                attributes, attributeStride, weights, null, target, error, extraFlags);
            primitive.setAttribute('POSITION', primitive.getAttribute('POSITION').clone()
                .setArray(nextPositions).setNormalized(false));
            for (const channel of channels) {
                const size = channel.accessor.getElementSize();
                const array = new Float32Array(count * size);
                for (let i = 0; i < count; i++) {
                    for (let c = 0; c < size; c++) array[i * size + c] = attributes[i * attributeStride + channel.offset + c];
                    if (channel.name === 'NORMAL' || channel.name === 'TANGENT') {
                        const magnitude = Math.hypot(...array.subarray(i * size, i * size + 3)) || 1;
                        for (let c = 0; c < 3; c++) array[i * size + c] /= magnitude;
                        if (size === 4) array[i * size + 3] = array[i * size + 3] < 0 ? -1 : 1;
                    }
                }
                primitive.setAttribute(channel.name, channel.accessor.clone().setArray(array).setNormalized(false));
            }
            return [nextIndices.slice(0, length), resultError];
        }
        return attributeStride
            ? engine.simplifyWithAttributes(indices, positions, stride, attributes, attributeStride,
                weights, null, target, error, extraFlags)
            : engine.simplify(indices, positions, stride, target, error, extraFlags);
    } };
}

function getSourceLocation(asset) {
    const stored = asset.processedFiles?.compressed;
    if (stored && !/^https?:\/\//i.test(stored)) {
        const localPath = /^[a-z]:[\\/]|^\\\\/i.test(stored)
            ? stored : path.resolve(SERVER_ROOT, stored.replace(/^[\\/]+/, '').replace(/\\/g, '/'));
        if (fs.existsSync(localPath)) return { localPath };
    }
    const url = asset.cloudUrls?.compressed || asset.cloudUrls?.file ||
        (/^https?:\/\//i.test(stored || '') ? stored : null);
    if (url && /^https?:\/\//i.test(url)) return { url };
    throw new Error('找不到已处理的 GLB，请先完成资产处理');
}

function triangleCount(primitive) {
    const count = primitive.getIndices()?.getCount() || primitive.getAttribute('POSITION')?.getCount() || 0;
    if (primitive.getMode() === Primitive.Mode.TRIANGLES) return Math.floor(count / 3);
    if ([Primitive.Mode.TRIANGLE_STRIP, Primitive.Mode.TRIANGLE_FAN].includes(primitive.getMode())) return Math.max(0, count - 2);
    return 0;
}

/** Separate derivative workflow: no source writes, texture encoding, sanitizing or upload pipeline. */
async function simplifyAssetModel(source, assetId, inputOptions) {
    const startedAt = performance.now();
    const options = validateSimplificationOptions(inputOptions);
    const location = getSourceLocation(source);
    const io = await createNodeIO();
    let document;
    let sourceFileSize;
    if (location.localPath) {
        sourceFileSize = (await fs.promises.stat(location.localPath)).size;
        document = await io.read(location.localPath);
    }
    else {
        const response = await axios.get(location.url, {
            responseType: 'arraybuffer', timeout: 120000,
            maxContentLength: 150 * 1024 * 1024, maxRedirects: 3
        });
        document = await io.readBinary(new Uint8Array(response.data));
        sourceFileSize = response.data.byteLength;
    }
    const { MeshoptSimplifier } = await import('meshoptimizer');
    await MeshoptSimplifier.ready;
    let originalTriangles = 0;
    let simplifiedTriangles = 0;
    let positionUpdateSkipped = 0;
    for (const mesh of document.getRoot().listMeshes()) {
        for (const primitive of mesh.listPrimitives()) {
            const count = triangleCount(primitive);
            originalTriangles += count;
            // Keep tiny parts intact, rather than deleting an entire component.
            if (count > options.minimumTriangles) {
                const backup = primitive.clone();
                const backupTargets = backup.listTargets().map(target => {
                    const copy = target.clone();
                    backup.removeTarget(target).addTarget(copy);
                    return copy;
                });
                const canUpdate = options.updatePositions && !primitive.getAttribute('JOINTS_0') &&
                    !primitive.getAttribute('WEIGHTS_0') && primitive.listTargets().length === 0;
                if (options.updatePositions && !canUpdate) positionUpdateSkipped++;
                if (options.weld) weldPrimitive(primitive, { overwrite: true });
                else if (!primitive.getIndices()) {
                    const position = primitive.getAttribute('POSITION');
                    primitive.setIndices(document.createAccessor().setType('SCALAR')
                        .setArray(Uint32Array.from({ length: position.getCount() }, (_, index) => index))
                        .setBuffer(position.getBuffer()));
                }
                simplifyPrimitive(primitive, {
                    simplifier: createSimplifier(primitive, MeshoptSimplifier, options, canUpdate),
                    ...options, ratio: Math.max(options.ratio, 1 / count)
                });
                if (triangleCount(primitive) === 0) primitive.copy(backup);
                backup.dispose();
                for (const target of backupTargets) {
                    if (!primitive.listTargets().includes(target)) target.dispose();
                }
            }
            simplifiedTriangles += triangleCount(primitive);
        }
    }
    if (originalTriangles === 0) throw new Error('该资产没有可减面的三角网格');
    if (simplifiedTriangles >= originalTriangles) {
        throw new Error('当前参数未能减少面数，请增大允许误差或关闭边界保护后重试');
    }
    // Temporary primitive backups must not keep unused original geometry in the output.
    await document.transform(prune({
        propertyTypes: [PropertyType.ACCESSOR], keepAttributes: true,
        keepSolidTextures: true, keepLeaves: true, keepExtras: true
    }));
    if (options.quantize) {
        await document.transform(quantize({
            pattern: /^(NORMAL|TANGENT|TEXCOORD_\d+)$/,
            patternTargets: /^(NORMAL|TANGENT)$/,
            quantizeNormal: 10, quantizeTexcoord: 12, cleanup: false
        }));
    }

    // Keep source node identities and embedded texture bytes. Only geometry is changed.
    const nodeManifest = {};
    for (const node of document.getRoot().listNodes()) {
        const extras = node.getExtras();
        const id = extras.meteorAssetNodeId || `an_${crypto.randomUUID()}`;
        node.setExtras({ ...extras, meteorAssetNodeId: id });
        nodeManifest[id] = { name: node.getName(), hasMesh: Boolean(node.getMesh()), childCount: node.listChildren().length };
    }
    document.getRoot().listExtensionsUsed()
        .filter(extension => extension.extensionName === 'KHR_draco_mesh_compression')
        .forEach(extension => extension.dispose());
    document.createExtension(EXTMeshoptCompression).setRequired(true)
        .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    const outputPath = path.posix.join('uploads/processed/models', `${assetId}_compressed.glb`);
    const absoluteOutputPath = path.join(SERVER_ROOT, outputPath);
    await fs.promises.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
    try {
        await io.write(absoluteOutputPath, document);
        const { bounds, stats } = await calculateBounds({ gltfPath: absoluteOutputPath });
        if (!bounds || !stats) throw new Error('减面结果统计失败');
        return {
            outputPath, fileSize: (await fs.promises.stat(absoluteOutputPath)).size,
            bounds, stats, nodeManifest, originalTriangles, simplifiedTriangles,
            sourceFileSize, durationMs: Math.round(performance.now() - startedAt), positionUpdateSkipped
        };
    } catch (error) {
        await fs.promises.rm(absoluteOutputPath, { force: true });
        throw error;
    }
}

module.exports = { simplifyAssetModel, validateSimplificationOptions, getSourceLocation };
