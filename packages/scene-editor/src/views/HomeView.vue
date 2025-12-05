<template>
  <div class="home-view">
    <div class="hero-section">
      <h1 class="title">Meteor3D</h1>
      <p class="subtitle">专业的 3D 场景编辑器</p>
      <p class="description">
        一个功能强大的在线 3D 编辑工具，支持模型导入、场景编辑、资产管理等功能
      </p>
    </div>

    <div class="features-section">
      <div class="feature-card" @click="navigateTo('/scenes')">
        <div class="feature-icon">🎨</div>
        <h2 class="feature-title">3D 编辑器</h2>
        <p class="feature-desc">
          强大的 3D 场景编辑器，支持模型导入、变换操作、材质编辑等功能
        </p>
        <div class="feature-action">
          进入编辑器 →
        </div>
      </div>

      <div class="feature-card" @click="navigateTo('/assets')">
        <div class="feature-icon">📦</div>
        <h2 class="feature-title">资产管理</h2>
        <p class="feature-desc">
          集中管理您的 3D 模型、贴图、HDRI 等资产，支持上传、下载和预览
        </p>
        <div class="feature-action">
          管理资产 →
        </div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-item">
        <h3>✨ 功能特性</h3>
        <ul>
          <li>支持 GLTF/GLB 模型导入</li>
          <li>实时 3D 场景编辑</li>
          <li>完整的变换控制（移动、旋转、缩放）</li>
          <li>材质属性编辑</li>
          <li>场景数据持久化</li>
          <li>资产云端存储</li>
        </ul>
      </div>

      <div class="info-item">
        <h3>🚀 快速开始</h3>
        <ol>
          <li>点击上方"3D 编辑器"进入编辑界面</li>
          <li>从左侧库面板拖拽几何体或模型到场景</li>
          <li>使用变换工具调整对象位置</li>
          <li>在右侧属性面板编辑对象属性</li>
          <li>点击工具栏"保存"按钮保存场景</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const navigateTo = (path) => {
  router.push(path);
};
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  color: white;
  overflow-y: auto;
}

.hero-section {
  text-align: center;
  padding: 80px 20px 60px;
  background: linear-gradient(180deg, rgba(0, 102, 204, 0.1) 0%, transparent 100%);
}

.title {
  font-size: 64px;
  font-weight: 700;
  margin: 0 0 20px;
  background: linear-gradient(135deg, #0066cc 0%, #00aaff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 24px;
  color: #aaa;
  margin: 0 0 20px;
}

.description {
  font-size: 16px;
  color: #888;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.features-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
}

.feature-card {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 40px 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.feature-card:hover {
  transform: translateY(-8px);
  border-color: #0066cc;
  box-shadow: 0 12px 24px rgba(0, 102, 204, 0.3);
}

.feature-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.feature-title {
  font-size: 24px;
  margin: 0 0 15px;
  color: white;
}

.feature-desc {
  font-size: 14px;
  color: #aaa;
  line-height: 1.6;
  margin: 0 0 20px;
}

.feature-action {
  color: #0066cc;
  font-weight: 600;
  font-size: 16px;
}

.info-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px 80px;
}

.info-item {
  background: #222;
  border-radius: 8px;
  padding: 30px;
}

.info-item h3 {
  font-size: 20px;
  margin: 0 0 20px;
  color: white;
}

.info-item ul,
.info-item ol {
  margin: 0;
  padding-left: 20px;
  color: #aaa;
  line-height: 1.8;
}

.info-item li {
  margin-bottom: 8px;
}
</style>
