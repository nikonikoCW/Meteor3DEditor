/*
 * @Author: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @Date: 2025-03-31 09:44:11
 * @LastEditors: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @LastEditTime: 2025-04-14 14:48:24
 * @FilePath: \nico\vite.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import terser from "@rollup/plugin-terser";

// https://vite.dev/config/
export default defineConfig((mode)=>{
  console.log('Mode:', mode); // 可以在这里打印 mode 以调试
  
  if(mode.mode ==='sdk'){
    console.log('打包sdk');
    return {
      plugins: [
        vue(),
        terser(),
      ],
      build: {
        lib: {
          entry: 'src/commonjs/index.js',
          name: 'Meteor3d',
          formats: ['es', 'umd'],
          fileName: (format) => `Meteor3d.${format}.js`,
        },
        rollupOptions: {
          // external: ['three'],
          output: {
            // globals: {
            //   three: 'THREE',
            // },
          },
        },
      },
      server: {
        host: '0.0.0.0', // 监听所有地址
        port: 8080, // 指定启动端口
        open: true // 启动后自动打开浏览器
      }
    };
  }else{
    console.log('打包工程');
    return {
      plugins: [vue()],
      build: {
        base:'./',
        outDir: 'dist/vue',
      },
      server: {
        host: '0.0.0.0', // 监听所有地址
        port: 8080, // 指定启动端口
        open: true // 启动后自动打开浏览器
      }
    };
  }
})
