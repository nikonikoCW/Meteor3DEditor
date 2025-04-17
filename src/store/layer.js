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
