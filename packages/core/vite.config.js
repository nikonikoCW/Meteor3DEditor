import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module 兼容：获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'index.js'),
            name: 'Meteor3D',  // UMD 全局变量名
            fileName: (format) => `meteor3d-core.${format}.js`,
            formats: ['umd', 'es']  // UMD 用于 <script> 引入，ES 用于模块导入
        },
        rollupOptions: {
            // 不排除依赖，全部打包
            external: [],
            output: {
                globals: {}
            }
        },
        outDir: 'dist',
        sourcemap: true
    }
});
