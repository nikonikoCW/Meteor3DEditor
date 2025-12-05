import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EditorView from '../views/EditorView.vue'
import AssetsView from '../views/AssetsView.vue'
import ScenesView from '../views/ScenesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/scenes',
      name: 'scenes',
      component: ScenesView,
    },
    {
      path: '/editor/:sceneId',
      name: 'editor',
      component: EditorView,
    },
    {
      path: '/assets',
      name: 'assets',
      component: AssetsView,
    },
  ],
})

export default router
