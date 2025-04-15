<template>
    <div>
        <h1>图层管理</h1>
        <div class="layer-data">
            
        </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  const files = [
  { name: '文件夹1', children: [{ name: '文件1-1' }, { name: '文件1-2' ,children: [{ name: '文件1-2-1' }, { name: '文件1-2-2' }]}] },
  { name: '文件夹2', children: [{ name: '文件2-1' }] },
  { name: '文件3' }
];


  

  </script>
  
  <style scoped>

  </style>
  