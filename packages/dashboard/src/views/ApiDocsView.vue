<template>
  <div class="api-docs-view">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-brand">
        <router-link to="/" class="back-link">← 返回首页</router-link>
      </div>
      <div class="nav-links">
        <a href="https://github.com/nikonikoCW/Meteor3DEditor" target="_blank" class="github-btn">
          <svg class="github-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
      </div>
    </nav>

    <!-- 文档主体 -->
    <div class="docs-container">
      <!-- 文档头部 -->
      <header class="docs-header">
        <h1 class="docs-title">
          <span class="title-icon">📚</span>
          Meteor3D Core SDK
        </h1>
        <p class="docs-subtitle">一行代码将 3D 场景嵌入任意网页</p>
      </header>

      <!-- 快速开始 -->
      <section class="docs-section">
        <h2 class="section-title">🚀 快速开始</h2>
        <p class="section-desc">引入打包后的 SDK 文件，调用 <code>loadScene</code> 即可加载场景：</p>
        
        <div class="code-block">
          <div class="code-header">
            <span class="code-lang">HTML</span>
            <button class="copy-btn" @click="copyCode('quickstart')">
              {{ copiedId === 'quickstart' ? '✓ 已复制' : '📋 复制' }}
            </button>
          </div>
          <pre class="code-content"><code>&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
  &lt;title&gt;Meteor3D 场景&lt;/title&gt;
  &lt;style&gt;
    * { margin: 0; padding: 0; }
    #canvas { width: 100vw; height: 100vh; }
  &lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;div id="canvas"&gt;&lt;/div&gt;
  
  &lt;script src="meteor3d-core.umd.js"&gt;&lt;/script&gt;
  &lt;script&gt;
    Meteor3D.loadScene({
      sceneId: 'your-scene-id',
      serverUrl: 'http://localhost:3001',
      container: document.getElementById('canvas')
    }).then(result =&gt; {
      console.log('场景加载成功', result);
    });
  &lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>
        </div>
      </section>

      <!-- API 参考 -->
      <section class="docs-section">
        <h2 class="section-title">📖 API 参考</h2>
        
        <h3 class="api-name">Meteor3D.loadScene(options)</h3>
        <p class="api-desc">加载并渲染 3D 场景，返回 Promise。</p>

        <h4 class="params-title">参数</h4>
        <table class="params-table">
          <thead>
            <tr>
              <th>参数</th>
              <th>类型</th>
              <th>必填</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sceneId</code></td>
              <td>string</td>
              <td>✅</td>
              <td>场景 ID，从场景编辑器获取</td>
            </tr>
            <tr>
              <td><code>serverUrl</code></td>
              <td>string</td>
              <td>✅</td>
              <td>后端服务器地址，如 <code>http://localhost:3001</code></td>
            </tr>
            <tr>
              <td><code>container</code></td>
              <td>HTMLElement</td>
              <td>✅</td>
              <td>渲染容器元素</td>
            </tr>
            <tr>
              <td><code>config</code></td>
              <td>object</td>
              <td>❌</td>
              <td>可选配置项，见下表</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 配置选项 -->
      <section class="docs-section">
        <h2 class="section-title">⚙️ 配置选项</h2>
        <p class="section-desc"><code>config</code> 对象支持以下配置：</p>

        <table class="params-table">
          <thead>
            <tr>
              <th>参数</th>
              <th>类型</th>
              <th>默认值</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>dracoPath</code></td>
              <td>string</td>
              <td><code>serverUrl + '/draco/'</code></td>
              <td>Draco 解码器路径（用于加载压缩模型）</td>
            </tr>
            <tr>
              <td><code>fitCamera</code></td>
              <td>boolean</td>
              <td><code>true</code></td>
              <td>加载完成后自动调整相机视角</td>
            </tr>
            <tr>
              <td><code>showGrid</code></td>
              <td>boolean</td>
              <td>跟随场景配置</td>
              <td>是否显示辅助网格线</td>
            </tr>
            <tr>
              <td><code>autoResize</code></td>
              <td>boolean</td>
              <td><code>true</code></td>
              <td>自动响应容器尺寸变化</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 返回值 -->
      <section class="docs-section">
        <h2 class="section-title">📤 返回值</h2>
        <p class="section-desc"><code>loadScene</code> 返回一个 Promise，resolve 后得到以下对象：</p>

        <div class="code-block">
          <div class="code-header">
            <span class="code-lang">JavaScript</span>
          </div>
          <pre class="code-content"><code>{
  sceneManager,  // SceneManager 实例，可调用各种场景操作方法
  scene,         // THREE.Scene 对象
  camera,        // THREE.PerspectiveCamera 相机对象
  renderer,      // THREE.WebGLRenderer 渲染器
  dispose()      // 销毁方法，用于清理资源
}</code></pre>
        </div>

        <h4 class="params-title">SceneManager 常用方法</h4>
        <table class="params-table">
          <thead>
            <tr>
              <th>方法</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>fitCameraToScene()</code></td>
              <td>聚焦相机到场景所有物体</td>
            </tr>
            <tr>
              <td><code>addObject(object)</code></td>
              <td>添加 Three.js 对象到场景</td>
            </tr>
            <tr>
              <td><code>removeObject(object)</code></td>
              <td>从场景移除对象</td>
            </tr>
            <tr>
              <td><code>loadEnvironment(url)</code></td>
              <td>加载 HDR 环境贴图</td>
            </tr>
            <tr>
              <td><code>lngLatToWorld(lng, lat, height)</code></td>
              <td>经纬度转世界坐标（需配置 GIS）</td>
            </tr>
            <tr>
              <td><code>worldToLngLat(worldPos)</code></td>
              <td>世界坐标转经纬度</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 完整示例 -->
      <section class="docs-section">
        <h2 class="section-title">💡 完整示例</h2>
        <p class="section-desc">带有配置项和事件处理的完整示例：</p>

        <div class="code-block">
          <div class="code-header">
            <span class="code-lang">HTML</span>
            <button class="copy-btn" @click="copyCode('fullexample')">
              {{ copiedId === 'fullexample' ? '✓ 已复制' : '📋 复制' }}
            </button>
          </div>
          <pre class="code-content"><code>&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;title&gt;Meteor3D 完整示例&lt;/title&gt;
  &lt;style&gt;
    * { margin: 0; padding: 0; }
    #scene-container {
      width: 100vw;
      height: 100vh;
      background: #1a1a1a;
    }
    .loading {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 18px;
    }
  &lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;div id="scene-container"&gt;
    &lt;div class="loading" id="loading"&gt;加载中...&lt;/div&gt;
  &lt;/div&gt;

  &lt;script src="meteor3d-core.umd.js"&gt;&lt;/script&gt;
  &lt;script&gt;
    const container = document.getElementById('scene-container');
    const loading = document.getElementById('loading');

    Meteor3D.loadScene({
      sceneId: '5b200ba6-17d3-4f16-8d3d-0389e1aca205',
      serverUrl: 'http://localhost:3001',
      container: container,
      config: {
        dracoPath: 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/',
        fitCamera: true,
        autoResize: true
      }
    }).then(({ sceneManager, scene, camera }) =&gt; {
      // 隐藏加载提示
      loading.style.display = 'none';
      
      // 场景加载成功，可以进行后续操作
      console.log('场景加载成功');
      console.log('场景对象数量:', scene.children.length);
      
      // 示例：5秒后重新聚焦相机
      setTimeout(() =&gt; {
        sceneManager.fitCameraToScene();
      }, 5000);
      
    }).catch(error =&gt; {
      loading.textContent = '加载失败: ' + error.message;
      console.error(error);
    });
  &lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>
        </div>
      </section>

      <!-- 注意事项 -->
      <section class="docs-section">
        <h2 class="section-title">⚠️ 注意事项</h2>
        <ul class="notes-list">
          <li>
            <strong>跨域问题：</strong>确保后端服务器允许跨域请求（CORS），或将 SDK 和网页部署在同一域下。
          </li>
          <li>
            <strong>Draco 解码器：</strong>如果模型使用了 Draco 压缩，需要确保 <code>dracoPath</code> 指向的路径包含解码器文件。
          </li>
          <li>
            <strong>HTTPS 环境：</strong>在 HTTPS 页面中，<code>serverUrl</code> 也需要是 HTTPS 地址。
          </li>
          <li>
            <strong>容器尺寸：</strong>确保容器元素有明确的宽高，否则场景可能不显示。
          </li>
        </ul>
      </section>
    </div>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <span class="brand-icon">🌟</span>
          <span>Meteor3D</span>
        </div>
        <div class="footer-copyright">
          © 2025 Meteor3DEditor. 保留所有权利。
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const copiedId = ref(null);

const codeExamples = {
  quickstart: `<!DOCTYPE html>
<html>
<head>
  <title>Meteor3D 场景</title>
  <style>
    * { margin: 0; padding: 0; }
    #canvas { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="canvas"></div>
  
  <script src="meteor3d-core.umd.js"><\/script>
  <script>
    Meteor3D.loadScene({
      sceneId: 'your-scene-id',
      serverUrl: 'http://localhost:3001',
      container: document.getElementById('canvas')
    }).then(result => {
      console.log('场景加载成功', result);
    });
  <\/script>
</body>
</html>`,
  fullexample: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Meteor3D 完整示例</title>
  <style>
    * { margin: 0; padding: 0; }
    #scene-container {
      width: 100vw;
      height: 100vh;
      background: #1a1a1a;
    }
    .loading {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div id="scene-container">
    <div class="loading" id="loading">加载中...</div>
  </div>

  <script src="meteor3d-core.umd.js"><\/script>
  <script>
    const container = document.getElementById('scene-container');
    const loading = document.getElementById('loading');

    Meteor3D.loadScene({
      sceneId: '5b200ba6-17d3-4f16-8d3d-0389e1aca205',
      serverUrl: 'http://localhost:3001',
      container: container,
      config: {
        dracoPath: 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/',
        fitCamera: true,
        autoResize: true
      }
    }).then(({ sceneManager, scene, camera }) => {
      loading.style.display = 'none';
      console.log('场景加载成功');
      console.log('场景对象数量:', scene.children.length);
      
      setTimeout(() => {
        sceneManager.fitCameraToScene();
      }, 5000);
      
    }).catch(error => {
      loading.textContent = '加载失败: ' + error.message;
      console.error(error);
    });
  <\/script>
</body>
</html>`
};

const copyCode = async (id) => {
  try {
    await navigator.clipboard.writeText(codeExamples[id]);
    copiedId.value = id;
    setTimeout(() => {
      copiedId.value = null;
    }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
  }
};
</script>

<style scoped>
/* 基础变量 */
.api-docs-view {
  --primary: #00d4ff;
  --primary-dark: #0099cc;
  --secondary: #7c3aed;
  --bg-dark: #0a0a0f;
  --bg-card: rgba(20, 20, 30, 0.8);
  --text-primary: #ffffff;
  --text-secondary: #94a3b8;
  --border-color: rgba(255, 255, 255, 0.1);
  --code-bg: #1e1e2e;
  
  min-height: 100vh;
  background: var(--bg-dark);
  background-image: 
    radial-gradient(ellipse at 20% 0%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(124, 58, 237, 0.1) 0%, transparent 50%);
  color: var(--text-primary);
}

/* 导航栏 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: rgba(10, 10, 15, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
}

.back-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 16px;
  transition: color 0.3s;
}

.back-link:hover {
  color: var(--primary);
}

.github-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.github-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--primary);
}

/* 文档容器 */
.docs-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 120px 30px 60px;
}

/* 文档头部 */
.docs-header {
  text-align: center;
  margin-bottom: 60px;
}

.docs-title {
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.title-icon {
  font-size: 42px;
}

.docs-subtitle {
  font-size: 20px;
  color: var(--text-secondary);
  margin: 0;
}

/* 文档章节 */
.docs-section {
  margin-bottom: 50px;
  padding: 30px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 20px;
  color: var(--text-primary);
}

.section-desc {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 20px;
}

.section-desc code {
  background: var(--code-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  color: var(--primary);
}

/* API 名称 */
.api-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 10px;
  font-family: 'Fira Code', monospace;
}

.api-desc {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 25px;
}

/* 参数标题 */
.params-title {
  font-size: 16px;
  font-weight: 600;
  margin: 25px 0 15px;
  color: var(--text-primary);
}

/* 参数表格 */
.params-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.params-table th,
.params-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.params-table th {
  background: rgba(0, 212, 255, 0.1);
  color: var(--text-primary);
  font-weight: 600;
}

.params-table td {
  color: var(--text-secondary);
}

.params-table td code {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  color: var(--primary);
  font-size: 13px;
}

.params-table tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

/* 代码块 */
.code-block {
  background: var(--code-bg);
  border-radius: 12px;
  overflow: hidden;
  margin-top: 15px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid var(--border-color);
}

.code-lang {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.copy-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  color: var(--primary);
}

.code-content {
  margin: 0;
  padding: 20px;
  overflow-x: auto;
}

.code-content code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #e0e0e0;
}

/* 注意事项列表 */
.notes-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.notes-list li {
  padding: 15px 0;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  line-height: 1.6;
}

.notes-list li:last-child {
  border-bottom: none;
}

.notes-list li strong {
  color: var(--text-primary);
}

.notes-list li code {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  color: var(--primary);
}

/* 页脚 */
.footer {
  border-top: 1px solid var(--border-color);
  background: rgba(10, 10, 15, 0.9);
}

.footer-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.brand-icon {
  font-size: 20px;
}

.footer-copyright {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 响应式 */
@media (max-width: 768px) {
  .navbar {
    padding: 15px 20px;
  }
  
  .docs-container {
    padding: 100px 15px 40px;
  }
  
  .docs-title {
    font-size: 32px;
  }
  
  .docs-section {
    padding: 20px;
  }
  
  .section-title {
    font-size: 20px;
  }
  
  .params-table {
    font-size: 12px;
  }
  
  .params-table th,
  .params-table td {
    padding: 8px 10px;
  }
}
</style>
