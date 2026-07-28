/**
 * AI 对话 API 服务
 * 统一管理与后端 AI 聊天接口的交互
 */

import { API_BASE_URL } from '../config';

const CHAT_STREAM_URL = `${API_BASE_URL}/chat/stream`;

function parseSseBlock(block) {
    let eventType = 'message';
    let eventId = '';
    const dataLines = [];

    for (const line of block.split(/\r?\n/)) {
        if (!line || line.startsWith(':')) continue;

        const separatorIndex = line.indexOf(':');
        const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
        let value = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);
        if (value.startsWith(' ')) value = value.slice(1);

        if (field === 'event') eventType = value;
        else if (field === 'id') eventId = value;
        else if (field === 'data') dataLines.push(value);
    }

    return { eventType, eventId, data: dataLines.join('\n') };
}

/**
 * 发送 POST 请求并消费 SSE 格式的流式聊天响应。
 */
export async function sendChatStream({
    sessionId,
    message,
    sceneId,
    sceneData,
    signal,
    onText,
    onToolCall,
    onToolEvent,
    onStatus,
    onEvent,
    onError,
    onDone
}) {
    const response = await fetch(CHAT_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId,
            messages: [{ role: 'user', content: message }],
            sceneId,
            sceneData
        }),
        signal
    });

    if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status}`);
    }
    if (!response.body) {
        throw new Error('当前浏览器不支持流式响应');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let doneNotified = false;

    const notifyDone = () => {
        if (doneNotified) return;
        doneNotified = true;
        onDone?.();
    };

    const dispatchBlock = (block) => {
        const parsedBlock = parseSseBlock(block);
        if (!parsedBlock.data) return;
        if (parsedBlock.data === '[DONE]') {
            notifyDone();
            return;
        }

        let event;
        try {
            event = JSON.parse(parsedBlock.data);
        } catch (error) {
            console.error('SSE 事件解析错误:', error, parsedBlock.data);
            return;
        }

        const type = event.type || parsedBlock.eventType;
        const normalizedEvent = {
            ...event,
            type,
            eventId: parsedBlock.eventId || event.eventId
        };
        onEvent?.(normalizedEvent);

        switch (type) {
            case 'assistant.delta':
                onText?.(event.delta || '');
                break;
            case 'text':
                // 兼容旧服务端协议
                onText?.(event.chunk || '');
                break;
            case 'tool.started':
                onToolEvent?.(normalizedEvent);
                if (event.executionTarget === 'client') {
                    onToolCall?.(event.functionName, event.args, normalizedEvent);
                }
                break;
            case 'tool.completed':
            case 'tool.failed':
                onToolEvent?.(normalizedEvent);
                break;
            case 'tool_call':
                // 兼容旧服务端协议
                onToolCall?.(event.functionName, event.args, normalizedEvent);
                break;
            case 'status.updated':
                onStatus?.(event.message, normalizedEvent);
                break;
            case 'run.failed':
                onError?.(event.error || 'AI 任务执行失败');
                break;
            case 'run.completed':
                notifyDone();
                break;
            default:
                if (event.error) onError?.(event.error);
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.match(/\r?\n\r?\n/);
        while (boundary) {
            const block = buffer.slice(0, boundary.index);
            buffer = buffer.slice(boundary.index + boundary[0].length);
            dispatchBlock(block);
            boundary = buffer.match(/\r?\n\r?\n/);
        }
    }

    buffer += decoder.decode();
    if (buffer.trim()) dispatchBlock(buffer);
    notifyDone();
}
