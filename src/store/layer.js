import { defineStore } from "pinia"

export const sceneConfigStore = defineStore('sceneConfig', {
    state: () => {
        return {
            scene: {
                object: [
                ],
                environment: {
                    hdr: "environments/sky.hdr",
                    intensity: 1
                }
            }
        }
    },
    actions:{
        setObject(val){
            this.scene = val
        },
        deleteObject(uuid){
            
            let a = this.scene.object.filter(item => item.uuid !== uuid)
            this.scene.object = a
        }
    },
    getters:{
        files (state){
            return [{
                name: '场景模型',
                children: state.scene.object
            }]
        }
    }
})
