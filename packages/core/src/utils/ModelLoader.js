import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/** Shared model decoding for runtime and thumbnails, including historical Draco assets. */
export function createModelLoader(renderer, { dracoPath = '/draco/', ktx2Path } = {}) {
    const dracoLoader = new DRACOLoader().setDecoderPath(dracoPath);
    // Bundle the matching Basis assets with Core; consumers need no public-folder copies or CDN.
    const manager = new LoadingManager();
    if (!ktx2Path) {
        manager.setURLModifier(url => {
            if (url === '__meteor_basis__/basis_transcoder.js') {
                return new URL('../assets/basis/basis_transcoder.js', import.meta.url).href;
            }
            if (url === '__meteor_basis__/basis_transcoder.wasm') {
                return new URL('../assets/basis/basis_transcoder.wasm', import.meta.url).href;
            }
            return url;
        });
    }
    const ktx2Loader = new KTX2Loader(manager).setTranscoderPath(ktx2Path || '__meteor_basis__/');
    const ready = Promise.resolve(ktx2Loader.detectSupport(renderer));
    const gltfLoader = new GLTFLoader()
        .setDRACOLoader(dracoLoader)
        .setMeshoptDecoder(MeshoptDecoder)
        .setKTX2Loader(ktx2Loader);
    let disposed = false;
    return {
        gltfLoader, dracoLoader, ktx2Loader, ready,
        dispose() {
            if (disposed) return;
            disposed = true;
            dracoLoader.dispose();
            // Three tracks active KTX loaders only after lazy initialization.
            if (ktx2Loader.transcoderPending) {
                if (ktx2Loader.workerSourceURL) ktx2Loader.dispose();
                else ktx2Loader.transcoderPending.then(() => ktx2Loader.dispose(), () => ktx2Loader.dispose());
            }
        }
    };
}
