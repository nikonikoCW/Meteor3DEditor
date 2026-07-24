const crypto = require('crypto');
const { createNodeIO } = require('../utils/ioUtils');

const EXTRAS_KEY = 'meteorAssetNodeId';

async function ensureNodeIdentities(context) {
    const io = await createNodeIO();
    const document = await io.read(context.gltfPath);
    const manifest = {};
    const usedIds = new Set();

    for (const node of document.getRoot().listNodes()) {
        const extras = node.getExtras() || {};
        const existingId = extras[EXTRAS_KEY];
        const assetNodeId = existingId && !usedIds.has(existingId)
            ? existingId
            : `an_${crypto.randomUUID()}`;
        usedIds.add(assetNodeId);

        if (extras[EXTRAS_KEY] !== assetNodeId) {
            node.setExtras({ ...extras, [EXTRAS_KEY]: assetNodeId });
        }

        manifest[assetNodeId] = {
            name: node.getName() || '',
            hasMesh: Boolean(node.getMesh()),
            childCount: node.listChildren().length
        };
    }

    await io.write(context.gltfPath, document);
    console.log(`[NodeIdentity] Ensured stable ids for ${Object.keys(manifest).length} nodes`);
    return manifest;
}

module.exports = { ensureNodeIdentities, EXTRAS_KEY };
