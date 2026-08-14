import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ApiDocsView from '../views/ApiDocsView.vue'
import SeoLandingView from '../views/SeoLandingView.vue'
import { defaultSeo, applySeo } from '../seo'
import { seoPages, seoRoutes } from '../seoPages'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            meta: { seo: defaultSeo }
        },
        {
            path: '/api-docs',
            name: 'api-docs',
            component: ApiDocsView,
            meta: {
                seo: {
                    title: 'Meteor3D Core SDK API 文档 - Web3D 场景开发',
                    description: 'Meteor3D Core SDK API 文档，介绍 3D 场景加载、对象查询、相机导航、标签、天气、特效和 Web3D 集成方法。',
                    path: '/api-docs',
                    keywords: ['Meteor3D SDK', 'Web3D SDK', 'Three.js API', '3D场景开发']
                }
            }
        },
        ...seoRoutes.map(({ key, path }) => ({
            path,
            name: key,
            component: SeoLandingView,
            meta: {
                pageKey: key,
                seo: {
                    title: seoPages[key].seoTitle,
                    description: seoPages[key].description,
                    path,
                    keywords: seoPages[key].keywords
                }
            }
        }))
    ]
})

router.afterEach((to) => {
    applySeo(to.meta.seo || defaultSeo)
})

export default router
