import {
    createRouter,
    createWebHashHistory
} from 'vue-router'
const Main = () => import('../components/Main/Main.vue')
// const Preview = () => import('../components/Preview/index.vue')
const SceneManagement = () => import('../components/SceneManagement/SceneManagement.vue')
const Test = () => import('../components/Test/Test.vue')

const basicRouter = import.meta.glob('/src/components/Tool/*.vue')
let routes = [
    {
        path: '/',
        name: 'sceneManagement',
        component: SceneManagement,
        children: [
        ]
    },
    // {
    //     path: '/preview',
    //     name: 'preview',
    //     component: Preview
    // },
    {
        path: '/scene',
        name: 'scene',
        component: Main
    },
    {
        path: '/test',
        name: 'Test',
        component: Test
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