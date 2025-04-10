/*
 * @Author: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @Date: 2025-03-31 09:52:02
 * @LastEditors: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @LastEditTime: 2025-03-31 09:54:02
 * @FilePath: \nico\src\router\index.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/*
 * @Author: chen wei
 * @Date: 2024-06-24 10:43:09
 * @LastEditTime: 2024-10-10 15:25:26
 * @Description: 
 */
import {
    createRouter,
    createWebHashHistory
} from 'vue-router'
const Main = () => import('../components/Main/Main.vue')


const basicRouter = import.meta.glob('/src/components/Tool/*.vue')
let routes = [
    {
        path: '/',
        name: 'main',
        component: Main,
        children: [
        ]
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