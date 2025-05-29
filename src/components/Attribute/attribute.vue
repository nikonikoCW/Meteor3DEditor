<template>
    <el-form :model="form" label-width="auto" class="weather-option">
        <p>位置</p>
        <el-form-item label="X" >
            <el-input v-model="modelValue.position.x"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="Y">
            <el-input v-model="form.speed" :min="1" :max="10"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="Z">
            <el-input v-model="form.height" :min="1" :max="1000"  size="small" class="me-input"/>
        </el-form-item>
        <p>旋转</p>
        <el-form-item label="X" >
            <el-input v-model="form.size" :min="1" :max="10"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="Y">
            <el-input v-model="form.speed" :min="1" :max="10"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="Z">
            <el-input v-model="form.height" :min="1" :max="1000"  size="small" class="me-input"/>
        </el-form-item>
        <p>缩放</p>
        <el-form-item label="X" >
            <el-input v-model="form.size" :min="1" :max="10"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="Y">
            <el-input v-model="form.speed" :min="1" :max="10"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="Z">
            <el-input v-model="form.height" :min="1" :max="1000"  size="small" class="me-input"/>
        </el-form-item>
    </el-form>
</template>

<script setup>
import { reactive,onMounted ,computed,ref} from 'vue'

const form = reactive({
  locationX: 'null',
  locationY:1,
  locationZ:10,
  scaleX:500,
  scaleY:1000,
  scaleZ:1000,
  rotationX:500,
  rotationY:1000,
  rotationZ:1000,
})
let modelValue = reactive({
    position:{
        x:0
    }
})

onMounted(()=>{
    console.log(meteor3D);
    debugger
    modelValue = meteor3D.selectedModel
})


</script>

<style scoped>
.weather-option{
    width: 100%;
    /* background-color: red; */
}
.me-select{
    width: 120px;
}
.me-input{
    width: 100px;
}
</style>