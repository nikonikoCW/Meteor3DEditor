/*
 * @Author: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @Date: 2025-04-10 11:07:45
 * @LastEditors: 你的猫掉了耶 8210531+cwniconico@user.noreply.gitee.com
 * @LastEditTime: 2025-05-21 15:33:13
 * @FilePath: \nico\src\commonjs\loadHdr.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import * as THREE from 'three';



class HRDManager{
  constructor(scene,url){
    this.scene = scene
    this.url = url
    this.loadHRd(this.url)
  }
  loadHRd(url){
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(url, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.background = texture; // 设置为场景背景
      this.scene.environment = texture; // 设置为环境光照
    });
  }
}
export default HRDManager;