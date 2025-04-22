<template>
    <div class="menu-nav">
        <span v-for="i in navList" :key="i.index" :class="i.icon"></span>
    </div>
</template>

<script setup>
import {ref} from "vue"
let navList = ref([
    {name:'场景配置',icon:"iconfont me-changjingshuxing"},
    {name:'天气',icon:"iconfont me-nongyun"},
])
</script>

<style scoped>
.menu-nav{
    width: 35px;
    border-right: 1px solid rgba(255, 255, 255, 0.4);
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
}
span{
    width: 24px;
    height: 24px;
    color: red;
    text-align: center;
}
</style>