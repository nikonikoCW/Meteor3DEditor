<template>
  <div class="home-view">
    <!-- 粒子背景 -->
    <div class="particles">
      <div class="particle" v-for="n in 50" :key="n" :style="getParticleStyle(n)"></div>
    </div>

    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-brand">
        <span class="brand-icon">🌟</span>
        <span class="brand-text">Meteor3D</span>
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

    <!-- 主视觉区域 -->
    <section class="hero-section">
      <div class="hero-glow"></div>
      <h1 class="title">
        <span class="title-gradient">Meteor3D</span>
      </h1>
      <p class="subtitle">低代码 3D 场景可视化平台</p>
      <p class="description">
        新一代在线 3D 编辑工具，支持模型导入、场景编辑、资产管理等功能<br>
        让创意触手可及
      </p>
      <div class="hero-actions">
        <button class="btn-primary" @click="navigateTo('scene-editor')">
          <span class="btn-text">开始创作</span>
          <span class="btn-arrow">→</span>
        </button>
        <a href="https://github.com/nikonikoCW/Meteor3DEditor" target="_blank" class="btn-secondary">
          <svg class="github-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Star on GitHub
        </a>
      </div>
    </section>

    <!-- 产品入口 -->
    <section class="products-section">
      <h2 class="section-title">
        <span class="section-icon">🚀</span>
        产品矩阵
      </h2>
      <div class="products-grid">
        <div class="product-card" @click="navigateTo('scene-editor')">
          <div class="card-glow"></div>
          <div class="product-icon">🎨</div>
          <h3 class="product-title">3D 场景编辑器</h3>
          <p class="product-desc">
            强大的 3D 场景编辑器，支持模型导入、变换操作、材质编辑等功能
          </p>
          <div class="product-action">进入编辑器 →</div>
        </div>

        <div class="product-card" @click="navigateTo('ai-scene')">
          <div class="card-glow"></div>
          <div class="product-icon">🤖</div>
          <h3 class="product-title">AI 空间场景</h3>
          <p class="product-desc">
            AI 驱动的 3D 场景交互体验，自然语言控制天气、高亮、运镜等空间操作
          </p>
          <div class="product-action">进入 AI 场景 →</div>
        </div>

        <div class="product-card" @click="navigateTo('asset-manager')">
          <div class="card-glow"></div>
          <div class="product-icon">📦</div>
          <h3 class="product-title">资产管理</h3>
          <p class="product-desc">
            集中管理您的 3D 模型、贴图、HDRI 等资产，支持上传、下载和预览
          </p>
          <div class="product-action">管理资产 →</div>
        </div>

        <div class="product-card" @click="navigateTo('app-editor')">
          <div class="card-glow"></div>
          <div class="product-icon">📊</div>
          <h3 class="product-title">大屏应用编辑器</h3>
          <p class="product-desc">
            大屏可视化项目开发，拖拽式页面搭建，数据绑定与场景组件嵌入
          </p>
          <div class="product-action">开始开发 →</div>
        </div>

        <div class="product-card" @click="navigateTo('api-docs')">
          <div class="card-glow"></div>
          <div class="product-icon">📚</div>
          <h3 class="product-title">API 文档</h3>
          <p class="product-desc">
            Core SDK 使用文档，一行代码嵌入 3D 场景到任意网页
          </p>
          <div class="product-action">查看文档 →</div>
        </div>
      </div>
    </section>

    <!-- 功能亮点 -->
    <section class="features-section">
      <h2 class="section-title">
        <span class="section-icon">✨</span>
        功能亮点
      </h2>
      <div class="features-grid">
        <div class="feature-item">
          <div class="feature-icon-wrapper">
            <span class="feature-icon">⚡</span>
          </div>
          <h4 class="feature-title">高性能渲染</h4>
          <p class="feature-desc">基于 Three.js 的 WebGL 渲染引擎，流畅处理复杂场景</p>
        </div>

        <div class="feature-item">
          <div class="feature-icon-wrapper">
            <span class="feature-icon">🌍</span>
          </div>
          <h4 class="feature-title">GIS 坐标支持</h4>
          <p class="feature-desc">支持经纬度与世界坐标互转，轻松构建地理信息可视化</p>
        </div>

        <div class="feature-item">
          <div class="feature-icon-wrapper">
            <span class="feature-icon">📁</span>
          </div>
          <h4 class="feature-title">多格式支持</h4>
          <p class="feature-desc">支持 GLTF/GLB、FBX 等主流 3D 格式，Draco 压缩优化</p>
        </div>

        <div class="feature-item">
          <div class="feature-icon-wrapper">
            <span class="feature-icon">☁️</span>
          </div>
          <h4 class="feature-title">云端存储</h4>
          <p class="feature-desc">场景与资产云端同步，随时随地继续创作</p>
        </div>

        <div class="feature-item">
          <div class="feature-icon-wrapper">
            <span class="feature-icon">🔌</span>
          </div>
          <h4 class="feature-title">SDK 集成</h4>
          <p class="feature-desc">Core SDK 独立打包，一行代码嵌入第三方应用</p>
        </div>

        <div class="feature-item">
          <div class="feature-icon-wrapper">
            <span class="feature-icon">🎯</span>
          </div>
          <h4 class="feature-title">可视化操作</h4>
          <p class="feature-desc">拖拽式场景搭建，属性面板实时编辑，所见即所得</p>
        </div>
      </div>
    </section>

    <!-- 联系我们 -->
    <section class="contact-section">
      <div class="contact-card">
        <h2 class="contact-title">
          <span class="section-icon">📧</span>
          联系我们
        </h2>
        <p class="contact-desc">如有任何问题或合作意向，欢迎联系</p>
        <div class="contact-methods">
          <a href="mailto:84675738@qq.com" class="contact-method">
            <span class="contact-icon">✉️</span>
            84675738@qq.com
          </a>
          <div class="contact-method">
            <span class="contact-icon">
              <svg t="1784856669536" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1751" width="32" height="32"><path d="M1024 619.52c0-143.36-138.24-256-307.2-256s-307.2 112.64-307.2 256 138.24 256 307.2 256c30.72 0 61.44-5.12 92.16-10.24l97.28 51.2-25.6-76.8c87.04-51.2 143.36-128 143.36-220.16z m-414.72-40.96c-30.72 0-51.2-20.48-51.2-51.2s20.48-51.2 51.2-51.2 51.2 20.48 51.2 51.2c0 25.6-25.6 51.2-51.2 51.2z m209.92 0c-30.72 0-51.2-20.48-51.2-51.2s20.48-51.2 51.2-51.2 51.2 20.48 51.2 51.2c0 25.6-25.6 51.2-51.2 51.2z" fill="#4CBF00" p-id="1752"></path><path d="M358.4 609.28c0-158.72 153.6-286.72 348.16-286.72h15.36c-40.96-133.12-179.2-235.52-353.28-235.52-204.8 0-368.64 138.24-368.64 307.2 0 107.52 66.56 204.8 168.96 256l-30.72 92.16L256 686.08c35.84 10.24 71.68 15.36 112.64 15.36h10.24c-15.36-30.72-20.48-61.44-20.48-92.16z m138.24-414.72c35.84 0 66.56 30.72 66.56 66.56s-30.72 66.56-66.56 66.56C460.8 322.56 430.08 291.84 430.08 256S460.8 194.56 496.64 194.56zM245.76 322.56c-35.84 0-61.44-30.72-61.44-66.56s30.72-66.56 66.56-66.56 61.44 30.72 61.44 66.56-30.72 66.56-66.56 66.56z" fill="#4CBF00" p-id="1753"></path></svg>
            </span>
            微信：niccww
          </div>
        </div>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <span class="brand-icon">🌟</span>
          <span>Meteor3D</span>
        </div>
        <div class="footer-links">
          <a href="https://github.com/nikonikoCW/Meteor3DEditor" target="_blank">GitHub</a>
          <span class="divider">|</span>
          <a href="mailto:84675738@qq.com">联系我们</a>
        </div>
        <div class="footer-partners">
          <span class="partner-label">云存储服务支持</span>
          <a href="https://www.upyun.com/?utm_source=lianmeng&utm_medium=referral" target="_blank">
            <img src="/又拍云_logo3.png" alt="又拍云" class="partner-logo" />
          </a>
        </div>
        <div class="footer-copyright">
          © 2025 Meteor3DEditor. 保留所有权利。
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
// 各子系统的端口配置
const PORTS = {
  'scene-editor': 5173,
  'asset-manager': 5175,
  'app-editor': 5174,
  'ai-scene': 5176
}

const navigateTo = (app) => {
  switch (app) {
    case 'scene-editor':
      window.location.href = `https://editor.meteor3d.cn`
      break;
    case 'asset-manager':
      window.location.href = `https://assets.meteor3d.cn`
      break;
    case 'app-editor':
      window.location.href = `https://appeditor.meteor3d.cn`
      break;
    case 'ai-scene':
      window.location.href = `https://ai-scene.meteor3d.cn`
      break;
    case 'api-docs':
      window.location.href = `https://api-docs.meteor3d.cn`
      break;
    default:
      break;
  }
}

// 生成随机粒子样式
const getParticleStyle = (n) => {
  const size = Math.random() * 4 + 1
  const left = Math.random() * 100
  const top = Math.random() * 100
  const duration = Math.random() * 20 + 10
  const delay = Math.random() * 10
  
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    top: `${top}%`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`
  }
}
</script>

<style scoped>
/* 基础变量 */
.home-view {
  --primary: #00d4ff;
  --primary-dark: #0099cc;
  --secondary: #7c3aed;
  --accent: #f43f5e;
  --bg-dark: #0a0a0f;
  --bg-card: rgba(20, 20, 30, 0.8);
  --text-primary: #ffffff;
  --text-secondary: #94a3b8;
  --border-color: rgba(255, 255, 255, 0.1);
  
  min-height: 100vh;
  background: var(--bg-dark);
  background-image: 
    radial-gradient(ellipse at 20% 0%, rgba(0, 212, 255, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(124, 58, 237, 0.15) 0%, transparent 50%);
  color: var(--text-primary);
  overflow-x: hidden;
  position: relative;
}

/* 粒子背景 */
.particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  background: var(--primary);
  border-radius: 50%;
  opacity: 0.3;
  animation: float linear infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-30px) translateX(10px);
    opacity: 0.6;
  }
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
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
}

.brand-icon {
  font-size: 28px;
}

.brand-text {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.github-icon {
  opacity: 0.9;
}

/* 主视觉区域 */
.hero-section {
  position: relative;
  padding: 180px 20px 100px;
  text-align: center;
  z-index: 1;
}

.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%);
  pointer-events: none;
}

.title {
  font-size: 80px;
  font-weight: 800;
  margin: 0 0 20px;
  letter-spacing: -2px;
}

.title-gradient {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 50%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease infinite;
  background-size: 200% 200%;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.subtitle {
  font-size: 28px;
  color: var(--text-secondary);
  margin: 0 0 20px;
  font-weight: 300;
}

.description {
  font-size: 18px;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto 40px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0, 212, 255, 0.6);
}

.btn-arrow {
  transition: transform 0.3s ease;
}

.btn-primary:hover .btn-arrow {
  transform: translateX(5px);
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: transparent;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  border-color: var(--primary);
  background: rgba(0, 212, 255, 0.1);
}

/* 通用 section 样式 */
.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 50px;
  text-align: center;
}

.section-icon {
  font-size: 32px;
}

/* 产品入口 */
.products-section {
  position: relative;
  padding: 80px 20px;
  z-index: 1;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.product-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 40px 30px;
  cursor: pointer;
  transition: all 0.4s ease;
  overflow: hidden;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.product-card:hover {
  transform: translateY(-10px);
  border-color: var(--primary);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 212, 255, 0.2);
}

.product-card:hover .card-glow {
  opacity: 1;
}

.product-icon {
  font-size: 56px;
  margin-bottom: 20px;
}

.product-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 15px;
  color: var(--text-primary);
}

.product-desc {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 25px;
}

.product-action {
  color: var(--primary);
  font-weight: 600;
  font-size: 16px;
  transition: transform 0.3s ease;
}

.product-card:hover .product-action {
  transform: translateX(5px);
}

/* 功能亮点 */
.features-section {
  position: relative;
  padding: 80px 20px;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 212, 255, 0.03) 50%, transparent 100%);
  z-index: 1;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-item {
  text-align: center;
  padding: 30px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  border-color: var(--primary);
  transform: translateY(-5px);
}

.feature-icon-wrapper {
  width: 70px;
  height: 70px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(124, 58, 237, 0.2));
  border-radius: 16px;
}

.feature-icon {
  font-size: 32px;
}

.feature-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--text-primary);
}

.feature-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* 联系我们 */
.contact-section {
  position: relative;
  padding: 80px 20px;
  z-index: 1;
}

.contact-card {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding: 50px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 24px;
}

.contact-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 15px;
}

.contact-desc {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 30px;
}

.contact-methods {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.contact-method {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 12px;
  color: white;
  font-size: 18px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
}

.contact-method:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0, 212, 255, 0.6);
}

.contact-icon {
  font-size: 20px;
}

/* 页脚 */
.footer {
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--border-color);
  background: rgba(10, 10, 15, 0.9);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
}

.footer-links {
  display: flex;
  gap: 15px;
  align-items: center;
}

.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-links a:hover {
  color: var(--primary);
}

.footer-links .divider {
  color: var(--border-color);
}

.footer-copyright {
  font-size: 14px;
  color: var(--text-secondary);
}

.footer-partners {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.partner-label {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.8;
}

.partner-logo {
  height: 45px;
  opacity: 1;
  transition: transform 0.3s ease;
}

.partner-logo:hover {
  transform: scale(1.05);
}

/* 响应式 */
@media (max-width: 768px) {
  .navbar {
    padding: 15px 20px;
  }
  
  .title {
    font-size: 48px;
  }
  
  .subtitle {
    font-size: 20px;
  }
  
  .hero-section {
    padding: 140px 20px 60px;
  }
  
  .section-title {
    font-size: 28px;
  }

  .contact-methods {
    flex-direction: column;
  }

  .contact-method {
    justify-content: center;
  }
}
</style>
