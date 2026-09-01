const { randomUUID } = require('crypto');
const glmClient = require('./glmClient');
const sessionStore = require('./sessionStore');
const { SYSTEM_PROMPT } = require('./systemPrompt');

async function* streamChat({ sessionId, message, signal }) {
    const runId = randomUUID();
    const assistantMessageId = randomUUID();

    yield {
        type: 'run.started',
        runId,
        sessionId,
        messageId: assistantMessageId
    };

    sessionStore.append(sessionId, { role: 'user', content: message });
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...sessionStore.getMessages(sessionId)
    ];

    let answer = '';
    let finishReason = 'stop';

    try {
        for await (const event of glmClient.streamCompletion({ messages, signal })) {
            if (event.type === 'text.delta') {
                answer += event.delta;
                yield {
                    type: 'assistant.delta',
                    runId,
                    messageId: assistantMessageId,
                    delta: event.delta
                };
            } else if (event.type === 'finish') {
                finishReason = event.finishReason || finishReason;
            }
        }

        if (answer) sessionStore.append(sessionId, { role: 'assistant', content: answer });

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

module.exports = { streamChat };
