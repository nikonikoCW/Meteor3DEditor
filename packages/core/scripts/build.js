import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'index.js');
const distDir = resolve(root, 'dist');

const createConfig = ({ format, outDir, fileName, minify }) => ({
    root,
    configFile: false,
    build: {
        lib: {
            entry,
            name: 'Meteor3D',
            formats: [format],
            fileName: () => fileName
        },
        rollupOptions: {
            external: [],
            output: {
                globals: {}
            }
        },
        outDir,
        emptyOutDir: false,
        minify,
        sourcemap: false
    }
});

await rm(distDir, { recursive: true, force: true });

await build(createConfig({
    format: 'umd',
    outDir: resolve(distDir, 'umd'),
    fileName: 'meteor3d-core.js',
    minify: false
}));

await build(createConfig({
    format: 'umd',
    outDir: resolve(distDir, 'umd'),
    fileName: 'meteor3d-core.min.js',
    minify: 'esbuild'
}));

await build(createConfig({
    format: 'es',
    outDir: resolve(distDir, 'es'),
    fileName: 'meteor3d-core.js',
    minify: 'esbuild'
}));
