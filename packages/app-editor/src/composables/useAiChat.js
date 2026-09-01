import { reactive, ref } from 'vue';
import { streamChat } from '../services/aiChatService';

function createId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useAiChat({ getAppId, widgetId }) {
    const messages = ref([]);
    const isStreaming = ref(false);
    const error = ref('');
    const conversationId = createId();
    let abortController = null;

    const getSessionId = () => [
        getAppId?.() || 'draft',
        widgetId || 'ai-brain',
        conversationId
    ].join(':');

    const sendMessage = async (rawMessage) => {
        const content = String(rawMessage || '').trim();
        if (!content || isStreaming.value) return false;

        error.value = '';
        isStreaming.value = true;
        abortController = new AbortController();

        const userMessage = {
            id: createId(),
            role: 'user',
            content,
            status: 'completed'
        };
        const assistantMessage = reactive({
            id: createId(),
            role: 'assistant',
            content: '',
            status: 'streaming'
        });
        messages.value.push(userMessage, assistantMessage);

        let streamFailure = null;

        try {
            await streamChat({
                sessionId: getSessionId(),
                message: content,
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

    return {
        messages,
        isStreaming,
        error,
        sendMessage,
        stopGeneration
    };
}
