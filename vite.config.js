/*
 * @Author: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @Date: 2025-03-31 09:44:11
 * @LastEditors: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @LastEditTime: 2025-03-31 14:51:13
 * @FilePath: \nico\vite.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // 监听所有地址
    port: 8080, // 指定启动端口
    open: true // 启动后自动打开浏览器
  }
})
