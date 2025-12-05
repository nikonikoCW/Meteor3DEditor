<template>
  <div>
    <div 
      class="tree-item"
      :class="{ selected: selectedObject && selectedObject.uuid === node.uuid }"
      :style="{ paddingLeft: (level * 16 + 8) + 'px' }"
      @click.stop="handleSelect"
    >
      <!-- 展开/折叠按钮 -->
      <span browse
        v-if="hasChildren" 
        class="expand-icon"
        @click.stop="toggleExpand"
      >
        {{ expanded ? '▼' : '▶' }}
      </span>
      <span v-else class="expand-placeholder"></span>
      
      <!-- 图标 -->
      <span class="item-icon">{{ getIcon() }}</span>
      
      <!-- 名称 -->
      <span class="item-name">{{ node.name || '未命名对象' }}</span>
      
      <!-- 删除按钮（仅顶层对象显示） -->
      <button 
        v-if="level === 0"
        class="delete-btn" 
        @click.stop="handleDelete"
        title="删除"
      >
        ×
      </button>
    </div>
    
    <!-- 递归渲染子节点 -->
    <template v-if="expanded && hasChildren">
      <TreeNode 
        v-for="child in node.children" 
        :key="child.uuid"
        :node="child"
        :level="level + 1"
        :selectedObject="selectedObject"
        @select="$emit('select', $event)"
        @delete="$emit('delete', $event)"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  selectedObject: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['select', 'delete']);

const expanded = ref(false); // 默认展开

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0;
});

const toggleExpand = () => {
  expanded.value = !expanded.value;
};

const handleSelect = () => {
  emit('select', props.node);
};

const handleDelete = () => {
  emit('delete', props.node);
};

const getIcon = () => {
  // 根据对象类型返回不同图标
  if (props.node.type === 'Group' || props.node.userData?.modelType === 'GLTF') {
    return '📁';
  } else if (props.node.isMesh) {
    return '🔷';
  } else if (props.node.isLight) {
    return '💡';
  } else if (props.node.isCamera) {
    return '📷';
  }
  return '📦';
};
</script>

<style scoped>
.tree-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 1px;
  background: #2a2a2a;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.tree-item:hover {
  background: #333;
}

.tree-item.selected {
  background: #0066cc;
}

.expand-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  font-size: 10px;
  cursor: pointer;
  color: #aaa;
}

.expand-icon:hover {
  color: white;
}

.expand-placeholder {
  width: 16px;
  display: inline-block;
  margin-right: 4px;
}

.item-icon {
  margin-right: 6px;
  font-size: 14px;
}

.item-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  width: 20px;
  height: 20px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.tree-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #ff0000;
}
</style>
