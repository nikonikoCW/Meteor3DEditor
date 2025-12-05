<template>
  <nav class="navigation">
    <router-link to="/editor" class="nav-link">
      <span class="icon">🎨</span>
      <span>编辑器</span>
    </router-link>
    <router-link to="/assets" class="nav-link">
      <span class="icon">📦</span>
      <span>资产管理</span>
    </router-link>
  </nav>
</template>

<script setup>
</script>

<style scoped>
.navigation {
  display: flex;
  gap: 10px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #2a2a2a;
  color: #aaa;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #333;
  color: white;
}

.nav-link.router-link-active {
  background: #0066cc;
  color: white;
}

.icon {
  font-size: 16px;
}
</style>
