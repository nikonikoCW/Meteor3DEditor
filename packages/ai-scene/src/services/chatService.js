/**
 * AI 对话 API 服务
 * 统一管理与后端 AI 聊天接口的交互
 */

import { API_BASE_URL } from '../config';

const CHAT_STREAM_URL = `${API_BASE_URL}/chat/stream`;

/**
 * 发送 SSE 流式聊天请求
 * @param {Object} params - 请求参数
 * @param {string} params.sessionId - 会话 ID
 * @param {string} params.message - 用户消息内容
 * @param {string} params.sceneId - 当前场景 ID
 * @param {Function} params.onText - 收到文本 chunk 的回调
 * @param {Function} params.onToolCall - 收到工具调用的回调
 * @param {Function} params.onError - 错误回调
 * @param {Function} params.onDone - 完成回调
 */
export async function sendChatStream({ sessionId, message, sceneId, sceneData, onText, onToolCall, onError, onDone }) {
    const response = await fetch(CHAT_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId,
            messages: [{ role: 'user', content: message }],
            sceneId,
            sceneData
        })
    });

    if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const updates = chunkStr.split('data: ').filter(Boolean);

        for (const update of updates) {
            const cleanUpdate = update.trim();
            if (!cleanUpdate || cleanUpdate === '[DONE]') continue;

            try {
                const parsed = JSON.parse(cleanUpdate);

                if (parsed.type === 'text' && onText) {
                    onText(parsed.chunk);
                } else if (parsed.type === 'tool_call' && onToolCall) {
                    onToolCall(parsed.functionName, parsed.args);
                } else if (parsed.error && onError) {
                    onError(parsed.error);
                }
            } catch (e) {
                console.error('SSE 解析错误:', e, cleanUpdate);
            }
        }
    }

    if (onDone) onDone();
}
