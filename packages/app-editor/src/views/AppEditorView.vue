<template>
  <div class="editor-layout">
    <div class="header">
        <h1>App Editor</h1>
    </div>
    <div class="main-content">
        <WidgetPanel />
        <div class="viewport-wrapper">
            <AppViewport />
        </div>
        <PropertyPanel />
    </div>
  </div>
</template>

<script setup>
import WidgetPanel from '../components/WidgetPanel.vue';
import AppViewport from '../components/AppViewport.vue';
import PropertyPanel from '../components/PropertyPanel.vue';
</script>

<style scoped>
.editor-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.header {
    height: 50px;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    padding: 0 20px;
    color: white;
}

.main-content {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.viewport-wrapper {
    flex: 1;
    position: relative;
    background: #000;
}
</style>

