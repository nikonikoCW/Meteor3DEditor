const { OpenAI } = require('openai');
const { randomUUID } = require('crypto');

let client = null;

function getPositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getClient() {
    const apiKey = (process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY || '').trim();
    if (!apiKey) {
        const error = new Error('未配置 GLM_API_KEY 或 ZHIPU_API_KEY');
        error.code = 'AI_PROVIDER_UNAVAILABLE';
        error.statusCode = 503;
        throw error;
    }

    if (!client) {
        client = new OpenAI({
            apiKey,
            baseURL: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/'
        });
    }
    return client;
}

async function* streamCompletion({ messages, tools, toolChoice = 'auto', signal }) {
    let stream;
    try {
        stream = await getClient().chat.completions.create({
            model: process.env.GLM_MODEL || 'glm-4.7-flash',
            messages,
            tools,
            tool_choice: toolChoice,
            stream: true,
            max_tokens: getPositiveInteger(process.env.GLM_MAX_TOKENS, 4096),
            thinking: {
                type: process.env.GLM_THINKING === 'enabled' ? 'enabled' : 'disabled'
            }
        }, { signal });
    } catch (error) {
        if (error.status === 401 || error.code === '1000') {
            error.code = 'GLM_AUTH_FAILED';
            error.statusCode = 401;
            error.userMessage = 'GLM API Key 无效或已失效，请更新 meteor3d-server/.env 后重启服务';
        }
        throw error;
    }

    const toolCallsByIndex = new Map();
    let content = '';
    let finishReason = 'stop';

    for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta || {};
        if (delta.content) {
            content += delta.content;
            yield { type: 'text.delta', delta: delta.content };
        }

        for (const toolCallDelta of delta.tool_calls || []) {
            const index = toolCallDelta.index ?? 0;
            const accumulated = toolCallsByIndex.get(index) || {
                id: '',
                type: 'function',
                function: { name: '', arguments: '' }
            };
            if (toolCallDelta.id) accumulated.id += toolCallDelta.id;
            if (toolCallDelta.function?.name) accumulated.function.name += toolCallDelta.function.name;
            if (toolCallDelta.function?.arguments) {
                accumulated.function.arguments += toolCallDelta.function.arguments;
            }
            toolCallsByIndex.set(index, accumulated);
        }

        if (choice.finish_reason) finishReason = choice.finish_reason;
    }

    const toolCalls = [...toolCallsByIndex.entries()]
        .sort(([left], [right]) => left - right)
        .map(([index, toolCall]) => ({
            ...toolCall,
            id: toolCall.id || `tool_${index}_${randomUUID()}`
        }));

    yield {
        type: 'completion',
        finishReason,
        message: {
            role: 'assistant',
            content: content || null,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
        }
    };
}

module.exports = { streamCompletion };
