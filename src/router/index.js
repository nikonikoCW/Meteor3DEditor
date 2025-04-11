import {
    createRouter,
    createWebHashHistory
} from 'vue-router'
const Main = () => import('../components/Main/Main.vue')
const Preview = () => import('../components/Preview/index.vue')

const basicRouter = import.meta.glob('/src/components/Tool/*.vue')
let routes = [
    {
        path: '/',
        name: 'main',
        component: Main,
        children: [
        ]
    },
    {
        path: '/preview',
        name: 'preview',
        component: Preview
    }
]




const router = createRouter({
    history: createWebHashHistory(),
    routes
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
    if (to.meta.title) {
        document.title = `${to.meta.title}`;
    }
    next()
})

router.afterEach((to, from) => {
})

export default router