import JSZip from 'jszip';

class ExportScene {
    constructor() {
        this.zip = new JSZip();
    }

    // 下载并打包gltf文件及其资源
    async downloadGLTFWithAssets(gltfUrl, zipName = 'model.zip') {
        try {
            // 获取 glTF 文件内容
            const gltfResponse = await fetch(gltfUrl);
            if (!gltfResponse.ok) throw new Error('Failed to fetch glTF file');
            const gltfText = await gltfResponse.text();
            const gltfJson = JSON.parse(gltfText);

            // 获取 glTF 文件的基本路径
            const basePath = gltfUrl.substring(0, gltfUrl.lastIndexOf('/') + 1);

            // 将 glTF 文件添加到 ZIP
            this.zip.file(gltfUrl.split('/').pop(), gltfText);

            // 收集需要下载的文件（.bin 和纹理）
            const filesToDownload = [];

            // 处理 buffers（通常是 .bin 文件）
            if (gltfJson.buffers) {
                gltfJson.buffers.forEach(buffer => {
                    if (buffer.uri && !buffer.uri.startsWith('data:')) {
                        filesToDownload.push(buffer.uri);
                    }
                });
            }

            // 处理 images（纹理文件）
            if (gltfJson.images) {
                gltfJson.images.forEach(image => {
                    if (image.uri && !image.uri.startsWith('data:')) {
                        filesToDownload.push(image.uri);
                    }
                });
            }

            // 下载所有相关文件并添加到 ZIP，保留相对路径
            await Promise.all(filesToDownload.map(async fileUri => {
                const fileUrl = fileUri.startsWith('http') ? fileUri : basePath + fileUri;
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    console.warn(`Failed to fetch ${fileUrl}`);
                    return;
                }
                const fileData = await response.arrayBuffer();
                // 使用相对路径保存到 ZIP
                const relativePath = fileUri.startsWith('http') ? fileUrl.split('/').pop() : fileUri;
                this.zip.file(relativePath, fileData);
            }));

            // 生成 ZIP 文件并触发下载
            await this.generateAndDownloadZip(zipName);
            console.log('Download completed successfully');
        } catch (error) {
            console.error('Error downloading glTF assets:', error);
        }
    }

    // 下载GLB文件
    async downloadGLB(modelUrl, fileName = 'model.glb') {
        try {
            // 获取模型数据
            const response = await fetch(modelUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 获取Blob对象
            const blob = await response.blob();

            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || modelUrl.split('/').pop();
            document.body.appendChild(a);
            a.click();

            // 清理
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
        } catch (error) {
            console.error('下载GLB模型失败:', error);
        }
    }

    // 下载所有模型
    async downloadAll() {
        try {
            const sceneData = localStorage.getItem('scene');
            const dataList = JSON.parse(sceneData).scene.object;
            const models = dataList.filter(item => item.type == 'model');

            for (const model of models) {
                if (model.modeType === 'gltf') {
                    await this._zipGltfModel(model.path);
                } else if (model.modeType === 'glb') {
                    await this._zipGlbModel(model.path);
                }
            }
            this._zipJson()
            // 生成 ZIP 文件并触发下载
            await this.generateAndDownloadZip('models.zip');
        } catch (error) {
            console.error('Error downloading all models:', error);
        }
    }

    // 私有方法：打包GLB模型
    async _zipGlbModel(gltfUrl) {
        try {
            const response = await fetch(gltfUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const fileData = await response.arrayBuffer();
            this.zip.file(gltfUrl.split('/').pop(), fileData);
        } catch (error) {
            console.error('Error zipping GLB model:', error);
            throw error;
        }
    }

    // 私有方法：打包GLTF模型及其资源
    async _zipGltfModel(gltfUrl) {
        try {
            // 获取 glTF 文件内容
            const gltfResponse = await fetch(gltfUrl);
            if (!gltfResponse.ok) throw new Error('Failed to fetch glTF file');
            const gltfText = await gltfResponse.text();
            const gltfJson = JSON.parse(gltfText);

            // 获取 glTF 文件的基本路径
            const basePath = gltfUrl.substring(0, gltfUrl.lastIndexOf('/') + 1);

            // 将 glTF 文件添加到 ZIP
            this.zip.file(gltfUrl.split('/').pop(), gltfText);

            // 收集需要下载的文件（.bin 和纹理）
            const filesToDownload = [];

            // 处理 buffers（通常是 .bin 文件）
            if (gltfJson.buffers) {
                gltfJson.buffers.forEach(buffer => {
                    if (buffer.uri && !buffer.uri.startsWith('data:')) {
                        filesToDownload.push(buffer.uri);
                    }
                });
            }

            // 处理 images（纹理文件）
            if (gltfJson.images) {
                gltfJson.images.forEach(image => {
                    if (image.uri && !image.uri.startsWith('data:')) {
                        filesToDownload.push(image.uri);
                    }
                });
            }

            // 下载所有相关文件并添加到 ZIP，保留相对路径
            await Promise.all(filesToDownload.map(async fileUri => {
                const fileUrl = fileUri.startsWith('http') ? fileUri : basePath + fileUri;
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    console.warn(`Failed to fetch ${fileUrl}`);
                    return;
                }
                const fileData = await response.arrayBuffer();
                // 使用相对路径保存到 ZIP
                const relativePath = fileUri.startsWith('http') ? fileUrl.split('/').pop() : fileUri;
                this.zip.file(relativePath, fileData);
            }));
        } catch (error) {
            console.error('Error zipping GLTF model:', error);
            throw error;
        }
    }

    // 生成并下载ZIP文件
    async generateAndDownloadZip(zipName = 'model.zip') {
        const zipBlob = await this.zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = zipName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
    _zipJson() {
        let sceneData = localStorage.getItem('scene')
        try {
            const jsonString = JSON.stringify(JSON.parse(sceneData), null, 2); // 格式化JSON
            this.zip.file('Scene.json', jsonString);
            return true;
        } catch (error) {
            console.error('Error adding JSON to zip:', error);
            return false;
        }
    }
    async downloadJson() {

        let output = window.scene.toJSON();
        try {
            output = JSON.stringify(output, null, '\t');
            output = output.replace(/[\n\t]+([\d\.e\-\[\]]+)/g, '$1');
        } catch (e) {
            output = JSON.stringify(output);
        }
        this._saveString(output, 'scene.json')


    }
    _saveString(text, filename) {
        const blob = new Blob([text], { type: 'application/json' });

        // 使用 FileReader 处理大文件
        const reader = new FileReader();
        reader.onload = function (event) {
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = event.target.result;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        reader.readAsDataURL(blob);
    }

}

export default ExportScene;