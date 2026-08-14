<template>
  <div class="landing-page">
    <header class="site-header">
      <RouterLink to="/" class="brand">
        <img src="/meteor-min.png" alt="Meteor3D" width="36" height="36">
        <span>Meteor3D</span>
      </RouterLink>
      <a class="header-cta" href="https://editor.meteor3d.cn">在线体验</a>
    </header>

    <main>
      <section class="hero">
        <p class="eyebrow">{{ page.eyebrow }}</p>
        <h1>{{ page.title }}</h1>
        <p class="lead">{{ page.intro }}</p>
        <div class="hero-actions">
          <a class="primary-button" href="https://editor.meteor3d.cn">进入 3D 场景编辑器</a>
          <a class="secondary-button" href="mailto:84675738@qq.com">咨询与合作</a>
        </div>
      </section>

      <section class="content-section" aria-labelledby="capabilities-title">
        <p class="section-kicker">平台能力</p>
        <h2 id="capabilities-title">从三维内容到可交互应用</h2>
        <div class="capability-grid">
          <article v-for="([title, text], index) in page.capabilities" :key="title" class="capability-card">
            <span class="card-number">0{{ index + 1 }}</span>
            <h3>{{ title }}</h3>
            <p>{{ text }}</p>
          </article>
        </div>
      </section>

      <section class="content-section split-section">
        <div>
          <p class="section-kicker">适用场景</p>
          <h2>面向真实项目的 Web 3D 工具链</h2>
          <p class="body-copy">Meteor3D 将资产处理、场景编辑、应用编排、AI 交互和 SDK 交付组织在同一套工作流中。团队可以从已有模型和业务需求出发，逐步完成三维空间搭建、信息表达和网页集成。</p>
        </div>
        <ul class="scenario-list">
          <li v-for="scenario in page.scenarios" :key="scenario">{{ scenario }}</li>
        </ul>
      </section>

      <section class="content-section" aria-labelledby="faq-title">
        <p class="section-kicker">常见问题</p>
        <h2 id="faq-title">进一步了解 Meteor3D</h2>
        <div class="faq-list">
          <details v-for="([question, answer], index) in page.faq" :key="question" :open="index === 0">
            <summary>{{ question }}</summary>
            <p>{{ answer }}</p>
          </details>
        </div>
      </section>

      <section class="related-section">
        <h2>相关产品与解决方案</h2>
        <nav class="related-links" aria-label="相关页面">
          <RouterLink v-for="item in relatedPages" :key="item.path" :to="item.path">
            {{ item.title }}
          </RouterLink>
        </nav>
      </section>
    </main>

    <footer>
      <RouterLink to="/">Meteor3D 首页</RouterLink>
      <span>AI 驱动的 3D 数字孪生低代码平台</span>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { seoPages } from '../seoPages'

const route = useRoute()
const page = computed(() => seoPages[route.meta.pageKey] || seoPages.digitalTwin)
const relatedPages = computed(() => Object.values(seoPages)
  .filter(item => item.path !== page.value.path)
  .slice(0, 5))
</script>

<style scoped>
.landing-page {
  --primary: #00d4ff;
  --secondary: #7c3aed;
  --text: #f8fafc;
  --muted: #94a3b8;
  --border: rgba(148, 163, 184, 0.2);
  min-height: 100vh;
  color: var(--text);
  background: #080b12;
  background-image:
    radial-gradient(circle at 15% 0%, rgba(0, 212, 255, 0.14), transparent 32%),
    radial-gradient(circle at 88% 10%, rgba(124, 58, 237, 0.16), transparent 28%);
}

.site-header {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: white;
  text-decoration: none;
  font-size: 21px;
  font-weight: 750;
}

.brand img { border-radius: 9px; }

.header-cta,
.primary-button,
.secondary-button {
  text-decoration: none;
  border-radius: 10px;
  font-weight: 650;
  transition: transform .2s ease, border-color .2s ease;
}

.header-cta {
  padding: 10px 18px;
  color: white;
  border: 1px solid var(--border);
}

.hero {
  width: min(940px, calc(100% - 40px));
  margin: 0 auto;
  padding: 110px 0 100px;
  text-align: center;
}

.eyebrow,
.section-kicker {
  color: var(--primary);
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 20px 0 26px;
  font-size: clamp(42px, 7vw, 72px);
  line-height: 1.08;
  letter-spacing: -.045em;
  background: linear-gradient(120deg, #fff 15%, #7dd3fc 50%, #c4b5fd 85%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.lead {
  max-width: 780px;
  margin: 0 auto;
  color: #cbd5e1;
  font-size: 19px;
  line-height: 1.9;
}

.hero-actions {
  margin-top: 36px;
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}

.primary-button,
.secondary-button { padding: 15px 24px; }
.primary-button { color: #071018; background: linear-gradient(120deg, #22d3ee, #a78bfa); }
.secondary-button { color: white; border: 1px solid var(--border); }
.primary-button:hover, .secondary-button:hover, .header-cta:hover { transform: translateY(-2px); border-color: var(--primary); }

.content-section,
.related-section {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 80px 0;
  border-top: 1px solid var(--border);
}

.content-section h2,
.related-section h2 {
  margin: 12px 0 32px;
  font-size: clamp(30px, 4vw, 44px);
  letter-spacing: -.025em;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.capability-card {
  padding: 30px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: rgba(15, 23, 42, .66);
}

.card-number { color: var(--primary); font-size: 13px; font-weight: 800; }
.capability-card h3 { margin: 18px 0 12px; font-size: 22px; }
.capability-card p, .body-copy, .faq-list p { color: var(--muted); line-height: 1.8; }

.split-section {
  display: grid;
  grid-template-columns: 1.1fr .9fr;
  gap: 80px;
  align-items: start;
}

.scenario-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.scenario-list li {
  padding: 18px 20px;
  border-left: 3px solid var(--primary);
  background: rgba(15, 23, 42, .72);
  color: #e2e8f0;
}

.faq-list { display: grid; gap: 12px; }
.faq-list details { padding: 20px 22px; border: 1px solid var(--border); border-radius: 12px; background: rgba(15, 23, 42, .6); }
.faq-list summary { cursor: pointer; font-weight: 650; }
.faq-list p { margin: 14px 0 0; }

.related-links { display: flex; flex-wrap: wrap; gap: 12px; }
.related-links a { color: #cbd5e1; text-decoration: none; padding: 11px 14px; border: 1px solid var(--border); border-radius: 9px; }
.related-links a:hover { color: white; border-color: var(--primary); }

footer {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 32px 0 48px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  gap: 20px;
  color: var(--muted);
  font-size: 14px;
}

footer a { color: white; text-decoration: none; }

@media (max-width: 760px) {
  .hero { padding: 70px 0; }
  .capability-grid, .split-section { grid-template-columns: 1fr; }
  .split-section { gap: 30px; }
  .content-section, .related-section { padding: 58px 0; }
  footer { flex-direction: column; }
}
</style>
