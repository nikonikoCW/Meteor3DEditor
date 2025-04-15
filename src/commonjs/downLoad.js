import JSZip from 'jszip';

// 下载并打包gltf文件及其资源
export async function downloadGLTFWithAssets(gltfUrl, zipName = 'model.zip') {
    try {
        // 初始化 JSZip
        const zip = new JSZip();

        // 获取 glTF 文件内容
        const gltfResponse = await fetch(gltfUrl);
        if (!gltfResponse.ok) throw new Error('Failed to fetch glTF file');
        const gltfText = await gltfResponse.text();
        const gltfJson = JSON.parse(gltfText);

        // 获取 glTF 文件的基本路径
        const basePath = gltfUrl.substring(0, gltfUrl.lastIndexOf('/') + 1);

        // 将 glTF 文件添加到 ZIP
        zip.file(gltfUrl.split('/').pop(), gltfText);

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
            zip.file(relativePath, fileData);
        }));

        // 生成 ZIP 文件并触发下载
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = zipName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        console.log('Download completed successfully');
    } catch (error) {
        console.error('Error downloading glTF assets:', error);
    }
}




export async function downloadGLB(modelUrl, fileName = 'model.glb') {
    try {
        
    const zip = new JSZip();
      // 获取模型数据
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      debugger
      
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

  
  