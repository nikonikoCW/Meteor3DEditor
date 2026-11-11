# 模型资产交付

当前模型处理顺序：解压（按需）→ 格式转换 → 清洗 → 稳定节点身份 → KTX2 纹理编码 → Meshopt 缓冲压缩 → 边界统计。

最终产物仍通过 `Asset.processedFiles.compressed` 提供，是一个嵌入 KTX2 纹理并使用 `EXT_meshopt_compression` 的 GLB。不再生成 LOD 或独立的多尺寸纹理。上云与编辑器 URL 选择仍使用原来的 compressed 字段。历史文件不批量删除，已有 Draco 资产继续可加载。

## 服务端编码工具

Node 依赖安装后，还需要安装 [Khronos KTX-Software](https://github.com/KhronosGroup/KTX-Software/releases)（验证版本 v4.4.2）。使用其中的 `toktx`，不是浏览器使用的 Basis 转码器。

工具查找顺序：

1. 环境变量 `TOKTX_PATH` 指定的可执行文件完整路径。
2. `meteor3d-server/bin/ktx/toktx.exe`（Windows）或同目录的 `toktx`（其他系统）。Windows 需同时提供同版本 `ktx.dll`。
3. PATH 中的 `toktx`。

本地编码器不进入 Git；部署时必须单独安装。包含普通图片的模型若编码器缺失或执行失败，任务会明确失败，不会将未完成优化的文件标记为 ready。无纹理或全部已为 KTX2 的输入不需要执行编码器。

KTX2 当前使用 UASTC、mipmap 与 Zstd 超压缩，不生成多分辨率资产。颜色通道使用 sRGB，法线等数据通道使用 linear；同一图片同时用于两类通道时会分离绑定。为满足 KHR_texture_basisu 约束，非四的倍数尺寸向上调整到相邻四的倍数，不限制最大贴图分辨率。

Meshopt 只压缩缓冲数据，不使用简化、节点合并或位置量化，避免改变业务节点的层级和变换。该选择优先保证已有节点编辑、BID 和动画恢复语义；不保证每个模型比 Draco 更小。原有清洗逻辑保持不变。

## 前端加载

`@meteor3d/core` 的 `createModelLoader(renderer, options)` 统一注册 Meshopt、KTX2 和 Draco 解码。Basis JS/WASM 来自 Three.js r184，随 Core 打包，不需要各应用复制 public 资源或依赖 CDN。可通过 `ktx2Path` 覆盖默认资源位置。

加载前等待返回对象的 `ready`，销毁时调用 `dispose()`。Core 场景持久化和三个缩略图入口均使用该工厂。场景恢复仍加载保存的 URL，新编码不会自动迁移旧场景的资源引用。

