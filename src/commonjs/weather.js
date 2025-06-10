import * as THREE from 'three';

class WeatherEffect {
    constructor(options={}){
        // 创建一个雨滴数组
        this.raindrops = [];
        this.raindropCount = 20000;
        this.rainTexture=null;
        this.options = {
            type:'snow',
            size:1,
            ...options
          };
        this._rain()
    }
    _rain(){
        switch (this.options.type) {
            case 'snow':
                this.rainTexture = new THREE.TextureLoader().load('assets/images/snow.png');  // 你可以选择合适的雨滴纹理图片
                
                break;
            case 'rain':
                this.rainTexture = new THREE.TextureLoader().load('assets/images/rain.png');  // 你可以选择合适的雨滴纹理图片
                
                break;
        
            default:
                break;
        }
        for (let i = 0; i < this.raindropCount; i++) {
            const raindrop = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.rainTexture }));
            raindrop.position.set(
                Math.random() * 1000 - 250, // X位置
                Math.random() * 1000,       // Y位置
                Math.random() * 1000 - 250  // Z位置
            );
            raindrop.scale.set(this.options.size, this.options.size, this.options.size); // 设定雨滴的大小
            this.raindrops.push(raindrop);
            scene.add(raindrop);
        }
    }
    animation(){
        this.raindrops.forEach(raindrop => {
            raindrop.position.y -= Math.random() * 2 + 1; // 雨滴的下落速度
    
            // 如果雨滴掉到下面，则重新随机生成位置
            if (raindrop.position.y < -250) {
                raindrop.position.y = Math.random() * 500;
            }
        });
    }
}

export default WeatherEffect;

// let raindrops = []
// let rainTexture = new THREE.TextureLoader().load('assets/images/rain.png')
// let snowTexture = new THREE.TextureLoader().load('assets/images/snow.png')
// for (let i = 0; i < this.raindropCount; i++) {
//     const raindrop = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.rainTexture }));
//     raindrop.position.set(
//         Math.random() * 1000 - 250, // X位置
//         Math.random() * 1000,       // Y位置
//         Math.random() * 1000 - 250  // Z位置
//     );
//     raindrop.scale.set(this.options.size, this.options.size, this.options.size); // 设定雨滴的大小
//     raindrops.push(raindrop);
//     scene.add(raindrop);
// }
// export const Weather = (options = {}) =>{
//     let options = {
//         type:'rain',
//         size:1,
//         number:1000,
//         area:1000,
//         height:500,
//         ...options
//       };
// }