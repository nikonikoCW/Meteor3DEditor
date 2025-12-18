<template>
  <div class="data-panel">
    <div class="placeholder">
      <span class="placeholder-icon">📊</span>
      <p class="placeholder-title">数据面板</p>
      <p class="placeholder-desc">配置组件的数据源</p>
      <p class="placeholder-note">功能开发中...</p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.data-panel {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  text-align: center;
  color: #666;
}

.placeholder-icon {
  font-size: 48px;
  opacity: 0.5;
}

.placeholder-title {
  margin: 16px 0 8px;
  font-size: 16px;
  color: #888;
}

.placeholder-desc {
  margin: 0;
  font-size: 13px;
  color: #555;
}

.placeholder-note {
  margin-top: 20px;
  font-size: 12px;
  color: #444;
  font-style: italic;
}
</style>
