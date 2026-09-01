const { randomUUID } = require('crypto');

function createSseWriter(res) {
    let sequence = 0;

    return {
        write(event) {
            if (res.writableEnded || res.destroyed) return;
            sequence += 1;
            const data = {
                ...event,
                sequence,
                timestamp: new Date().toISOString()
            };
            res.write(`id: ${event.runId || randomUUID()}:${sequence}\n`);
            res.write(`event: ${event.type}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        },

        ping() {
            if (!res.writableEnded && !res.destroyed) res.write(': ping\n\n');
        }
    };
}

module.exports = { createSseWriter };
