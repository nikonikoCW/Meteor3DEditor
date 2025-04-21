/*
 * @Author: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @Date: 2025-04-15 15:17:59
 * @LastEditors: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @LastEditTime: 2025-04-18 16:51:45
 * @FilePath: \nico\src\commonjs\camera.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import TWEEN from '@tweenjs/tween.js';

export function flyto (val) {
    // 创建平滑过渡动画
    new TWEEN.Tween(camera.position)
        .to({
            x: val.position.x,
            y: val.position.y,
            z: val.position.z
        }, 50) // 过渡时间 1000 毫秒
        .easing(TWEEN.Easing.Quadratic.Out) // 
        .start();

    new TWEEN.Tween(controls.target)
        .to({
            x: val.target.x,
            y: val.target.y,
            z: val.target.z
        }, 50)
        .easing(TWEEN.Easing.Quadratic.Out)
        
        .start();

    console.log('相机状态已恢复:');
    
}

export function getView () {
    let camera = {
        position: window.camera.position.clone(),
        target: window.controls.target.clone() 
    };
    console.log(camera);
    
}