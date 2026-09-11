<template>
  <AssetsView />
  <MessageContainer />
</template>

<script setup>
import AssetsView from './views/AssetsView.vue'
import MessageContainer from './components/MessageContainer.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
