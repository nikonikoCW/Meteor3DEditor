const SITE_ORIGIN = 'https://www.meteor3d.cn'

const upsertMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value))
}

const upsertCanonical = (href) => {
  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = href
}

export const applySeo = ({ title, description, path = '/', keywords = [], type = 'website', schema = {} }) => {
  const url = new URL(path, SITE_ORIGIN).href
  const image = `${SITE_ORIGIN}/og.png`

  document.title = title
  upsertMeta('meta[name="description"]', { name: 'description', content: description })
  upsertMeta('meta[name="keywords"]', { name: 'keywords', content: keywords.join(',') })
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })
  upsertMeta('meta[name="twitter:url"]', { name: 'twitter:url', content: url })
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })
  upsertCanonical(url)

  const jsonLd = document.getElementById('seo-jsonld')
  if (jsonLd) {
    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE_ORIGIN}/#organization`,
          name: 'Meteor3D',
          url: SITE_ORIGIN,
          logo: `${SITE_ORIGIN}/meteor-min.png`,
          sameAs: ['https://github.com/nikonikoCW/Meteor3DEditor']
        },
        {
          '@type': 'WebPage',
          '@id': `${url}#webpage`,
          url,
          name: title,
          description,
          isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
          about: { '@id': `${SITE_ORIGIN}/#software` }
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_ORIGIN}/#website`,
          name: 'Meteor3D',
          url: SITE_ORIGIN,
          publisher: { '@id': `${SITE_ORIGIN}/#organization` }
        },
        {
          '@type': 'SoftwareApplication',
          '@id': `${SITE_ORIGIN}/#software`,
          name: 'Meteor3D',
          applicationCategory: 'DesignApplication',
          operatingSystem: 'Web Browser',
          url: SITE_ORIGIN,
          description: 'AI 驱动的 3D 数字孪生低代码平台，提供场景编辑、资产管理、可视化大屏、AI 场景交互和 Web3D SDK。',
          author: { '@id': `${SITE_ORIGIN}/#organization` },
          ...schema
        }
      ]
    })
  }
}

export const defaultSeo = {
  title: 'Meteor3D - AI驱动的3D数字孪生低代码平台',
  description: 'Meteor3D 是 AI 驱动的 3D 数字孪生低代码平台，提供拖拽式场景编辑、3D 资产管理、可视化大屏、GIS、高斯泼溅、AI 场景控制和 Web3D SDK。',
  path: '/',
  keywords: ['3D数字孪生', '3D低代码平台', 'Web3D编辑器', 'AI场景控制', '可视化大屏', 'Meteor3D']
}

