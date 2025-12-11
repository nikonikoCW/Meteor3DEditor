import { createRouter, createWebHistory } from 'vue-router'
import EditorView from '../views/EditorView.vue'
import ScenesView from '../views/ScenesView.vue'

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
      path: '/editor/:sceneId',
      name: 'editor',
      component: EditorView,
    },
  ],
})

export default router


