import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { initRegistry } from './core/widgetRegistry'

// 初始化组件注册表
initRegistry();

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
