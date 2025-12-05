<template>
  <div id="app">
    <router-view />
    <MessageContainer />
  </div>
</template>

<script setup>
import MessageContainer from './components/MessageContainer.vue'
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

#app {
  height: 100%;
}
</style>
