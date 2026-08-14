import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seoPages } from '../src/seoPages.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const dashboardDir = path.resolve(currentDir, '..')
const distDir = path.join(dashboardDir, 'dist')
const template = await readFile(path.join(distDir, 'index.html'), 'utf8')
const origin = 'https://www.meteor3d.cn'

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const setMeta = (html, attribute, key, content) => {
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"[^>]*>`, 'i')
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}">`
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\n</head>`)
}

const renderStructuredData = ({ url, title, description }) => JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: 'Meteor3D',
      url: origin,
      logo: `${origin}/meteor-min.png`,
      sameAs: ['https://github.com/nikonikoCW/Meteor3DEditor']
    },
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: 'Meteor3D',
      url: origin,
      publisher: { '@id': `${origin}/#organization` }
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      name: title,
      url,
      description,
      isPartOf: { '@id': `${origin}/#website` }
    }
  ]
})

const applyHead = (source, { title, description, route, keywords }) => {
  const url = new URL(route, origin).href
  let html = source.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
  html = setMeta(html, 'name', 'description', description)
  html = setMeta(html, 'name', 'keywords', keywords.join(','))
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', description)
  html = setMeta(html, 'name', 'twitter:url', url)
  html = setMeta(html, 'name', 'twitter:title', title)
  html = setMeta(html, 'name', 'twitter:description', description)
  html = html.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${url}">`)
  html = html.replace(
    /<script id="seo-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script id="seo-jsonld" type="application/ld+json">${renderStructuredData({ url, title, description })}</script>`
  )
  return html
}

const renderLandingContent = (page) => `
    <main class="seo-prerender">
      <header><a href="/">Meteor3D</a></header>
      <article>
        <p>${escapeHtml(page.eyebrow)}</p>
        <h1>${escapeHtml(page.title)}</h1>
        <p>${escapeHtml(page.intro)}</p>
        <section>
          <h2>平台能力</h2>
          ${page.capabilities.map(([title, text]) => `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>`).join('')}
        </section>
        <section>
          <h2>适用场景</h2>
          <ul>${page.scenarios.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </section>
        <section>
          <h2>常见问题</h2>
          ${page.faq.map(([question, answer]) => `<h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p>`).join('')}
        </section>
        <p><a href="https://editor.meteor3d.cn">进入 Meteor3D 3D 场景编辑器</a></p>
      </article>
    </main>`

const homeSeo = {
  title: 'Meteor3D - AI驱动的3D数字孪生低代码平台',
  description: 'Meteor3D 是 AI 驱动的 3D 数字孪生低代码平台，提供拖拽式场景编辑、3D 资产管理、可视化大屏、GIS、高斯泼溅、AI 场景控制和 Web3D SDK。',
  route: '/',
  keywords: ['3D数字孪生', '3D低代码平台', 'Web3D编辑器', 'AI场景控制', '可视化大屏', 'Meteor3D']
}

const homeContent = `
    <main class="seo-prerender">
      <h1>AI 驱动的 3D 数字孪生低代码平台</h1>
      <p>拖拽搭建三维场景与可视化大屏，统一管理 3D 资产，并通过 AI 控制场景、通过 SDK 嵌入业务系统。</p>
      <section><h2>Meteor3D 产品能力</h2><p>平台包含 3D 场景编辑器、AI 空间场景、3D 资产管理、低代码大屏应用编辑器和 Web3D Core SDK。</p></section>
      <nav aria-label="解决方案">
        ${Object.values(seoPages).map(page => `<a href="${page.path}">${escapeHtml(page.title)}</a>`).join(' ')}
      </nav>
    </main>`

const writeRoute = async (route, head, content) => {
  const routeDir = route === '/' ? distDir : path.join(distDir, route.slice(1))
  await mkdir(routeDir, { recursive: true })
  const html = applyHead(template, head).replace('<div id="app"></div>', `<div id="app">${content}</div>`)
  await writeFile(path.join(routeDir, 'index.html'), html, 'utf8')
}

await writeRoute('/', homeSeo, homeContent)

for (const page of Object.values(seoPages)) {
  await writeRoute(page.path, {
    title: page.seoTitle,
    description: page.description,
    route: page.path,
    keywords: page.keywords
  }, renderLandingContent(page))
}

console.log(`Prerendered ${Object.keys(seoPages).length + 1} SEO routes.`)
