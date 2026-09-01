<template>
  <div ref="anchorRef" class="ai-brain-widget" :class="{ 'is-open': isOpen }">
    <Teleport to="body">
      <Transition name="chat-panel">
        <section
          v-if="isOpen"
          class="chat-window"
          :style="panelStyle"
          aria-label="AI 大脑对话框"
          @pointerdown.stop
          @click.stop
        >
        <header class="chat-header">
          <div class="assistant-avatar" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="img">
              <path d="M13.2 6.3A5 5 0 0 0 5.5 10.5c0 .7.1 1.3.4 1.9A5.5 5.5 0 0 0 7.5 23c.7 2.6 3.1 4.5 5.9 4.5 1 0 1.9-.2 2.6-.7.8.5 1.7.7 2.7.7 2.8 0 5.2-1.9 5.9-4.5a5.5 5.5 0 0 0 1.6-10.6c.2-.6.3-1.2.3-1.9a5 5 0 0 0-7.7-4.2A5.1 5.1 0 0 0 16 5.5c-1 0-2 .3-2.8.8Z" />
              <path d="M12 11.2c-1.7.4-2.8 1.8-2.8 3.5M20 11.2c1.7.4 2.8 1.8 2.8 3.5M12.3 20.5c1.2.7 2.4.8 3.7.2 1.3.6 2.5.5 3.7-.2M16 9v11.7" />
            </svg>
          </div>
          <div class="assistant-meta">
            <strong>AI 大脑</strong>
            <span><i></i> 在线</span>
          </div>
          <button class="close-button" type="button" aria-label="收起对话框" @click="toggleChat">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </button>
        </header>

        <div v-if="messages.length === 0" class="chat-content welcome-content">
          <div class="welcome-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <path d="M13.2 6.3A5 5 0 0 0 5.5 10.5c0 .7.1 1.3.4 1.9A5.5 5.5 0 0 0 7.5 23c.7 2.6 3.1 4.5 5.9 4.5 1 0 1.9-.2 2.6-.7.8.5 1.7.7 2.7.7 2.8 0 5.2-1.9 5.9-4.5a5.5 5.5 0 0 0 1.6-10.6c.2-.6.3-1.2.3-1.9a5 5 0 0 0-7.7-4.2A5.1 5.1 0 0 0 16 5.5c-1 0-2 .3-2.8.8Z" />
              <path d="M12 11.2c-1.7.4-2.8 1.8-2.8 3.5M20 11.2c1.7.4 2.8 1.8 2.8 3.5M16 9v11.7" />
            </svg>
          </div>
          <h3>你好，我是 AI 大脑</h3>
          <p>有什么可以帮助你的吗？</p>
          <div class="message-bubble">可以向我询问任何问题</div>
        </div>

        <div v-else ref="messagesRef" class="chat-content message-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="chat-message"
            :class="message.role"
          >
            <div class="chat-message-bubble">
              {{ message.content || (message.status === 'streaming' ? '正在思考…' : '') }}
            </div>
            <span v-if="message.status === 'failed'" class="message-state">发送失败</span>
            <span v-else-if="message.status === 'cancelled'" class="message-state">已停止</span>
          </div>
        </div>

        <footer class="chat-composer">
          <div v-if="error" class="chat-error">{{ error }}</div>
          <div class="input-shell">
            <input
              v-model="input"
              type="text"
              placeholder="输入你的问题..."
              aria-label="输入你的问题"
              :disabled="isStreaming"
              @click.stop
              @keyup.enter="submitMessage"
            />
            <button
              type="button"
              :aria-label="isStreaming ? '停止生成' : '发送消息'"
              :disabled="!isStreaming && !input.trim()"
              @click.stop="isStreaming ? stopGeneration() : submitMessage()"
            >
              <svg v-if="!isStreaming" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3Z" />
                <path d="m10.3 13.7 4.1-4.1" />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <rect x="7" y="7" width="10" height="10" rx="1" />
              </svg>
            </button>
          </div>
          <span>AI 生成内容仅供参考</span>
        </footer>
        </section>
      </Transition>
    </Teleport>

    <button
      class="floating-trigger"
      type="button"
      :aria-expanded="isOpen"
      :aria-label="isOpen ? '收起 AI 对话框' : '展开 AI 对话框'"
      @click.stop="toggleChat"
    >
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <path d="M14.7 7.4a5.7 5.7 0 0 0-8.8 4.8c0 .8.2 1.5.4 2.2a6.3 6.3 0 0 0 1.9 12.1 6.8 6.8 0 0 0 6.7 5.1c1.1 0 2.2-.3 3.1-.8.9.5 2 .8 3.1.8a6.8 6.8 0 0 0 6.7-5.1 6.3 6.3 0 0 0 1.9-12.1c.2-.7.4-1.4.4-2.2a5.7 5.7 0 0 0-8.8-4.8A5.8 5.8 0 0 0 18 6.5c-1.2 0-2.3.3-3.3.9Z" />
        <path d="M13.4 13c-2 .5-3.2 2.1-3.2 4M22.6 13c2 .5 3.2 2.1 3.2 4M13.8 23.5c1.3.8 2.7.9 4.2.2 1.5.7 2.9.6 4.2-.2M18 10.5v13.2" />
      </svg>
      <span class="status-dot"></span>
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useAppStore } from '../../stores/appStore';
import { reportToolResult, streamChat } from '../../services/aiChatService';
import { buildSceneSnapshot, executeSceneTool } from '../../utils/sceneAiTools';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  widgetId: {
    type: String,
    default: ''
  }
});

const WIDGET_SIZE = 72;
const PANEL_WIDTH = 376;
const PANEL_HEIGHT = 418;
const PANEL_GAP = 14;
const VIEWPORT_MARGIN = 12;

const appStore = useAppStore();
const anchorRef = ref(null);
const messagesRef = ref(null);
const isOpen = ref(false);
const panelStyle = ref({});
const input = ref('');
const messages = ref([]);
const isStreaming = ref(false);
const error = ref('');
const conversationId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let trackingFrame = 0;
let abortController = null;

const createId = () => (
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const getSessionId = () => [
  appStore.appId || 'draft',
  props.widgetId || 'ai-brain',
  conversationId
].join(':');

const executeAndReportTool = async (event) => {
  try {
    const result = await executeSceneTool(appStore.sceneInstance, event.functionName, event.args);
    await reportToolResult({
      runId: event.runId,
      toolCallId: event.toolCallId,
      success: true,
      result
    });
  } catch (toolError) {
    await reportToolResult({
      runId: event.runId,
      toolCallId: event.toolCallId,
      success: false,
      error: toolError.message || '场景工具执行失败'
    });
  }
};

const sendMessage = async (rawMessage) => {
  const content = String(rawMessage || '').trim();
  if (!content || isStreaming.value) return false;

  error.value = '';
  isStreaming.value = true;
  abortController = new AbortController();

  messages.value.push({
    id: createId(),
    role: 'user',
    content,
    status: 'completed'
  });
  const assistantMessage = reactive({
    id: createId(),
    role: 'assistant',
    content: '',
    status: 'streaming'
  });
  messages.value.push(assistantMessage);

  let streamFailure = null;
  try {
    await streamChat({
      sessionId: getSessionId(),
      message: content,
      sceneData: buildSceneSnapshot(appStore.sceneInstance),
      signal: abortController.signal,
      onEvent(event) {
        if (event.type === 'run.started' && event.messageId) {
          assistantMessage.id = event.messageId;
        } else if (event.type === 'assistant.delta') {
          assistantMessage.content += event.delta || '';
        } else if (event.type === 'assistant.completed') {
          assistantMessage.status = 'completed';
        } else if (event.type === 'run.failed') {
          streamFailure = new Error(event.message || 'AI 服务暂时不可用');
        } else if (event.type === 'tool.started' && event.executionTarget === 'client') {
          executeAndReportTool(event).catch((toolError) => {
            console.error('[AI Brain] 工具结果回传失败:', toolError);
          });
        }
      }
    });

    if (streamFailure) throw streamFailure;
    assistantMessage.status = 'completed';
    return true;
  } catch (requestError) {
    if (requestError.name === 'AbortError') {
      assistantMessage.status = 'cancelled';
    } else {
      assistantMessage.status = 'failed';
      error.value = requestError.message || 'AI 请求失败';
    }
    return false;
  } finally {
    isStreaming.value = false;
    abortController = null;
  }
};

const stopGeneration = () => abortController?.abort();

const ownWidget = computed(() => (
  appStore.widgets.find(widget => widget.id === props.widgetId) || null
));

// AI 大脑的画布占位只保留悬浮球大小；同时迁移已经保存的旧尺寸。
watch(
  () => [ownWidget.value?.size?.width, ownWidget.value?.size?.height],
  ([width, height]) => {
    const widget = ownWidget.value;
    if (!widget || (width === WIDGET_SIZE && height === WIDGET_SIZE)) return;

    widget.size = { width: WIDGET_SIZE, height: WIDGET_SIZE };
    if (appStore.isEditMode) {
      appStore.hasUnsavedChanges = true;
    }
  },
  { immediate: true }
);

const updatePanelPosition = () => {
  if (!isOpen.value || !anchorRef.value) return;

  const rect = anchorRef.value.getBoundingClientRect();
  const width = Math.max(0, Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2));
  const spaceAbove = Math.max(0, rect.top - PANEL_GAP - VIEWPORT_MARGIN);
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN);
  const placeAbove = spaceAbove >= PANEL_HEIGHT || spaceAbove >= spaceBelow;
  const availableHeight = placeAbove ? spaceAbove : spaceBelow;
  const height = Math.max(0, Math.min(PANEL_HEIGHT, availableHeight));
  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);

  const left = Math.min(
    Math.max(rect.right - width, VIEWPORT_MARGIN),
    maxLeft
  );
  const top = placeAbove
    ? rect.top - height - PANEL_GAP
    : rect.bottom + PANEL_GAP;

  const nextStyle = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    height: `${Math.round(height)}px`,
    zIndex: String(Math.max(2000, Number(props.data.zIndex) || 0))
  };

  if (
    panelStyle.value.left !== nextStyle.left ||
    panelStyle.value.top !== nextStyle.top ||
    panelStyle.value.width !== nextStyle.width ||
    panelStyle.value.height !== nextStyle.height ||
    panelStyle.value.zIndex !== nextStyle.zIndex
  ) {
    panelStyle.value = nextStyle;
  }
};

const stopTrackingPanel = () => {
  if (trackingFrame) {
    cancelAnimationFrame(trackingFrame);
    trackingFrame = 0;
  }
};

const trackPanel = () => {
  updatePanelPosition();
  trackingFrame = requestAnimationFrame(trackPanel);
};

const startTrackingPanel = async () => {
  stopTrackingPanel();
  await nextTick();
  updatePanelPosition();
  trackingFrame = requestAnimationFrame(trackPanel);
};

const toggleChat = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    startTrackingPanel();
  } else {
    stopTrackingPanel();
  }
};

const scrollToLatestMessage = async () => {
  await nextTick();
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
};

const submitMessage = async () => {
  const message = input.value.trim();
  if (!message || isStreaming.value) return;
  input.value = '';
  scrollToLatestMessage();
  await sendMessage(message);
  scrollToLatestMessage();
};

watch(messages, scrollToLatestMessage, { deep: true });

onBeforeUnmount(() => {
  stopTrackingPanel();
  stopGeneration();
});
</script>

<style scoped>
.ai-brain-widget {
  position: relative;
  width: 100%;
  height: 100%;
  color: #eaf2ff;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  pointer-events: none;
}

.chat-window {
  position: fixed;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(116, 151, 255, 0.22);
  border-radius: 22px;
  background: linear-gradient(160deg, rgba(25, 34, 61, 0.98), rgba(11, 16, 32, 0.98));
  box-shadow: 0 24px 70px rgba(1, 5, 20, 0.55), 0 0 32px rgba(65, 105, 255, 0.13);
  pointer-events: auto;
}

.chat-header {
  height: 66px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
}

.assistant-avatar,
.welcome-mark {
  display: grid;
  place-items: center;
  border: 1px solid rgba(134, 166, 255, 0.3);
  background: linear-gradient(145deg, rgba(72, 91, 255, 0.3), rgba(46, 207, 255, 0.12));
  box-shadow: inset 0 0 16px rgba(113, 146, 255, 0.13);
}

.assistant-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
}

.assistant-avatar svg,
.welcome-mark svg,
.floating-trigger svg {
  fill: rgba(76, 99, 255, 0.14);
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.assistant-avatar svg {
  width: 25px;
  height: 25px;
  color: #a9c2ff;
}

.assistant-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.assistant-meta strong {
  font-size: 14px;
  letter-spacing: 0.03em;
}

.assistant-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #7f91af;
  font-size: 11px;
}

.assistant-meta i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ee6a5;
  box-shadow: 0 0 8px #4ee6a5;
}

.close-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 9px;
  color: #8494b1;
  background: transparent;
  cursor: pointer;
}

.close-button:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
}

.close-button svg {
  width: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
}

.chat-content {
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding: 22px 24px;
  text-align: center;
}

.welcome-content {
  overflow: hidden;
}

.message-list {
  display: block;
  overflow-y: auto;
  text-align: left;
}

.chat-message {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.chat-message.user {
  align-items: flex-end;
}

.chat-message.assistant {
  align-items: flex-start;
}

.chat-message-bubble {
  max-width: 86%;
  padding: 10px 12px;
  border-radius: 13px;
  color: #c7d2e8;
  background: rgba(255, 255, 255, 0.06);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chat-message.user .chat-message-bubble {
  color: #eef2ff;
  background: linear-gradient(145deg, rgba(82, 104, 236, 0.82), rgba(109, 85, 217, 0.82));
  border-radius: 13px 4px 13px 13px;
}

.chat-message.assistant .chat-message-bubble {
  border-radius: 4px 13px 13px 13px;
}

.message-state {
  margin-top: 4px;
  color: #77849d;
  font-size: 9px;
}

.welcome-mark {
  width: 64px;
  height: 64px;
  margin-bottom: 15px;
  border-radius: 21px;
}

.welcome-mark svg {
  width: 40px;
  height: 40px;
  color: #9fbaff;
}

.chat-content h3 {
  margin: 0 0 7px;
  font-size: 17px;
  font-weight: 650;
}

.chat-content p {
  margin: 0;
  color: #8493ae;
  font-size: 12px;
}

.message-bubble {
  align-self: flex-start;
  margin-top: 25px;
  padding: 11px 13px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 4px 14px 14px 14px;
  color: #b9c5db;
  background: rgba(255, 255, 255, 0.055);
  font-size: 12px;
  text-align: left;
}

.chat-composer {
  padding: 12px 14px 13px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.chat-error {
  margin-bottom: 8px;
  color: #ff9caa;
  font-size: 11px;
}

.input-shell {
  height: 42px;
  display: flex;
  align-items: center;
  padding: 0 5px 0 13px;
  border: 1px solid rgba(139, 161, 217, 0.18);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.045);
}

.input-shell:focus-within {
  border-color: rgba(101, 134, 255, 0.55);
}

.input-shell input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: none;
  color: #dce5f8;
  background: transparent;
  font: inherit;
  font-size: 12px;
}

.input-shell input::placeholder {
  color: #64718a;
}

.input-shell button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  color: #c8d4ff;
  background: linear-gradient(145deg, #5268ec, #6d55d9);
  cursor: pointer;
}

.input-shell button svg {
  width: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.input-shell button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chat-composer > span {
  display: block;
  margin-top: 7px;
  color: #536078;
  font-size: 9px;
  text-align: center;
}

.floating-trigger {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(169, 190, 255, 0.38);
  border-radius: 50%;
  color: #d7e2ff;
  background: radial-gradient(circle at 34% 28%, #7189ff 0%, #4e5be0 43%, #332a91 100%);
  box-shadow: 0 12px 34px rgba(40, 48, 160, 0.55), 0 0 0 7px rgba(76, 89, 219, 0.1);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.floating-trigger:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 16px 38px rgba(40, 48, 160, 0.62), 0 0 0 8px rgba(76, 89, 219, 0.12);
}

.floating-trigger:active {
  transform: scale(0.96);
}

.floating-trigger svg {
  width: 35px;
  height: 35px;
}

.status-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 10px;
  height: 10px;
  border: 2px solid #4d57d0;
  border-radius: 50%;
  background: #51e4a4;
}

.chat-panel-enter-active,
.chat-panel-leave-active {
  transform-origin: right bottom;
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.chat-panel-enter-from,
.chat-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .chat-panel-enter-active,
  .chat-panel-leave-active,
  .floating-trigger {
    transition: none;
  }
}
</style>
