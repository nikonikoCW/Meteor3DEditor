import { API_BASE_URL } from '../config';

const CHAT_STREAM_URL = `${API_BASE_URL}/chat/stream`;
const TOOL_RESULT_URL = `${API_BASE_URL}/chat/tools`;

function parseSseBlock(block) {
    let eventType = 'message';
    const dataLines = [];

    for (const line of block.split(/\r?\n/)) {
        if (!line || line.startsWith(':')) continue;
        const separatorIndex = line.indexOf(':');
        const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
        let value = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);
        if (value.startsWith(' ')) value = value.slice(1);

        if (field === 'event') eventType = value;
        if (field === 'data') dataLines.push(value);
    }

    if (dataLines.length === 0) return null;
    const data = JSON.parse(dataLines.join('\n'));
    return { ...data, type: eventType || data.type };
}

export async function streamChat({ sessionId, message, sceneData, model, apiToken, signal, onEvent }) {
    const response = await fetch(CHAT_STREAM_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream'
        },
        body: JSON.stringify({ sessionId, message, sceneData, model, apiToken }),
        signal
    });

    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || `AI 请求失败 (${response.status})`);
    }
    if (!response.body) throw new Error('当前浏览器不支持流式响应');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    const dispatch = (block) => {
        const event = parseSseBlock(block);
        if (event) onEvent?.(event);
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.match(/\r?\n\r?\n/);
        while (boundary) {
            const block = buffer.slice(0, boundary.index);
            buffer = buffer.slice(boundary.index + boundary[0].length);
            dispatch(block);
            boundary = buffer.match(/\r?\n\r?\n/);
        }
    }

    buffer += decoder.decode();
    if (buffer.trim()) dispatch(buffer);
}

export async function reportToolResult({ runId, toolCallId, success, result, error }) {
    const response = await fetch(`${TOOL_RESULT_URL}/${encodeURIComponent(toolCallId)}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, success, result, error })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '工具执行结果回传失败');
    }
}
