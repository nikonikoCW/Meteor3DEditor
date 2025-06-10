import * as THREE from 'three';

class ImportScene {
    constructor() {
        this.objectLoader = new THREE.ObjectLoader();
    }
    _clearScene() {
        window.scene.traverse(function (child) {
            if (child !== camera &&
                child !== scene &&
                !(child instanceof THREE.Light) &&
                !(child instanceof THREE.AxesHelper) &&
                !(child instanceof THREE.GridHelper)) {
                scene.remove(child);
            }
        });
    }
    LoadJson(json){
        this.objectLoader.parse(json, function(obj) {
            scene.add(obj);
            
            // 如果有相机数据，可以更新当前相机
            if (json.camera) {
                camera.position.fromArray(json.camera.position);
                camera.rotation.fromArray(json.camera.rotation);
                camera.updateProjectionMatrix();
                controls.update();
            }
            
            // 隐藏加载提示
            
            console.log("场景加载完成", obj);
        }, function(error) {
            console.error("加载场景出错:", error);
            alert("加载场景出错: " + error.message);
        });
    }
}
export default ImportScene;