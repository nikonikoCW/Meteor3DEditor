<template>
    <div class="menu-nav">
        <div class="menu-item me-center " :title="i.name" v-for="i in navList" :key="i.index" @click="active(i)"
            :class="i.status ? 'menu-item me-center active-menu' : 'menu-item me-center'">
            <span :class="i.icon"></span>
        </div>
    </div>
</template>

<script setup>
import { defineEmits } from 'vue';
import { ref } from "vue"
let navList = ref([
    { status:false,name: '场景配置', icon: "iconfont me-gis_changjing" },
    { status:true,name: '图层管理', icon: "iconfont me-mti-tucengguanli" },
    { status:false,name: '天气', icon: "iconfont me-nongyun" },
    { status:false,name: '属性', icon: "iconfont me-jiandanmoxing" }
])

const emit = defineEmits(['message-to-parent']);


const active = (node) => {
    navList.value.forEach(element => {
        element.status = false
    });
    node.status = true
    emit('changeMenu', node);
}
</script>

<style scoped>
.menu-nav {
    width: 35px;
    border-right: 1px solid rgba(255, 255, 255, 0.4);
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;

    .menu-item {
        width: 35px;
        height: 35px;
        cursor: pointer;
    }

    .active-menu {
        background-color: rgba(255, 255, 255, 0.5);

    }

    .menu-item:hover {
        background-color: rgba(255, 255, 255, 0.6);
    }
}

span {
    color: white;
    font-size: 24px;
}
</style>