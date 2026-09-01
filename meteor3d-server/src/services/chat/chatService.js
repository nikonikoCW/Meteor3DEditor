const { randomUUID } = require('crypto');
const glmClient = require('./glmClient');
const { SYSTEM_PROMPT, tools, SERVER_SIDE_TOOLS, executeServerTool } = require('./tools');

const MAX_AGENT_LOOPS = 6;
const MAX_HISTORY_MESSAGES = 60;
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const sessions = new Map();
const pendingTools = new Map();

function getSession(sessionId) {
    let session = sessions.get(sessionId);
    if (!session) {
        session = { messages: [], updatedAt: Date.now() };
        sessions.set(sessionId, session);
    }
    session.updatedAt = Date.now();
    return session;
}

function appendSessionMessage(sessionId, message) {
    const session = getSession(sessionId);
    session.messages.push(message);
    if (session.messages.length > MAX_HISTORY_MESSAGES) {
        let startIndex = session.messages.length - 40;
        while (startIndex < session.messages.length && session.messages[startIndex].role !== 'user') {
            startIndex += 1;
        }
        if (startIndex >= session.messages.length) {
            startIndex = session.messages.length - 1;
            while (startIndex > 0 && session.messages[startIndex].role !== 'user') startIndex -= 1;
        }
        session.messages = session.messages.slice(startIndex);
    }
    session.updatedAt = Date.now();
}

function waitForToolResult({ runId, toolCallId, signal, timeoutMs = 20000 }) {
    return new Promise((resolve) => {
        const finish = (result) => {
            const pending = pendingTools.get(toolCallId);
            if (pending?.timer) clearTimeout(pending.timer);
            pendingTools.delete(toolCallId);
            signal?.removeEventListener('abort', onAbort);
            resolve(result);
        };
        const onAbort = () => finish({ success: false, error: '请求已取消' });
        const timer = setTimeout(
            () => finish({ success: false, error: '客户端工具执行超时' }),
            timeoutMs
        );
        timer.unref?.();
        pendingTools.set(toolCallId, { runId, timer, finish });
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

function resolveToolResult({ runId, toolCallId, success, result, error }) {
    const pending = pendingTools.get(toolCallId);
    if (!pending || pending.runId !== runId) return false;
    pending.finish({ success: success === true, result, error });
    return true;
}

function clearSession(sessionId) {
    sessions.delete(sessionId);
}

const cleanupTimer = setInterval(() => {
    const expiresBefore = Date.now() - SESSION_TTL_MS;
    for (const [sessionId, session] of sessions.entries()) {
        if (session.updatedAt < expiresBefore) sessions.delete(sessionId);
    }
}, 10 * 60 * 1000);
cleanupTimer.unref?.();

function parseToolArguments(toolCall) {
    try {
        return JSON.parse(toolCall.function.arguments || '{}');
    } catch {
        return {};
    }
}

async function* streamChat({ sessionId, message, sceneData, model, apiToken, signal }) {
    const runId = randomUUID();
    const assistantMessageId = randomUUID();

    yield {
        type: 'run.started',
        runId,
        sessionId,
        messageId: assistantMessageId
    };

    appendSessionMessage(sessionId, { role: 'user', content: message });
    const currentMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...getSession(sessionId).messages
    ];

    let finishReason = 'stop';

    try {
        for (let loop = 0; loop < MAX_AGENT_LOOPS; loop += 1) {
            let assistantMessage = null;

            for await (const event of glmClient.streamCompletion({
                messages: currentMessages,
                tools,
                model,
                apiToken,
                signal
            })) {
                if (event.type === 'text.delta') {
                    yield {
                        type: 'assistant.delta',
                        runId,
                        messageId: assistantMessageId,
                        delta: event.delta
                    };
                } else if (event.type === 'completion') {
                    assistantMessage = event.message;
                    finishReason = event.finishReason || finishReason;
                }
            }

            if (!assistantMessage) break;
            currentMessages.push(assistantMessage);
            appendSessionMessage(sessionId, assistantMessage);

            const toolCalls = assistantMessage.tool_calls || [];
            if (toolCalls.length === 0) break;

            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                const args = parseToolArguments(toolCall);
                let toolResult;

                if (SERVER_SIDE_TOOLS.has(functionName)) {
                    yield {
                        type: 'tool.started',
                        runId,
                        toolCallId: toolCall.id,
                        functionName,
                        args,
                        executionTarget: 'server'
                    };
                    toolResult = executeServerTool(functionName, args, sceneData);
                } else {
                    const resultPromise = waitForToolResult({
                        runId,
                        toolCallId: toolCall.id,
                        signal
                    });
                    yield {
                        type: 'tool.started',
                        runId,
                        toolCallId: toolCall.id,
                        functionName,
                        args,
                        executionTarget: 'client'
                    };
                    toolResult = await resultPromise;
                }

                yield {
                    type: toolResult.success ? 'tool.completed' : 'tool.failed',
                    runId,
                    toolCallId: toolCall.id,
                    functionName,
                    executionTarget: SERVER_SIDE_TOOLS.has(functionName) ? 'server' : 'client',
                    ...(toolResult.success
                        ? { result: toolResult.result ?? toolResult }
                        : { error: toolResult.error || '工具执行失败' })
                };

                const toolReply = {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: functionName,
                    content: JSON.stringify(toolResult)
                };
                currentMessages.push(toolReply);
                appendSessionMessage(sessionId, toolReply);
            }
        }

        yield {
            type: 'assistant.completed',
            runId,
            messageId: assistantMessageId,
            finishReason
        };
        yield { type: 'run.completed', runId };
    } catch (error) {
        error.runId = runId;
        throw error;
    }
}

module.exports = { streamChat, resolveToolResult, clearSession };
