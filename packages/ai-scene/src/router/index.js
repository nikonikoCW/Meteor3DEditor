import { createRouter, createWebHistory } from 'vue-router'
import ScenesView from '../views/ScenesView.vue'
import AiPreview from '../views/AiPreview.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/scenes'
        },
        {
            path: '/scenes',
            name: 'scenes',
            component: ScenesView,
        },
        {
            path: '/preview/:sceneId',
            name: 'ai-preview',
            component: AiPreview,
        },
    ],
})

export default router
