const { randomUUID } = require('crypto');
const chatService = require('../services/chat/chatService');
const sessionStore = require('../services/chat/sessionStore');
const { createSseWriter } = require('../services/chat/sseWriter');

const MAX_MESSAGE_LENGTH = 8000;

function getRequestMessage(body = {}) {
    if (typeof body.message === 'string') return body.message.trim();
    const lastMessage = body.messages?.[body.messages.length - 1];
    return typeof lastMessage?.content === 'string' ? lastMessage.content.trim() : '';
}

exports.handleChatStream = async (req, res) => {
    const message = getRequestMessage(req.body);
    const sessionId = String(req.body?.sessionId || '').trim() || randomUUID();

    if (!message) {
        return res.status(400).json({
            success: false,
            code: 'INVALID_MESSAGE',
            message: 'message 不能为空'
        });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({
            success: false,
            code: 'MESSAGE_TOO_LONG',
            message: `message 不能超过 ${MAX_MESSAGE_LENGTH} 个字符`
        });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const abortController = new AbortController();
    const writer = createSseWriter(res);
    const heartbeat = setInterval(() => writer.ping(), 15000);
    heartbeat.unref?.();

    res.on('close', () => {
        clearInterval(heartbeat);
        if (!res.writableEnded) abortController.abort();
    });

    try {
        for await (const event of chatService.streamChat({
            sessionId,
            message,
            signal: abortController.signal
        })) {
            writer.write(event);
        }
    } catch (error) {
        console.error('[AI Chat] GLM 流式对话失败:', {
            status: error.statusCode || error.status,
            code: error.code,
            message: error.message,
            runId: error.runId
        });
        if (!abortController.signal.aborted) {
            writer.write({
                type: 'run.failed',
                runId: error.runId || randomUUID(),
                code: error.code || 'AI_UPSTREAM_ERROR',
                message: error.userMessage || (error.statusCode === 503
                    ? error.message
                    : 'AI 服务暂时不可用，请稍后重试'),
                retryable: error.statusCode !== 400
            });
        }
    } finally {
        clearInterval(heartbeat);
        if (!res.writableEnded) res.end();
    }
};

exports.handleChat = (req, res) => {
    res.status(405).json({
        success: false,
        message: '请使用 POST /api/chat/stream 进行 SSE 流式对话'
    });
};

exports.clearSession = (req, res) => {
    const sessionId = String(req.params.sessionId || '').trim();
    if (sessionId) sessionStore.delete(sessionId);
    res.json({ success: true });
};
