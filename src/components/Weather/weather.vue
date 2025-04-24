<template>
    <el-form :model="form" label-width="auto" class="weather-option">
        <el-form-item label="天气">
            <el-select v-model="form.weather" placeholder="please select your zone" size="small" placement="bottom" class="me-select">
                <el-option label="无" value="null" />
                <el-option label="雨天" value="rain" />
                <el-option label="雪天" value="snow" />
            </el-select>
        </el-form-item>
        <el-form-item label="雨滴大小" >
            <el-input-number v-model="form.size" :min="1" :max="10"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="速度">
            <el-input-number v-model="form.speed" :min="1" :max="10"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="高度">
            <el-input-number v-model="form.height" :min="1" :max="1000"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="范围">
            <el-input-number v-model="form.area" :min="1" :max="1000"  size="small" class="me-input"/>
        </el-form-item>
        <el-form-item label="数量">
            <el-input-number v-model="form.number" :min="1" :max="100000"  size="small" class="me-input"/>
        </el-form-item>
    </el-form>
</template>

<script setup>
import { reactive } from 'vue'

const form = reactive({
  weather: 'null',
  size:1,
  speed:10,
  height:500,
  area:1000,
  number:1000
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