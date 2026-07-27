<template>
  <div class="preview-view">
    <div class="header">
      <router-link to="/scenes" class="back-link">← 返回场景列表</router-link>
    </div>

    <!-- 3D 渲染区域 -->
    <div class="viewport-container" ref="container"></div>

    <!-- 大模型对话悬浮窗 -->
    <div class="ai-chat-panel">
      <div class="chat-header">智能空间气泡助手 ✨</div>
      <div class="chat-messages" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
          <div v-if="msg.role === 'system'" class="message-content" v-html="msg.text"></div>
          <div v-else-if="msg.role === 'user'" class="message-content">{{ msg.text }}</div>
          <div v-else-if="msg.role === 'assistant'" class="message-content" v-html="msg.text"></div>
          <div v-else-if="msg.role === 'tool'" class="message-tool">
            <span class="tool-icon">⚙️</span>
            执行空间指令: <strong>{{ msg.functionName }}</strong>
          </div>
        </div>
        
        <div v-if="isTyping" class="message assistant typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>
      <div class="chat-input-area">
        <input 
          type="text" 
          v-model="userInput" 
          @keyup.enter="sendMessage" 
          placeholder="试试说：下雪吧 / 高亮一号楼..." 
          :disabled="isTyping || !meteorLoaded" 
        />
        <button @click="sendMessage" :disabled="isTyping || !userInput.trim() || !meteorLoaded">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { loadScene } from '@meteor3d/core';
import { ASSET_BASE_URL } from '../config';
import { sendChatStream } from '../services/chatService';

const route = useRoute();
const sceneId = route.params.sceneId;

const loading = ref(true);
const container = ref(null);
const messagesContainer = ref(null);
let meteorInstance = null;

// Chat 状态
const sessionId = ref(`session_${Date.now()}`);
const meteorLoaded = ref(false);
const isTyping = ref(false);
const userInput = ref('');
const messages = ref([
  { role: 'system', text: '您好！我是您的 3D 场景智能助手。您可以问我关于园区的任何问题，也可以让我控制场景中的天气、高亮、运镜等。' }
]);

const scrollToBottom = () => {
  setTimeout(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }, 100);
};

// 递归遍历 Three.js 场景，生成场景树 JSON（含空间信息）
const getSceneTreeJson = () => {
  const scene = meteorInstance?._internal?.sceneManager?.scene;
  if (!scene) return { name: 'Scene', bid: '', children: [] };

  const traverse = (obj) => ({
    name: obj.name || obj.type,
    bid: obj.userData?.bid || '',
    position: obj.position ? { x: obj.position.x, y: obj.position.y, z: obj.position.z } : undefined,
    rotation: obj.rotation ? { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z } : undefined,
    scale: obj.scale ? { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z } : undefined,
    children: (obj.children || []).map(traverse)
  });
  return traverse(scene);
};

onMounted(async () => {
  try {
    if (container.value) {
      meteorInstance = await loadScene({
        sceneId: sceneId,
        serverUrl: ASSET_BASE_URL,
        container: container.value,
        config: {
          dracoPath: '/draco/',
          fitCamera: true,
          showGrid: false
        }
      });
      window.meteor3d = meteorInstance;
      meteorLoaded.value = true;
    }
  } catch (error) {
    console.error('加载场景失败:', error);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (meteorInstance) {
    meteorInstance.dispose();
  }
});

// 处理大模型空间 API 交互
const processToolCall = (functionName, args) => {
  if (!meteorInstance) return;
  console.log('====== AI工具调用 ======', functionName, args);

  const findObjectBidByName = (targetName) => {
    const objects = meteorInstance._internal?.sceneManager?.objects || [];
    const targetObj = objects.find(o => o.name && o.name.toLowerCase().includes(targetName.toLowerCase()));
    return targetObj ? targetObj.userData?.bid || null : null;
  };

  switch (functionName) {
    case 'control_weather':
      if (args.type === 'snow') {
        meteorInstance.setSnow(args.enabled, { count: args.intensity || 10000 });
        meteorInstance.setRain(false);
      } else if (args.type === 'rain') {
        meteorInstance.setRain(args.enabled, { count: args.intensity || 10000 });
        meteorInstance.setSnow(false);
      } else {
        meteorInstance.setSnow(false);
        meteorInstance.setRain(false);
      }
      break;

    case 'highlight_asset':
    case 'outline_asset':
      const highlightBid = findObjectBidByName(args.target);
      if (highlightBid) {
        if (functionName === 'highlight_asset') {
          if (args.enabled) meteorInstance.enableHighlight(highlightBid, { color: 0x00ff00, intensity: 1.0 });
          else meteorInstance.disableHighlight(highlightBid);
        } else {
          if (args.enabled) meteorInstance.enableOutline(highlightBid, { color: 0xffff00, thickness: 2 });
          else meteorInstance.disableOutline(highlightBid);
        }
      } else {
        console.warn(`未找到目标物体: ${args.target}`);
      }
      break;

    case 'control_camera':
       if (args.target === 'overview') {
          meteorInstance.fitCameraToScene();
       } else {
          const focusBid = findObjectBidByName(args.target);
          if (focusBid) {
            const objects = meteorInstance._internal?.sceneManager?.objects || [];
            const targetObj = objects.find(o => o.userData?.bid === focusBid);
            if(targetObj) {
              meteorInstance.setView({ target: targetObj.position });
            }
          }
       }
       break;

    case 'toggle_performance_stats':
       if (args.enabled) {
         meteorInstance.enableStats();
       } else {
         meteorInstance.disableStats();
       }
       break;

    case 'create_flow_line':
       if (args.points && args.points.length >= 2) {
         // 先清除之前的路线
         meteorInstance.clearLines();
  
         const lineId = meteorInstance.createLine({
           points: args.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
           textureUrl: args.textureUrl,
           width: args.width || 2.0,
           speed: args.speed || 1.0,
           repeat: 10.0,
           opacity: 0.9
         });
         console.log('流动线已创建, ID:', lineId);
         console.log({
           points: args.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
           textureUrl: args.textureUrl,
           width: args.width || 2.0,
           speed: args.speed || 1.0,
           repeat: 10.0,
           opacity: 0.9
         });
         
       }
       break;

    case 'remove_flow_lines':
       meteorInstance.clearLines();
       console.log('所有流动线已清除');
       break;

    default:
       console.warn('暂不支持的指令:', functionName);
  }
};

const sendMessage = async () => {
  if (!userInput.value.trim() || isTyping.value) return;

  const text = userInput.value;
  userInput.value = '';
  messages.value.push({ role: 'user', text });
  scrollToBottom();

  isTyping.value = true;
  let assistantMessageIndex = null;

  try {
    await sendChatStream({
      sessionId: sessionId.value,
      message: text,
      sceneId: sceneId,
      sceneData: getSceneTreeJson(),
      onText: (chunk) => {
        if (assistantMessageIndex === null) {
          messages.value.push({ role: 'assistant', text: chunk });
          assistantMessageIndex = messages.value.length - 1;
        } else {
          messages.value[assistantMessageIndex].text += chunk;
        }
        scrollToBottom();
      },
      onToolCall: (functionName, args) => {
        messages.value.push({ role: 'tool', functionName, args });
        processToolCall(functionName, args);
        scrollToBottom();
      },
      onError: (errorMsg) => {
        messages.value.push({ role: 'system', text: `<span style="color: #ffaaaa">错误: ${errorMsg}</span>` });
      }
    });
  } catch (error) {
    messages.value.push({ role: 'system', text: `<span style="color: #ffaaaa">发送失败: ${error.message}</span>` });
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
};
</script>

<style scoped>
.preview-view {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #111;
  color: #fff;
  overflow: hidden;
}

.header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 10;
  box-sizing: border-box;
}

.back-link {
  color: #aaa;
  text-decoration: none;
  font-size: 14px;
  margin-right: 20px;
  transition: color 0.2s;
}

.back-link:hover {
  color: white;
}

.viewport-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-chat-panel {
  position: absolute;
  right: 30px;
  bottom: 30px;
  width: 500px;
  height: 750px;
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid #444;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  z-index: 20;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.chat-header {
  padding: 12px 15px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid #444;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px 8px 0 0;
}

.chat-messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
}

.message {
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.5;
  padding: 10px 14px;
  border-radius: 8px;
}

.message.system {
  background: rgba(0, 102, 204, 0.2);
  color: #99ccff;
  border: 1px solid rgba(0, 102, 204, 0.3);
}

.chat-input-area {
  padding: 12px;
  border-top: 1px solid #444;
  display: flex;
  gap: 10px;
}

.chat-input-area input {
  flex: 1;
  background: #111;
  border: 1px solid #555;
  color: white;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
}

.chat-input-area button {
  background: #0066cc;
  border: none;
  color: white;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.chat-input-area button:disabled {
  background: #444;
  cursor: not-allowed;
}

.message.user {
  background: rgba(40, 40, 40, 0.8);
  border: 1px solid #555;
  color: white;
  align-self: flex-end;
  margin-left: 20px;
}

.message.assistant {
  background: rgba(0, 102, 204, 0.15);
  border: 1px solid rgba(0, 102, 204, 0.3);
  color: #cce0ff;
  margin-right: 20px;
}

.message.tool {
  background: rgba(255, 153, 0, 0.1);
  border: 1px solid rgba(255, 153, 0, 0.3);
  color: #ffcc80;
  font-family: monospace;
  font-size: 11px;
}

/* Typing Indicator */
.typing {
  display: inline-block;
  padding: 8px 12px;
}
.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 3px;
  background: #cce0ff;
  border-radius: 50%;
  animation: wave 1.3s linear infinite;
}
.dot:nth-child(2) { animation-delay: -1.1s; }
.dot:nth-child(3) { animation-delay: -0.9s; }

@keyframes wave {
  0%, 60%, 100% { transform: initial; }
  30% { transform: translateY(-5px); }
}
</style>
