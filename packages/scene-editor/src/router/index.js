import { createRouter, createWebHistory } from 'vue-router'
import EditorView from '../views/EditorView.vue'
import ScenesView from '../views/ScenesView.vue'
import PreviewView from '../views/PreviewView.vue'

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
    {
      path: '/test',
      name: 'test',
      component: () => import('../views/TestView.vue'),
    },
    {
      path: '/preview/:sceneId',
      name: 'preview',
      component: PreviewView,
    },
  ],
})

export default router


