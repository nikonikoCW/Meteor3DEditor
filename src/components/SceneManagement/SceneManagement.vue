<template>
  <div class="main">
    <div class="particles" id="particles"></div>

    <nav class="navbar">
      <div class="logo">
        <img src="/assets/images/meteor.png" alt="Logo" />
        <h1>Meteor 3D Editor</h1>
      </div>
      <div class="nav-links">
        <a href="#">首页</a>
        <a href="#">模型</a>
        <a href="#">关于</a>
        <a href="#">联系</a>
      </div>
      <div class="search-bar">
        <input type="text" placeholder="搜索模型..." />
        <button>搜索</button>
      </div>
    </nav>

    <div class="main-content">
      <aside class="filter-sidebar" :class="{ active: isFilterActive }">
        <button class="filter-toggle" @click="toggleFilter">切换滤镜</button>
        <div class="filter-section">
          <h3>类别</h3>
          <label class="filter-option"><input type="checkbox" /> 建筑</label>
          <label class="filter-option"><input type="checkbox" /> 角色</label>
          <label class="filter-option"><input type="checkbox" /> 载具</label>
        </div>
        <div class="filter-section">
          <h3>上传时间</h3>
          <label class="filter-option"><input type="checkbox" /> 最近24小时</label>
          <label class="filter-option"><input type="checkbox" /> 最近一周</label>
          <label class="filter-option"><input type="checkbox" /> 最近一月</label>
        </div>
        <div class="filter-section">
          <h3>复杂度</h3>
          <label class="filter-option"><input type="checkbox" /> 低多边形</label>
          <label class="filter-option"><input type="checkbox" /> 中多边形</label>
          <label class="filter-option"><input type="checkbox" /> 高多边形</label>
        </div>
        <div class="filter-section">
          <h3>标签</h3>
          <label class="filter-option"><input type="checkbox" /> 科幻</label>
          <label class="filter-option"><input type="checkbox" /> 现实</label>
          <label class="filter-option"><input type="checkbox" /> 动画</label>
        </div>
      </aside>

      <div class="model-grid">
        <div class="model-card" v-for="model in models" :key="model.id">
          <div class="model-card-inner" :class="{ flipped: model.flipped }">
            <div class="model-card-front">
              <div class="model-preview" @click="closeFullscreen(true)">
                <img :src="model.preview" alt="Model Preview" />
              </div>
              <div class="model-info">
                <h3>{{ model.title }}</h3>
                <p>{{ model.description }}</p>
                <a href="#" class="view-details" @click.prevent="toggleFlip(model.id)">查看详情</a>
              </div>
            </div>
            <div class="model-card-back">
              <h4>{{ model.title }} 详情</h4>
              <p>{{ model.details }}</p>
              <button class="close-details" @click="toggleFlip(model.id)">关闭</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="fullscreen-view" v-if="showFullscreen" @click="closeFullscreen(false)">
      <div class="fullscreen-content" @click.stop>
        <p>全屏3D模型视图（占位符）</p>
        <button class="close-fullscreen" @click="closeFullscreen(false)">关闭</button>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-links">
        <a href="#">条款</a>
        <a href="#">隐私</a>
        <a href="#">支持</a>
      </div>
      <div class="social-icons">
        <a href="#"><i class="fab fa-twitter"></i></a>
        <a href="#"><i class="fab fa-facebook"></i></a>
        <a href="#"><i class="fab fa-instagram"></i></a>
      </div>
      <p><span>© 2025 Meteor 3D Editor. 保留所有权利。</span><span style="margin: 0 20px;">|</span> <span>蜀ICP备2025144361号</span> </p>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';

const router = useRouter()
// 响应式状态
const isFilterActive = ref(false);
const showFullscreen = ref(false);
const models = ref([
  { id: 1, title: '空间站', description: '高多边形科幻空间站，带有详细纹理。', details: '多边形数: 150K\n纹理: 4K\n类别: 科幻', preview: '/assets/images/md/3.png', flipped: false },
  { id: 2, title: '赛博车', description: '带有动画灯光的未来主义低多边形载具。', details: '多边形数: 20K\n纹理: 2K\n类别: 载具', preview: 'https://ai-public.mastergo.com/ai/img_res/02ac055f6e8acf696214fe1d82206eaa.jpg', flipped: false },
  { id: 3, title: '机器人角色', description: '高分辨率纹理的动画机器人。', details: '多边形数: 80K\n纹理: 4K\n类别: 角色', preview: 'https://ai-public.mastergo.com/ai/img_res/3c0e7dcb44a54ea5473a735893782437.jpg', flipped: false },
  { id: 4, title: '未来建筑', description: '带有霓虹装饰的现代建筑模型。', details: '多边形数: 100K\n纹理: 4K\n类别: 建筑', preview: 'https://ai-public.mastergo.com/ai/img_res/02ac055f6e8acf696214fe1d82206eaa.jpg', flipped: false },
  { id: 5, title: '星舰', description: '带有发光引擎的流线型科幻星舰。', details: '多边形数: 120K\n纹理: 4K\n类别: 科幻', preview: 'https://ai-public.mastergo.com/ai/img_res/02ac055f6e8acf696214fe1d82206eaa.jpg', flipped: false },
  { id: 6, title: '赛博摩托', description: '高速未来主义摩托车。', details: '多边形数: 30K\n纹理: 2K\n类别: 载具', preview: 'https://ai-public.mastergo.com/ai/img_res/02ac055f6e8acf696214fe1d82206eaa.jpg', flipped: false },
  { id: 7, title: '外星生物', description: '带有生物发光皮肤的动画外星生物。', details: '多边形数: 90K\n纹理: 4K\n类别: 角色', preview: 'https://ai-public.mastergo.com/ai/img_res/02ac055f6e8acf696214fe1d82206eaa.jpg', flipped: false },
  { id: 8, title: '霓虹城市', description: '带有霓虹灯和高楼的城市模型。', details: '多边形数: 200K\n纹理: 4K\n类别: 建筑', preview: 'https://ai-public.mastergo.com/ai/img_res/02ac055f6e8acf696214fe1d82206eaa.jpg', flipped: false },
  { id: 9, title: '无人机', description: '自主科幻无人机。', details: '多边形数: 50K\n纹理: 2K\n类别: 载具', preview: 'https://ai-public.mastergo.com/ai/img_res/1246ec924520d12e2acd68bafc62190f.jpg', flipped: false },
  { id: 10, title: '太空殖民地', description: '未来太空殖民地模型。', details: '多边形数: 180K\n纹理: 4K\n类别: 建筑', preview: 'https://ai-public.mastergo.com/ai/img_res/1735e371e35f6908b2f7dadbdc98eccf.jpg', flipped: false },
]);

// 方法
const toggleFilter = () => {
  isFilterActive.value = !isFilterActive.value;
};

const toggleFlip = (id) => {
  const model = models.value.find(m => m.id === id);
  model.flipped = !model.flipped;
};

const closeFullscreen = (val) => {
  // showFullscreen.value = val;
  router.push({
    name: 'scene'
  })
};

onMounted(() => {
  // 初始化 Particles.js
  if (window.particlesJS) {
    window.particlesJS('particles', {
      particles: {
        number: { value: 100, density: { enable: true, value_area: 800 } },
        color: { value: ['#00ffff', '#ff00ff', '#00ff00'] },
        shape: { type: ['circle', 'triangle', 'polygon'] },
        opacity: { value: 0.7, random: true },
        size: { value: 4, random: true },
        line_linked: { enable: true, distance: 120, color: '#00ffff', opacity: 0.5, width: 1.5 },
        move: { enable: true, speed: 4, direction: 'none', random: true, out_mode: 'bounce' },
      },
      interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' } },
        modes: { grab: { distance: 150, line_linked: { opacity: 0.7 } }, push: { particles_nb: 6 } },
      },
      retina_detect: true,
    });
  }

  // 初始化 VanillaTilt
  if (window.VanillaTilt) {
    window.VanillaTilt.init(document.querySelectorAll('.model-card'), {
      max: 15,
      speed: 400,
      glare: true,
      'max-glare': 0.3,
      scale: 1.05,
    });
  }

  // 闪烁加载效果   
  document.querySelectorAll('.model-preview').forEach(preview => {
    setTimeout(() => {
      preview.classList.add('loaded');
    }, 1000);
  });
});
</script>

<style scoped>
.main {
    width: 100%;
    height: 100vh;
  background: #1a1f35;
  color: #fff;
  overflow-x: hidden;
  overflow-y: auto; /* 启用垂直滚动 */
  /* min-height: 100vh;保内容可扩展 */
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Arial', sans-serif;
}

/* 导航栏 */
.navbar {
  position: fixed;
  top: 0;
  width: calc(100% - 3px); /* 为滚动条预留空间 */
  padding: 1rem 2rem;
  background: rgba(26, 31, 53, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #00ffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100; /* 降低层级，避免覆盖滚动条 */
}

.logo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo img {
  width: 40px;
  filter: drop-shadow(0 0 5px #00ffff);
}

.logo h1 {
  font-size: 1.5rem;
  color: #00ffff;
  text-shadow: 0 0 10px #00ffff;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  color: #fff;
  text-decoration: none;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: #00ffff;
  text-shadow: 0 0 10px #00ffff;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-bar input {
  padding: 0.5rem;
  border: 1px solid #00ffff;
  background: transparent;
  color: #fff;
  border-radius: 5px;
}

.search-bar button {
  padding: 0.5rem;
  background: #00ffff;
  border: none;
  color: #1a1f35;
  cursor: pointer;
  border-radius: 5px;
}

/* 主要内容 */
.main-content {
  display: flex;
  margin-top: 80px;
  padding: 2rem;
  min-height: calc(100vh - 80px); /* 允许内容扩展 */
}

/* 滤镜侧边栏 */
.filter-sidebar {
  width: 250px;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(0, 255, 255, 0.05));
  border-right: 2px solid #00ffff;
  height: calc(100vh - 80px);
  position: sticky;
  top: 0; /* 确保粘性定位从顶部开始 */
  animation: pulse-border 2s infinite;
  overflow: hidden;
  position: relative;
}

.filter-sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" opacity="0.1"><pattern id="circuit" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M0 0h50v50H0z" fill="none"/><path d="M10 10h30v30H10z" stroke="%2300ffff" stroke-width="1"/><circle cx="25" cy="25" r="5" fill="%2300ffff"/></pattern><rect width="100%" height="100%" fill="url(%23circuit)"/></svg>');
  opacity: 0.1;
  z-index: -1;
}

@keyframes pulse-border {
  0% { box-shadow: 0 0 5px #00ffff; }
  50% { box-shadow: 0 0 15px #00ffff; }
  100% { box-shadow: 0 0 5px #00ffff; }
}

.filter-toggle {
  display: none;
  padding: 0.5rem;
  background: #00ffff;
  color: #1a1f35;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-bottom: 1rem;
  text-align: center;
  transition: transform 0.3s;
}

.filter-toggle:hover {
  transform: scale(1.1);
}

.filter-section {
  margin-bottom: 2rem;
  animation: slide-in 0.5s ease-out forwards;
  animation-delay: calc(var(--order) * 0.1s);
  opacity: 0;
}

@keyframes slide-in {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.filter-section:nth-child(1) { --order: 1; }
.filter-section:nth-child(2) { --order: 2; }
.filter-section:nth-child(3) { --order: 3; }
.filter-section:nth-child(4) { --order: 4; }

.filter-section h3 {
  color: #00ffff;
  margin-bottom: 1rem;
  text-shadow: 0 0 5px #00ffff;
  font-size: 1.2rem;
}

.filter-option {
  display: flex;
  align-items: center;
  color: #fff;
  margin: 0.5rem 0;
  cursor: pointer;
  transition: color 0.3s, transform 0.3s;
}

.filter-option:hover {
  color: #00ffff;
  transform: scale(1.05);
}

.filter-option input[type="checkbox"] {
  appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid #00ffff;
  border-radius: 3px;
  margin-right: 0.5rem;
  position: relative;
  cursor: pointer;
}

.filter-option input[type="checkbox"]:checked {
  background: #00ffff;
  box-shadow: 0 0 10px #00ffff;
}

.filter-option input[type="checkbox"]:checked::after {
  content: '✔';
  color: #1a1f35;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
}

.filter-option input[type="checkbox"]:hover {
  box-shadow: 0 0 5px #00ffff;
}

.filter-option input[type="checkbox"]:active::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30px;
  height: 30px;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.3), transparent);
  transform: translate(-50%, -50%) scale(0);
  animation: ripple 0.4s ease-out;
}

@keyframes ripple {
  to { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}

/* 模型网格 */
.model-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  padding: 0 2rem;
}

.model-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(0, 255, 255, 0.05));
  backdrop-filter: blur(10px);
  border: 2px solid #00ffff;
  border-radius: 10px;
  padding: 0.5rem;
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 280px;
  position: relative;
  animation: pulse-border 2s infinite;
}

.model-card:hover {
  transform: scale(1.05) translateY(-3px);
  box-shadow: 0 0 20px #00ffff;
}

.model-preview {
  width: 100%;
  height: 140px;
  background: #2a2f45;
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.model-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: rotate 15s linear infinite;
  opacity: 0;
  transition: opacity 1s ease;
}

.model-preview.loaded img {
  opacity: 1;
}

.model-preview::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent);
  animation: shimmer 15s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

@keyframes rotate {
  from { transform: rotateY(0deg); }
  to { transform: rotateY(360deg); }
}

.model-info {
  padding: 0.5rem 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.model-info h3 {
  color: #00ffff;
  font-size: 1rem;
  margin-bottom: 0.3rem;
  text-shadow: 0 0 5px #00ffff;
}

.model-info p {
  color: #ccc;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.view-details {
  display: block;
  width: 100%;
  padding: 0.4rem;
  background: #00ffff;
  color: #1a1f35;
  text-align: center;
  border-radius: 5px;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: bold;
  transition: background 0.3s;
}

.view-details:hover {
  background: #00cccc;
}

/* 卡片翻转效果 */
.model-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s;
}

.model-card-inner.flipped {
  transform: rotateY(180deg);
}

.model-card-front,
.model-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
}

.model-card-back {
  transform: rotateY(180deg);
  background: rgba(26, 31, 53, 0.9);
  padding: 1rem;
  color: #fff;
  text-align: center;
}

.model-card-back h4 {
  color: #00ffff;
  margin-bottom: 0.5rem;
}

.model-card-back p {
  font-size: 0.8rem;
  color: #ccc;
}

.close-details {
  margin-top: auto;
  padding: 0.4rem;
  background: #ff4d4d;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

/* 全屏视图 */
.fullscreen-view {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(26, 31, 53, 0.95);
  z-index: 2000; /* 高于导航栏 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-content {
  width: 80%;
  height: 80%;
  background: #2a2f45;
  border: 2px solid #00ffff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-fullscreen {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #00ffff;
  color: #1a1f35;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
}

/* 页脚 */
.footer {
  padding: 2rem;
  background: #15182b;
  border-top: 1px solid #00ffff;
  text-align: center;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
}

.footer-links a {
  color: #fff;
  text-decoration: none;
}

.footer-links a:hover {
  color: #00ffff;
}

.social-icons {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.social-icons a {
  color: #fff;
  font-size: 1.5rem;
}

.social-icons a:hover {
  color: #00ffff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .filter-sidebar {
    width: 100%;
    height: auto;
    position: relative;
    display: none;
  }

  .filter-sidebar.active {
    display: block;
  }

  .filter-toggle {
    display: block;
  }

  .model-grid {
    grid-template-columns: 1fr;
    padding: 0 1rem;
  }

  .model-card {
    height: 260px;
  }

  .navbar {
    flex-direction: column;
    gap: 1rem;
    width: 100%; /* 移动端占满宽度 */
  }

  .nav-links {
    flex-direction: column;
    align-items: center;
  }
}

/* 粒子动画 */
.particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}


</style>
