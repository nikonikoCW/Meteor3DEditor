<template>
  <div class="scene-wrapper">
    <div ref="container" class="three-container"></div>
    <button @click="addRandomGeometry" class="add-button">添加随机几何体</button>
    
    <div class="geometry-list">
      <h3>场景中的几何体 ({{ meshCount }}/20)</h3>
      <button @click="clearAllGeometries" class="clear-button">清除全部</button>
      <ul>
        <li v-for="(child, index) in sceneChildren" 
            :key="index"
            @mouseenter="highlightGeometry(child, true)"
            @mouseleave="highlightGeometry(child, false)">
          {{ child.userData.name }} ({{ child.userData.type }})
          <button @click="removeGeometry(child)" class="remove-btn">×</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import * as THREE from 'three';

const container = ref(null);
const sceneVersion = ref(0); // 新增的版本跟踪器

// 场景变量
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const renderer = new THREE.WebGLRenderer({ antialias: true });
let animationId = null;

// 几何体类型和颜色选项
const geometryTypes = [
  { type: 'box', name: '立方体' },
  { type: 'sphere', name: '球体' },
  { type: 'cone', name: '圆锥' },
  { type: 'torus', name: '圆环' },
  { type: 'cylinder', name: '圆柱' }
];

const colors = [
  0xff0000, // 红
  0x00ff00, // 绿
  0x0000ff, // 蓝
  0xffff00, // 黄
  0xff00ff, // 紫
  0x00ffff  // 青
];

// 计算属性：获取场景中的Mesh对象
const sceneChildren = computed(() => {
  sceneVersion.value; // 建立依赖关系
  return scene.children.filter(child => child.isMesh);
});

// 计算属性：获取Mesh数量
const meshCount = computed(() => sceneChildren.value.length);

// 初始化场景
const initScene = () => {
  // 场景设置
  scene.background = new THREE.Color(0x111111);
  
  // 相机设置
  camera.position.z = 10;
  camera.fov = 75;
  camera.aspect = container.value.clientWidth / container.value.clientHeight;
  camera.near = 0.1;
  camera.far = 1000;
  camera.updateProjectionMatrix();
  
  // 渲染器设置
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.value.appendChild(renderer.domElement);
  
  // 添加坐标轴辅助
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);
  
  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  
  // 添加平行光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
};

// 创建随机几何体
const createRandomGeometry = () => {
  const typeIndex = Math.floor(Math.random() * geometryTypes.length);
  const colorIndex = Math.floor(Math.random() * colors.length);
  const type = geometryTypes[typeIndex].type;
  const name = geometryTypes[typeIndex].name;
  const color = colors[colorIndex];
  
  let geometry;
  const size = Math.random() * 2 + 0.5; // 随机大小
  
  switch(type) {
    case 'box':
      geometry = new THREE.BoxGeometry(size, size, size);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(size, 32, 32);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(size, size * 2, 32);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(size, size/3, 16, 32);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(size/2, size/2, size*2, 32);
      break;
    default:
      geometry = new THREE.BoxGeometry(size, size, size);
  }
  
  const material = new THREE.MeshStandardMaterial({ 
    color: color,
    metalness: 0.7,
    roughness: 0.2
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  // 存储几何体信息
  mesh.userData = {
    type: type,
    name: name,
    originalColor: color,
    highlighted: false,
    createdAt: Date.now()
  };
  
  // 随机位置
  mesh.position.x = (Math.random() - 0.5) * 10;
  mesh.position.y = (Math.random() - 0.5) * 10;
  mesh.position.z = (Math.random() - 0.5) * 10;
  
  // 随机旋转
  mesh.rotation.x = Math.random() * Math.PI;
  mesh.rotation.y = Math.random() * Math.PI;
  
  return mesh;
};

// 添加随机几何体
const addRandomGeometry = () => {
  if (meshCount.value >= 20) return;
  
  const geometry = createRandomGeometry();
  sceneVersion.value++;
  scene.add(geometry);
};

// 移除指定几何体
const removeGeometry = (mesh) => {
  scene.remove(mesh);
  // 释放几何体和材质资源
  mesh.geometry.dispose();
  mesh.material.dispose();
};

// 清除所有几何体
const clearAllGeometries = () => {
  // 只移除Mesh对象，保留灯光、辅助线等
  sceneChildren.value.forEach(mesh => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
};

// 高亮几何体
const highlightGeometry = (mesh, highlight) => {
  if (mesh && mesh.material) {
    mesh.userData.highlighted = highlight;
    mesh.material.color.setHex(
      highlight ? 0xffffff : mesh.userData.originalColor
    );
    mesh.material.emissive.setHex(
      highlight ? 0x888888 : 0x000000
    );
  }
};

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate);
  
  // 旋转所有Mesh几何体
  sceneChildren.value.forEach(mesh => {
    if (!mesh.userData.highlighted) {
      mesh.rotation.x += 0.005;
      mesh.rotation.y += 0.01;
    }
  });
  
  renderer.render(scene, camera);
};

// 处理窗口大小变化
const handleResize = () => {
  camera.aspect = container.value.clientWidth / container.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
};

// 监听场景变化
watch(sceneChildren, (newVal) => {
  console.log(`场景Mesh数量变化: ${newVal.length}`);
}, { deep: true });

onMounted(() => {
  initScene();
  animate();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  if (container.value && container.value.contains(renderer.domElement)) {
    container.value.removeChild(renderer.domElement);
  }
  
  // 清理所有几何体资源
  clearAllGeometries();
});
</script>

<style scoped>
/* 样式部分与之前相同，保持不变 */
.scene-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
}

.three-container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.add-button {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  z-index: 100;
}

.add-button:hover {
  background-color: #45a049;
}

.geometry-list {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 5px;
  max-height: 70vh;
  overflow-y: auto;
  z-index: 100;
  width: 200px;
}

.geometry-list h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  border-bottom: 1px solid #444;
  padding-bottom: 5px;
}

.geometry-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.geometry-list li {
  padding: 5px 0;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.geometry-list li:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.remove-btn {
  background: none;
  border: none;
  color: #ff5555;
  cursor: pointer;
  font-size: 16px;
  padding: 0 5px;
}

.remove-btn:hover {
  color: #ff0000;
}

.clear-button {
  width: 100%;
  padding: 5px;
  margin: 5px 0;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.clear-button:hover {
  background-color: #d32f2f;
}
</style>